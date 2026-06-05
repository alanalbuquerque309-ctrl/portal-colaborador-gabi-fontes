/**
 * Gera ícones PWA e logo do portal a partir da logo Gabi Fontes.
 * A arte vem dourada sobre PRETO; aqui o preto é removido (vira transparente)
 * e a logo dourada é composta sobre fundo BRANCO.
 *
 * Uso: node scripts/gerar-icones-pwa.mjs "<caminho-da-logo.png>"
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import sharp from 'sharp';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(__dirname, '..');
const publicDir = path.join(root, 'public');

const src = process.argv[2];
if (!src || !fs.existsSync(src)) {
  console.error('Informe o caminho da logo PNG. Arquivo não encontrado:', src);
  process.exit(1);
}

const WHITE = { r: 255, g: 255, b: 255, alpha: 1 };
const TRANSP = { r: 255, g: 255, b: 255, alpha: 0 };

// Limiares de luminância para separar o fundo preto da logo dourada.
const T0 = 24; // abaixo disso = fundo (transparente)
const T1 = 80; // acima disso = logo (opaco)

let logoTransparentPromise = null;

/** Remove o preto da arte e devolve buffer PNG (logo dourada, fundo transparente, já trimado). */
async function logoTransparent() {
  if (logoTransparentPromise) return logoTransparentPromise;
  logoTransparentPromise = (async () => {
    const { data, info } = await sharp(fs.readFileSync(src))
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const { width, height, channels } = info;
    const out = Buffer.alloc(width * height * 4);
    for (let i = 0, j = 0; i < data.length; i += channels, j += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = 0.299 * r + 0.587 * g + 0.114 * b;
      let a;
      if (lum <= T0) a = 0;
      else if (lum >= T1) a = 255;
      else a = Math.round(((lum - T0) / (T1 - T0)) * 255);
      out[j] = r;
      out[j + 1] = g;
      out[j + 2] = b;
      out[j + 3] = a;
    }

    return sharp(out, { raw: { width, height, channels: 4 } })
      .trim()
      .png()
      .toBuffer();
  })();
  return logoTransparentPromise;
}

/** Ícone quadrado: fundo branco + logo dourada centrada com margem. */
async function makeSquare(size, paddingRatio, outPath, bg = WHITE) {
  const inner = Math.round(size * (1 - paddingRatio * 2));
  const logo = await logoTransparent();
  const resized = await sharp(logo)
    .resize({ width: inner, height: inner, fit: 'contain', background: TRANSP })
    .toBuffer();
  await sharp({ create: { width: size, height: size, channels: 4, background: bg } })
    .composite([{ input: resized, gravity: 'center' }])
    .png()
    .toFile(outPath);
  console.log('ok', path.relative(root, outPath));
}

/** Logo grande para login/splash: logo dourada com fundo transparente (serve em branco/creme). */
async function makeLogoAsset(width, height, outPath) {
  const logo = await logoTransparent();
  await sharp(logo)
    .resize({ width, height, fit: 'contain', background: TRANSP })
    .png()
    .toFile(outPath);
  console.log('ok', path.relative(root, outPath));
}

async function main() {
  // Logo (dourada, fundo transparente) para login e splash in-app
  await makeLogoAsset(1200, 900, path.join(publicDir, 'logo-gabi-fontes.png'));

  // Ícones PWA "any" (fundo branco, margem pequena)
  await makeSquare(192, 0.1, path.join(publicDir, 'icon-192.png'));
  await makeSquare(512, 0.1, path.join(publicDir, 'icon-512.png'));

  // Ícone maskable (margem maior p/ recorte circular do Android)
  await makeSquare(512, 0.2, path.join(publicDir, 'icon-maskable-512.png'));

  // Apple touch icon (cantos arredondados pelo iOS)
  await makeSquare(180, 0.1, path.join(publicDir, 'apple-touch-icon.png'));

  await sharp(path.join(publicDir, 'icon-192.png')).resize(32, 32).png().toFile(path.join(publicDir, 'favicon.png'));
  console.log('ok', 'public/favicon.png');
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
