import { readFileSync, writeFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const LACE_TERMS = [
  "lace", "crochet", "needlepoint lace", "bobbin lace", "needle lace",
  "tatting", "lacework", "punto in aria", "reticella", "torchon",
  "chantilly", "valenciennes", "bruges", "irish crochet",
];

const data = JSON.parse(readFileSync(path.join(__dirname, 'textiles.json'), 'utf8'));

const ids = [];
for (const obj of data) {
  const fields = [obj['Classification'] || '', obj['Medium'] || '']
    .map((f) => f.toLowerCase());
  if (LACE_TERMS.some((term) => fields.some((f) => f.includes(term)))) {
    ids.push(Number(obj['Object ID']));
  }
}

writeFileSync(
  path.join(__dirname, 'public', 'lace-ids.json'),
  JSON.stringify(ids),
  'utf8'
);

console.log(`${ids.length} lace object IDs written to public/lace-ids.json`);
