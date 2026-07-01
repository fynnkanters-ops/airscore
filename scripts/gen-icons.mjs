// Generiert PNG-Icons aus public/icon.svg via sharp (bereits als Next-Dep vorhanden).
// Aufruf:  node scripts/gen-icons.mjs
import sharp from 'sharp';
import { mkdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'public', 'icon.svg');
const outDir = join(root, 'public', 'icons');

const sizes = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'icon-180.png', size: 180 }, // apple-touch-icon
  { name: 'icon-maskable-512.png', size: 512, pad: 0.1 },
];

await mkdir(outDir, { recursive: true });

for (const { name, size, pad } of sizes) {
  let img = sharp(src).resize(size, size);
  if (pad) {
    const inner = Math.round(size * (1 - pad * 2));
    img = sharp(src)
      .resize(inner, inner)
      .extend({
        top: Math.round((size - inner) / 2),
        bottom: Math.round((size - inner) / 2),
        left: Math.round((size - inner) / 2),
        right: Math.round((size - inner) / 2),
        background: { r: 3, g: 105, b: 161, alpha: 1 },
      });
  }
  await img.png().toFile(join(outDir, name));
  console.log('✓', name);
}
console.log('Icons erzeugt in public/icons/');
