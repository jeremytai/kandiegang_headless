/**
 * Build-time image optimization: convert JPG/PNG to WebP and generate
 * responsive widths. Runs after `vite build`; reads from dist/images/,
 * outputs .webp (full + 400w, 800w, 1200w), then removes originals.
 */

import sharp from 'sharp';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(__dirname, '..');
const distImages = path.join(root, 'dist', 'images');

const EXTENSIONS = new Set(['.jpg', '.jpeg', '.png']);
const WIDTHS = [400, 800, 1200];
const MAX_WIDTH = 1920;
const WEBP_QUALITY = 80;

async function getAllImageFiles(dir, files = []) {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      await getAllImageFiles(full, files);
    } else if (EXTENSIONS.has(path.extname(entry.name).toLowerCase())) {
      files.push(full);
    }
  }
  return files;
}

async function optimizeImages() {
  let distExists;
  try {
    await fs.access(distImages);
    distExists = true;
  } catch {
    distExists = false;
  }
  if (!distExists) {
    console.warn('scripts/optimize-images.js: dist/images not found (run after vite build). Skipping.');
    return;
  }

  const imageFiles = await getAllImageFiles(distImages);
  if (imageFiles.length === 0) {
    console.log('scripts/optimize-images.js: no JPG/PNG files in dist/images.');
    return;
  }

  for (const filePath of imageFiles) {
    const ext = path.extname(filePath);
    const basePath = filePath.slice(0, -ext.length);
    const baseName = path.basename(basePath);

    try {
      const pipeline = sharp(filePath);
      const meta = await pipeline.metadata();
      const width = meta.width ?? 0;

      // Full-size WebP (capped at MAX_WIDTH)
      const fullWidth = Math.min(width, MAX_WIDTH);
      await sharp(filePath)
        .resize(fullWidth, null, { withoutEnlargement: true })
        .webp({ quality: WEBP_QUALITY })
        .toFile(basePath + '.webp');

      // Responsive widths (withoutEnlargement so small images stay same size)
      for (const w of WIDTHS) {
        await sharp(filePath)
          .resize(w, null, { withoutEnlargement: true })
          .webp({ quality: WEBP_QUALITY })
          .toFile(`${basePath}-${w}w.webp`);
      }

      await fs.unlink(filePath);
      console.log('Optimized:', path.relative(distImages, filePath), '-> .webp + widths');
    } catch (err) {
      console.error('Error processing', filePath, err);
    }
  }
}

optimizeImages();
