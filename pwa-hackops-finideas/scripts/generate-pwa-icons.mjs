/**
 * Generates placeholder PWA icons so the app is installable.
 * Run: node scripts/generate-pwa-icons.mjs
 * Replace these with real branding later.
 */
import sharp from "sharp";
import { mkdir, writeFile } from "fs/promises";
import { dirname, join } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const outDir = join(root, "public", "icons");

const SIZES = [72, 96, 128, 144, 152, 192, 384, 512];
const BG = "#0f172a"; // theme color

await mkdir(outDir, { recursive: true });

for (const size of SIZES) {
  const buffer = await sharp({
    create: {
      width: size,
      height: size,
      channels: 3,
      background: BG,
    },
  })
    .png()
    .toBuffer();

  const path = join(outDir, `icon-${size}x${size}.png`);
  await writeFile(path, buffer);
  console.log(`Wrote ${path}`);
}

console.log("Done. PWA icons are in public/icons/");
