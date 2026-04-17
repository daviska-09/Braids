import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Specific Irish lace style names — match in any field
const IRISH_LACE_TERMS = [
  "irish lace", "irish crochet", "carrickmacross", "limerick lace",
  "kenmare lace", "youghal lace", "clones lace", "inishmacsaint",
];

// Generic lace terms — only count if culture/country is also Irish
const LACE_TERMS = [
  "lace", "crochet", "tatting", "lacework", "needle lace", "bobbin lace",
];

const IRISH_CULTURE_TERMS = ["ireland", "irish"];

const data = JSON.parse(readFileSync(path.join(__dirname, 'textiles.json'), 'utf8'));

const ids = [];
for (const obj of data) {
  const allFields = [
    obj['Title'] || '',
    obj['Medium'] || '',
    obj['Classification'] || '',
    obj['Culture'] || '',
    obj['Period'] || '',
  ].map(f => f.toLowerCase());

  const cultureFields = [obj['Culture'] || ''].map(f => f.toLowerCase());

  // Match if any field contains a specific Irish lace term
  const hasIrishLaceTerm = IRISH_LACE_TERMS.some(term =>
    allFields.some(f => f.includes(term))
  );

  // OR: is Irish in culture AND contains a generic lace term
  const isIrish = IRISH_CULTURE_TERMS.some(term =>
    cultureFields.some(f => f.includes(term))
  );
  const hasLaceTerm = LACE_TERMS.some(term =>
    allFields.some(f => f.includes(term))
  );

  if (hasIrishLaceTerm || (isIrish && hasLaceTerm)) {
    ids.push(Number(obj['Object ID']));
  }
}

writeFileSync(
  path.join(__dirname, 'public', 'irish-lace-ids.json'),
  JSON.stringify(ids),
  'utf8'
);

console.log(`${ids.length} Irish lace Met IDs → public/irish-lace-ids.json`);
