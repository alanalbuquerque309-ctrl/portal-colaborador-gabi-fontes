/**
 * Gera ícones PWA a partir da logo com padding para evitar recortes.
 * A logo é centralizada e reduzida (~72%) para caber em ícones circulares e maskable.
 * Executar: node scripts/gerar-icone-pwa.mjs
 */
import sharp from 'sharp';
import { existsSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __dirname = dirname(fileURLToPath(import.meta.url));

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
const ICON_SIZE = 512;
const LOGO_SCALE = 0.75; // 75% — logo inteira sem recorte
const BG_COLOR = '#1a1a1a'; // preto — integra com a borda preta da logo

async function main() {
  const image = sharp(logoPath);
  const meta = await image.metadata();
  const logoW = meta.width || 512;
  const logoH = meta.height || 512;

  // Tamanho da logo dentro do ícone (com padding)
  const logoSize = Math.round(ICON_SIZE * LOGO_SCALE);
  const offset = Math.round((ICON_SIZE - logoSize) / 2);

  // Redimensiona a logo mantendo proporção (cabe no quadrado logoSize x logoSize)
  const logoResized = await image
    .resize(logoSize, logoSize, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  // Fundo quadrado com cor cream
  const background = Buffer.from(`
    <svg width="${ICON_SIZE}" height="${ICON_SIZE}">
      <rect width="100%" height="100%" fill="${BG_COLOR}"/>
    </svg>
  `);

  // Compõe: fundo + logo centralizada
  const composed = await sharp(background)
    .composite([{
      input: logoResized,
      top: offset,
      left: offset,
    }])
    .png()
    .toBuffer();

  // Gera ícones 192 e 512
  await sharp(composed)
    .resize(192, 192)
    .png()
    .toFile(join(publicDir, 'icon-192.png'));
  console.log('Gerado: public/icon-192.png');

  await sharp(composed)
    .resize(512, 512)
    .png()
    .toFile(join(publicDir, 'icon-512.png'));
  console.log('Gerado: public/icon-512.png');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
