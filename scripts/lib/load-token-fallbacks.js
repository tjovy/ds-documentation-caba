import fs from 'node:fs';
import path from 'node:path';

export function loadTokenFallbacks(rootDir) {
  const fallbackPath = path.join(rootDir, 'tokens.component-fallback.json');
  if (!fs.existsSync(fallbackPath)) return {};

  return JSON.parse(fs.readFileSync(fallbackPath, 'utf8'));
}
