#!/usr/bin/env node
// ─── Met Museum Open Access CSV → textile ID pool ────────────────────────────
// Usage: npx tsx scripts/seedMetIds.ts [path/to/MetObjects.csv]
//
// Downloads MetObjects.csv from the Met Open Access programme if not already
// present, filters for textile-relevant objects, and writes two output files:
//
//   src/data/metTextileIds.json   — all textile objects (used by Gallery tab)
//   public/textile-ids.json       — same file, served as a static asset
//
// The CSV is available at:
//   https://github.com/metmuseum/openaccess  (MetObjects.csv, ~250 MB)
//
// Run once whenever the Met adds significant new textile acquisitions.

import { createReadStream, writeFileSync, existsSync } from "node:fs";
import { createInterface } from "node:readline";
import { resolve, join } from "node:path";

const ROOT = resolve(import.meta.dirname, "..");
const DEFAULT_CSV_PATH = join(ROOT, "data", "MetObjects.csv");
const OUT_SRC = join(ROOT, "src", "data", "metTextileIds.json");
const OUT_PUBLIC = join(ROOT, "public", "textile-ids.json");

// ─── Filter criteria ──────────────────────────────────────────────────────────

const TEXTILE_DEPARTMENTS = [
  "textile",
  "textiles",
  "the textile museum",
  "costume institute",
  "costume",
];

const TEXTILE_MEDIUMS = [
  "silk",
  "linen",
  "wool",
  "lace",
  "cotton",
  "embroidery",
  "tapestry",
  "weaving",
  "woven",
  "brocade",
  "velvet",
  "damask",
  "crochet",
  "knitted",
  "needlework",
  "satin",
  "taffeta",
  "gauze",
];

function isTextileRelevant(department: string, medium: string): boolean {
  const dept = department.toLowerCase();
  const med = medium.toLowerCase();
  if (TEXTILE_DEPARTMENTS.some((d) => dept.includes(d))) return true;
  if (TEXTILE_MEDIUMS.some((m) => med.includes(m))) return true;
  return false;
}

// ─── CSV parsing ──────────────────────────────────────────────────────────────
// The Met CSV uses comma-separated values with quoted fields. We parse column
// headers from the first row and extract "Object ID", "Department", "Medium".

function parseCSVRow(line: string): string[] {
  const fields: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      fields.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  fields.push(current);
  return fields;
}

async function main(): Promise<void> {
  const csvPath = process.argv[2] ?? DEFAULT_CSV_PATH;

  if (!existsSync(csvPath)) {
    console.error(`CSV not found at: ${csvPath}`);
    console.error("Download from: https://github.com/metmuseum/openaccess");
    console.error("Then re-run: npx tsx scripts/seedMetIds.ts [path/to/MetObjects.csv]");
    process.exit(1);
  }

  console.log(`Reading CSV: ${csvPath}`);

  const rl = createInterface({
    input: createReadStream(csvPath, { encoding: "utf-8" }),
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  let objectIdCol = -1;
  let departmentCol = -1;
  let mediumCol = -1;
  let hasImageCol = -1;

  const ids: number[] = [];
  let lineCount = 0;

  for await (const line of rl) {
    lineCount++;

    if (lineCount === 1) {
      headers = parseCSVRow(line);
      objectIdCol = headers.indexOf("Object ID");
      departmentCol = headers.indexOf("Department");
      mediumCol = headers.indexOf("Medium");
      hasImageCol = headers.indexOf("Is Public Domain");
      if (objectIdCol === -1) {
        console.error("Could not find 'Object ID' column. CSV format may have changed.");
        process.exit(1);
      }
      continue;
    }

    const fields = parseCSVRow(line);
    const objectId = parseInt(fields[objectIdCol] ?? "", 10);
    if (isNaN(objectId)) continue;

    const department = fields[departmentCol] ?? "";
    const medium = fields[mediumCol] ?? "";

    // Only include public domain objects (likely to have accessible images)
    if (hasImageCol !== -1) {
      const isPublicDomain = (fields[hasImageCol] ?? "").trim().toLowerCase();
      if (isPublicDomain !== "true") continue;
    }

    if (isTextileRelevant(department, medium)) {
      ids.push(objectId);
    }

    if (lineCount % 10000 === 0) {
      process.stdout.write(`\r  Processed ${lineCount.toLocaleString()} rows, found ${ids.length.toLocaleString()} textile IDs...`);
    }
  }

  console.log(`\n  Done. ${ids.length.toLocaleString()} textile objects from ${(lineCount - 1).toLocaleString()} total records.`);

  const json = JSON.stringify(ids, null, 2);
  writeFileSync(OUT_SRC, json, "utf-8");
  writeFileSync(OUT_PUBLIC, json, "utf-8");

  console.log(`  Written to: ${OUT_SRC}`);
  console.log(`  Written to: ${OUT_PUBLIC}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
