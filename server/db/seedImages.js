'use strict';
// Generates clean vector frame illustrations for the sample catalogue so the shop looks
// complete on first run, with no external image downloads. Replace them from Admin > Frames.
const fs = require('fs');
const path = require('path');

function shade(hex, amt) {
  const n = parseInt(hex.slice(1), 16);
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const r = clamp((n >> 16) + amt);
  const g = clamp(((n >> 8) & 255) + amt);
  const b = clamp((n & 255) + amt);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

const BORDER = { thin: 16, classic: 30, wide: 46, ornate: 38 };

function frameSvg({ color, mat, style, variant }) {
  const W = 600;
  const H = 750;
  const b = BORDER[style] || 30;
  const wall = variant === 2;
  const x = wall ? 90 : 36;
  const y = wall ? 110 : 36;
  const fw = W - x * 2;
  const fh = H - y * 2 - (wall ? 60 : 0);
  const matW = style === 'wide' ? 54 : 40;
  const light = shade(color, 38);
  const dark = shade(color, -42);
  const ix = x + b + matW;
  const iy = y + b + matW;
  const iw = fw - (b + matW) * 2;
  const ih = fh - (b + matW) * 2;

  const ornate = style === 'ornate'
    ? `<rect x="${x + 8}" y="${y + 8}" width="${fw - 16}" height="${fh - 16}" fill="none" stroke="${light}" stroke-width="2.5" opacity="0.9"/>
       <rect x="${x + b - 8}" y="${y + b - 8}" width="${fw - (b - 8) * 2}" height="${fh - (b - 8) * 2}" fill="none" stroke="${dark}" stroke-width="2"/>
       ${[[x + 4, y + 4], [x + fw - 24, y + 4], [x + 4, y + fh - 24], [x + fw - 24, y + fh - 24]]
         .map(([cx, cy]) => `<circle cx="${cx + 10}" cy="${cy + 10}" r="9" fill="${light}" stroke="${dark}" stroke-width="1.5"/>`).join('')}`
    : '';

  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" width="${W}" height="${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${wall ? '#EFE7DA' : '#F3EDE3'}"/><stop offset="1" stop-color="${wall ? '#E4D8C4' : '#EAE0CF'}"/></linearGradient>
    <linearGradient id="fr" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${light}"/><stop offset="0.5" stop-color="${color}"/><stop offset="1" stop-color="${dark}"/></linearGradient>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#F6D8A8"/><stop offset="0.6" stop-color="#F2B98A"/><stop offset="1" stop-color="#E59A7B"/></linearGradient>
    <clipPath id="photo"><rect x="${ix}" y="${iy}" width="${iw}" height="${ih}"/></clipPath>
    <filter id="sh" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="14" stdDeviation="14" flood-color="#1F1D1B" flood-opacity="0.28"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  ${wall ? `<rect y="${H - 120}" width="${W}" height="120" fill="#D9C9AB" opacity="0.55"/>` : ''}
  <g filter="url(#sh)">
    <rect x="${x}" y="${y}" width="${fw}" height="${fh}" fill="url(#fr)"/>
    <path d="M${x} ${y} L${x + b} ${y + b} L${x + fw - b} ${y + b} L${x + fw} ${y} Z" fill="${light}" opacity="0.55"/>
    <path d="M${x} ${y + fh} L${x + b} ${y + fh - b} L${x + fw - b} ${y + fh - b} L${x + fw} ${y + fh} Z" fill="${dark}" opacity="0.5"/>
    ${ornate}
    <rect x="${x + b}" y="${y + b}" width="${fw - b * 2}" height="${fh - b * 2}" fill="${mat}"/>
    <rect x="${x + b}" y="${y + b}" width="${fw - b * 2}" height="${fh - b * 2}" fill="none" stroke="#00000022" stroke-width="2"/>
  </g>
  <g clip-path="url(#photo)">
    <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="url(#sky)"/>
    <circle cx="${ix + iw * 0.68}" cy="${iy + ih * 0.38}" r="${iw * 0.11}" fill="#FFF3D6" opacity="0.95"/>
    <path d="M${ix} ${iy + ih * 0.66} Q${ix + iw * 0.25} ${iy + ih * 0.5} ${ix + iw * 0.5} ${iy + ih * 0.64} T${ix + iw} ${iy + ih * 0.58} V${iy + ih} H${ix} Z" fill="#B8765F"/>
    <path d="M${ix} ${iy + ih * 0.78} Q${ix + iw * 0.3} ${iy + ih * 0.64} ${ix + iw * 0.6} ${iy + ih * 0.78} T${ix + iw} ${iy + ih * 0.72} V${iy + ih} H${ix} Z" fill="#7C4A3F"/>
    <path d="M${ix} ${iy + ih * 0.9} Q${ix + iw * 0.4} ${iy + ih * 0.8} ${ix + iw} ${iy + ih * 0.9} V${iy + ih} H${ix} Z" fill="#4A2E2B"/>
  </g>
  <rect x="${ix}" y="${iy}" width="${iw}" height="${ih}" fill="none" stroke="#00000030" stroke-width="2"/>
</svg>`;
}

function writeFrameImages(dir, slug, spec) {
  fs.mkdirSync(dir, { recursive: true });
  const out = [];
  for (const variant of [1, 2]) {
    const file = `seed-${slug}-${variant}.svg`;
    fs.writeFileSync(path.join(dir, file), frameSvg({ ...spec, variant }));
    out.push(`/uploads/frames/${file}`);
  }
  return out;
}

module.exports = { writeFrameImages };
