#!/usr/bin/env node
/**
 * Ensures fonts required by GET /api/event-share exist before production build.
 * Paths must stay in sync with api/event-share.tsx and public/fonts/fonts.css.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const required = [
  'public/fonts/ivy-ora/IvyOraDispLight.ttf',
  'public/fonts/gt-planar/GTPlanarRegular.ttf',
];

let failed = false;
for (const rel of required) {
  const abs = path.join(root, rel);
  if (!fs.existsSync(abs)) {
    console.error(`[verify-share-fonts] Missing: ${rel}`);
    failed = true;
  }
}
if (failed) {
  console.error(
    '[verify-share-fonts] Add the TTF files and commit them so /api/event-share can load brand fonts on Vercel.'
  );
  process.exit(1);
}
