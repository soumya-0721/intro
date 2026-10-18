/**
 * Converts the official Next360 logo (white background, dark charcoal +
 * botanical green artwork) into a transparent, dark-theme variant:
 *   - white background -> fully transparent (per-pixel unmixing)
 *   - dark charcoal artwork -> soft silver-white (#eef2ee)
 *   - botanical green -> site accent green (#7a9469)
 * Output is cropped to the content bounding box (square).
 *
 * Usage: node tools/make-dark-logo.js
 */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");

const SRC = path.join(__dirname, "..", "assets", "images", "next360-logo.png");
const OUT = path.join(__dirname, "..", "assets", "images", "next360-logo-dark.png");
const PAD = 8;

/* ---------- PNG decode (8-bit RGB/RGBA, all filters) ---------- */
function decodePng(file) {
  const buf = fs.readFileSync(file);
  let pos = 8, width = 0, height = 0, colorType = 0;
  const idat = [];
  while (pos < buf.length) {
    const len = buf.readUInt32BE(pos);
    const type = buf.toString("ascii", pos + 4, pos + 8);
    const data = buf.subarray(pos + 8, pos + 8 + len);
    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      if (data[8] !== 8) throw new Error("unsupported bit depth");
      colorType = data[9];
      if (colorType !== 2 && colorType !== 6) throw new Error("unsupported color type");
    } else if (type === "IDAT") idat.push(data);
    else if (type === "IEND") break;
    pos += 12 + len;
  }
  const raw = zlib.inflateSync(Buffer.concat(idat));
  const bpp = colorType === 6 ? 4 : 3;
  const stride = width * bpp;
  const px = Buffer.alloc(width * height * 4);
  const prev = Buffer.alloc(stride);
  const cur = Buffer.alloc(stride);
  let ip = 0;
  for (let y = 0; y < height; y++) {
    const filter = raw[ip++];
    const line = raw.subarray(ip, ip + stride);
    ip += stride;
    cur.fill(0);
    for (let i = 0; i < stride; i++) {
      const a = i >= bpp ? cur[i - bpp] : 0;
      const b = prev[i];
      const c = i >= bpp ? prev[i - bpp] : 0;
      let v = line[i];
      switch (filter) {
        case 0: break;
        case 1: v = (v + a) & 255; break;
        case 2: v = (v + b) & 255; break;
        case 3: v = (v + ((a + b) >> 1)) & 255; break;
        case 4: {
          const p = a + b - c, pa = Math.abs(p - a), pb = Math.abs(p - b), pc = Math.abs(p - c);
          v = (v + (pa <= pb && pa <= pc ? a : pb <= pc ? b : c)) & 255;
          break;
        }
        default: v = (v + a) & 255;
      }
      cur[i] = v;
    }
    for (let x = 0; x < width; x++) {
      const s = x * bpp, d = (y * width + x) * 4;
      px[d] = cur[s];
      px[d + 1] = cur[s + 1];
      px[d + 2] = cur[s + 2];
      px[d + 3] = bpp === 4 ? cur[s + 3] : 255;
    }
    prev.set(cur);
  }
  return { width, height, px };
}

/* ---------- PNG encode (RGBA, filter 0) ---------- */
const crcTable = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();
function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
  const out = Buffer.alloc(12 + data.length);
  out.writeUInt32BE(data.length, 0);
  out.write(type, 4, "ascii");
  data.copy(out, 8);
  out.writeUInt32BE(crc32(out.subarray(4, 8 + data.length)), 8 + data.length);
  return out;
}
function encodePng(width, height, rgba) {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; ihdr[9] = 6; // 8-bit RGBA
  const stride = width * 4;
  const raw = Buffer.alloc(height * (stride + 1));
  for (let y = 0; y < height; y++) {
    raw[y * (stride + 1)] = 0;
    rgba.copy(raw, y * (stride + 1) + 1, y * stride, (y + 1) * stride);
  }
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

/* ---------- Convert ---------- */
const { width, height, px } = decodePng(SRC);

// Content bounding box (non-white)
const isWhite = (r, g, b) => r > 235 && g > 235 && b > 235;
let minX = width, minY = height, maxX = -1, maxY = -1;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const i = (y * width + x) * 4;
    if (!isWhite(px[i], px[i + 1], px[i + 2])) {
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
}
minX = Math.max(0, minX - PAD); minY = Math.max(0, minY - PAD);
maxX = Math.min(width - 1, maxX + PAD); maxY = Math.min(height - 1, maxY + PAD);
const cw = maxX - minX + 1, ch = maxY - minY + 1;

// Sample core colors (solid interiors only, to avoid antialias contamination)
const GREEN_TGT = [0x7a, 0x94, 0x69]; // site --green-300
const DARK_TGT = [0xee, 0xf2, 0xee];  // silver-white
let gSum = [0, 0, 0], gN = 0, dSum = [0, 0, 0], dN = 0;
for (let y = minY; y <= maxY; y++) {
  for (let x = minX; x <= maxX; x++) {
    const i = (y * width + x) * 4;
    const r = px[i], g = px[i + 1], b = px[i + 2];
    if (isWhite(r, g, b)) continue;
    if (g > r + 30 && g > b + 30 && r < 160) { gSum[0] += r; gSum[1] += g; gSum[2] += b; gN++; }
    else if (r < 70 && g < 80 && b < 95) { dSum[0] += r; dSum[1] += g; dSum[2] += b; dN++; }
  }
}
if (!gN || !dN) throw new Error(`could not sample cores (green ${gN}, dark ${dN})`);
const gCore = gSum.map((v) => v / gN);
const dCore = dSum.map((v) => v / dN);
console.log("green core", gCore.map(Math.round), "dark core", dCore.map(Math.round));

// Unmix every cropped pixel against white using the two cores
const W = [252, 252, 252];
function unmix(r, g, b, core, target) {
  const dr = W[0] - core[0], dg = W[1] - core[1], db = W[2] - core[2];
  const denom = dr * dr + dg * dg + db * db;
  let t = ((W[0] - r) * dr + (W[1] - g) * dg + (W[2] - b) * db) / denom;
  t = Math.max(0, Math.min(1, t));
  const pr = W[0] + (core[0] - W[0]) * t;
  const pg = W[1] + (core[1] - W[1]) * t;
  const pb = W[2] + (core[2] - W[2]) * t;
  const resid = Math.abs(pr - r) + Math.abs(pg - g) + Math.abs(pb - b);
  return { t, resid, target };
}

const out = Buffer.alloc(cw * ch * 4);
let stats = { transparent: 0, solid: 0, partial: 0 };
for (let y = 0; y < ch; y++) {
  for (let x = 0; x < cw; x++) {
    const si = ((y + minY) * width + (x + minX)) * 4;
    const r = px[si], g = px[si + 1], b = px[si + 2], srcA = px[si + 3];
    const di = (y * cw + x) * 4;
    if (srcA === 0 || isWhite(r, g, b)) { stats.transparent++; continue; } // stays 0,0,0,0

    const green = unmix(r, g, b, gCore, GREEN_TGT);
    const dark = unmix(r, g, b, dCore, DARK_TGT);
    const best = green.resid <= dark.resid ? green : dark;

    // near-white leftover after unmix -> treat as background
    if (best.t < 0.04) { stats.transparent++; continue; }

    // slight edge crisping
    const alpha = Math.min(1, Math.pow(best.t, 0.92));
    out[di] = best.target[0];
    out[di + 1] = best.target[1];
    out[di + 2] = best.target[2];
    out[di + 3] = Math.round(alpha * 255);
    if (alpha > 0.95) stats.solid++; else stats.partial++;
  }
}

fs.writeFileSync(OUT, encodePng(cw, ch, out));
console.log(`wrote ${path.relative(process.cwd(), OUT)} ${cw}x${ch}`);
console.log(`pixels: solid ${stats.solid}, soft edges ${stats.partial}, transparent ${stats.transparent}`);
