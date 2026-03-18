/**
 * Gera ícones PWA a partir da logo: remove fundo preto e mantém apenas o círculo.
 * Executar: node scripts/gerar-icone-pwa.mjs
 */
import sharp from 'sharp';
import { readFileSync, existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Logo original (caminho do asset ou public)
const LOGO_PATHS = [
  join(__dirname, '../public/logo-original.png'),
  join(process.env.USERPROFILE || '', '.cursor/projects/c-Users-EU-Desktop-ALAN-ISA-AI-ALAN-IA-core-system/assets/c__Users_EU_AppData_Roaming_Cursor_User_workspaceStorage_4fa5b6b80cdff777c6095da84cc0dc37_images_logo_para_sistema-ea08f1db-ed99-41db-a07a-8e4418f5474e.png'),
];

let logoPath = LOGO_PATHS.find((p) => existsSync(p));
if (!logoPath) {
  console.error('Logo não encontrada. Coloque logo-original.png em public/');
  process.exit(1);
}

const publicDir = join(__dirname, '../public');

async function main() {
  const image = sharp(logoPath);
  const meta = await image.metadata();
  const size = Math.min(meta.width || 512, meta.height || 512);
  const half = size / 2;

  // Máscara circular: SVG que define um círculo, fora dele = transparente
  const circleMask = Buffer.from(`
    <svg width="${size}" height="${size}">
      <circle cx="${half}" cy="${half}" r="${half}" fill="white"/>
    </svg>
  `);

  const circular = await image
    .resize(size, size)
    .png()
    .composite([{
      input: circleMask,
      blend: 'dest-in', // mantém apenas onde a máscara é branca
    }])
    .toBuffer();

  // Gera ícones 192 e 512
  await sharp(circular)
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, 'icon-192.png'));
  console.log('Gerado: public/icon-192.png');

  await sharp(circular)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'icon-512.png'));
  console.log('Gerado: public/icon-512.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
