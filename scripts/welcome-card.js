// welcome-card.js
const fs = require('fs');
const path = require('path');
const Jimp = require('jimp');

function hexToRgba(hex, alpha = 255) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) || 0;
  const g = parseInt(h.substring(2, 4), 16) || 0;
  const b = parseInt(h.substring(4, 6), 16) || 0;
  return (r << 24) | (g << 16) | (b << 8) | (alpha & 0xff);
}

async function makeCircle(img, size) {
  const cx = size / 2;
  const cy = size / 2;
  const r = size / 2;
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
      if (dist > r) img.setPixelColor(0x00000000, x, y);
    }
  }
  return img;
}

async function generateWelcomeCard({ bgPath, avatarUrl, username, title, memberCount, color = '#5865f2' }) {
  const W = 1024;
  const H = 300;

  // 1. Fondo
  let card;
  try {
    if (bgPath) card = await Jimp.read(bgPath);
    else card = await Jimp.read('https://dummyimage.com/1024x300/1e1e2e/ffffff.png&text=+');
  } catch (e) {
    card = new Jimp(W, H, 0x1e1e2eff);
  }
  card.cover(W, H); // asegura que llene el espacio

  // Overlay oscuro
  const overlay = new Jimp(W, H, 0x000000aa);
  card.composite(overlay, 0, 0);

  // Barra izquierda
  const accentColor = hexToRgba(color, 255);
  const leftBar = new Jimp(10, H, accentColor);
  card.composite(leftBar, 0, 0);

  // 2. Avatar
  const AVATAR_SIZE = 200;
  const AVATAR_X = 50;
  const AVATAR_Y = (H - AVATAR_SIZE) / 2;

  // Borde circular
  const borderSize = AVATAR_SIZE + 12;
  const borderX = AVATAR_X - 6;
  const borderY = AVATAR_Y - 6;
  const avatarBorder = new Jimp(borderSize, borderSize, accentColor);
  await makeCircle(avatarBorder, borderSize);
  card.composite(avatarBorder, borderX, borderY);

  // Avatar imagen
  let avatarImg;
  try {
    avatarImg = await Jimp.read(avatarUrl);
    avatarImg.resize(AVATAR_SIZE, AVATAR_SIZE);
  } catch(e) {
    avatarImg = new Jimp(AVATAR_SIZE, AVATAR_SIZE, hexToRgba(color, 200));
  }
  await makeCircle(avatarImg, AVATAR_SIZE);
  card.composite(avatarImg, AVATAR_X, AVATAR_Y);

  // 3. Textos
  const textX = AVATAR_X + AVATAR_SIZE + 40;
  
  try {
      const font64 = await Jimp.loadFont(Jimp.FONT_SANS_64_WHITE);
      const font32 = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
      
      // Username
      card.print(font64, textX, 60, username);
      
      // Title (Bienvenido...)
      card.print(font32, textX, 140, title.length > 35 ? "¡Bienvenido!" : title);
      
      // Miembro #
      card.print(font32, textX, 190, `Miembro #${memberCount}`);
  } catch(e) {
      console.error("Error cargando fuentes de Jimp", e);
  }

  return card.getBufferAsync(Jimp.MIME_PNG);
}

module.exports = { generateWelcomeCard };
