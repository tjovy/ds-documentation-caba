import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeDesignTokens } from './lib/token-normalizer.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const inputPath = path.join(root, 'tokens.json');
const outputPath = path.join(root, 'build', 'tokens.normalized.json');

const rawTokens = JSON.parse(fs.readFileSync(inputPath, 'utf8'));
const { tokens, warnings } = normalizeDesignTokens(rawTokens, { returnWarnings: true });

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(tokens, null, 2)}\n`, 'utf8');

for (const warning of warnings) {
  console.warn(`Token normalization: ${warning}`);
}

console.log(`Generated ${path.relative(root, outputPath)}`);
