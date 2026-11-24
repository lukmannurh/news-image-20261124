// news-image-20261124 — "THE WORLD TODAY", Tuesday 24 November 2026.
// A newspaper front page drawn entirely in code: no network, no clock,
// no randomness. Two runs write byte-identical PNG bytes.
// Node 22+, standard library only.

import { deflateSync } from "node:zlib";
import { mkdirSync, writeFileSync } from "node:fs";

const W = 1024;
const H = 1024;

// ---------------------------------------------------------------------------
// 5x7 bitmap font, hand-drawn for this entry. Each glyph is 7 rows of 5 bits.
// '#' = ink, '.' = paper. Lowercase sits on rows 2..6 with descenders on 6.
// ---------------------------------------------------------------------------
type Glyph = string[];

const FONT: Record<string, Glyph> = {
  A: ["01110", "10001", "10001", "11111", "10001", "10001", "10001"],
  B: ["11110", "10001", "10001", "11110", "10001", "10001", "11110"],
  C: ["01110", "10001", "10000", "10000", "10000", "10001", "01110"],
  D: ["11110", "10001", "10001", "10001", "10001", "10001", "11110"],
  E: ["11111", "10000", "10000", "11110", "10000", "10000", "11111"],
  F: ["11111", "10000", "10000", "11110", "10000", "10000", "10000"],
  G: ["01110", "10001", "10000", "10111", "10001", "10001", "01111"],
  H: ["10001", "10001", "10001", "11111", "10001", "10001", "10001"],
  I: ["01110", "00100", "00100", "00100", "00100", "00100", "01110"],
  J: ["00111", "00010", "00010", "00010", "00010", "10010", "01100"],
  K: ["10001", "10010", "10100", "11000", "10100", "10010", "10001"],
  L: ["10000", "10000", "10000", "10000", "10000", "10000", "11111"],
  M: ["10001", "11011", "10101", "10101", "10001", "10001", "10001"],
  N: ["10001", "11001", "10101", "10011", "10001", "10001", "10001"],
  O: ["01110", "10001", "10001", "10001", "10001", "10001", "01110"],
  P: ["11110", "10001", "10001", "11110", "10000", "10000", "10000"],
  Q: ["01110", "10001", "10001", "10001", "10101", "10010", "01101"],
  R: ["11110", "10001", "10001", "11110", "10100", "10010", "10001"],
  S: ["01111", "10000", "10000", "01110", "00001", "00001", "11110"],
  T: ["11111", "00100", "00100", "00100", "00100", "00100", "00100"],
  U: ["10001", "10001", "10001", "10001", "10001", "10001", "01110"],
  V: ["10001", "10001", "10001", "10001", "10001", "01010", "00100"],
  W: ["10001", "10001", "10001", "10101", "10101", "10101", "01010"],
  X: ["10001", "10001", "01010", "00100", "01010", "10001", "10001"],
  Y: ["10001", "10001", "01010", "00100", "00100", "00100", "00100"],
  Z: ["11111", "00001", "00010", "00100", "01000", "10000", "11111"],
  a: ["00000", "00000", "01110", "00001", "01111", "10001", "01111"],
  b: ["10000", "10000", "11110", "10001", "10001", "10001", "11110"],
  c: ["00000", "00000", "01110", "10001", "10000", "10001", "01110"],
  d: ["00001", "00001", "01111", "10001", "10001", "10001", "01111"],
  e: ["00000", "00000", "01110", "10001", "11111", "10000", "01110"],
  f: ["00110", "01001", "01000", "11110", "01000", "01000", "01000"],
  g: ["00000", "01110", "10001", "10001", "01111", "01110", "00000"],
  h: ["10000", "10000", "11110", "10001", "10001", "10001", "10001"],
  i: ["00100", "00000", "01100", "00100", "00100", "00100", "01110"],
  j: ["00010", "00000", "00110", "00010", "00010", "00010", "01100"],
  k: ["10000", "10000", "10010", "10100", "11000", "10100", "10010"],
  l: ["01100", "00100", "00100", "00100", "00100", "00100", "01110"],
  m: ["00000", "00000", "11010", "10101", "10101", "10101", "10101"],
  n: ["00000", "00000", "11110", "10001", "10001", "10001", "10001"],
  o: ["00000", "00000", "01110", "10001", "10001", "10001", "01110"],
  p: ["00000", "00000", "11110", "10001", "11110", "10000", "10000"],
  q: ["00000", "00000", "01111", "10001", "01111", "00001", "00001"],
  r: ["00000", "00000", "10110", "11001", "10000", "10000", "10000"],
  s: ["00000", "00000", "01111", "10000", "01110", "00001", "11110"],
  t: ["00100", "00100", "11110", "00100", "00100", "00100", "00011"],
  u: ["00000", "00000", "10001", "10001", "10001", "10011", "01101"],
  v: ["00000", "00000", "10001", "10001", "10001", "01010", "00100"],
  w: ["00000", "00000", "10001", "10101", "10101", "10101", "01010"],
  x: ["00000", "00000", "10001", "01010", "00100", "01010", "10001"],
  y: ["00000", "00000", "10001", "10001", "01111", "00001", "01110"],
  z: ["00000", "00000", "11111", "00010", "00100", "01000", "11111"],
  "0": ["01110", "10001", "10011", "10101", "11001", "10001", "01110"],
  "1": ["00100", "01100", "00100", "00100", "00100", "00100", "01110"],
  "2": ["01110", "10001", "00001", "00110", "01000", "10000", "11111"],
  "3": ["11110", "00001", "00001", "01110", "00001", "00001", "11110"],
  "4": ["00010", "00110", "01010", "10010", "11111", "00010", "00010"],
  "5": ["11111", "10000", "11110", "00001", "00001", "10001", "01110"],
  "6": ["00110", "01000", "10000", "11110", "10001", "10001", "01110"],
  "7": ["11111", "00001", "00010", "00100", "01000", "01000", "01000"],
  "8": ["01110", "10001", "10001", "01110", "10001", "10001", "01110"],
  "9": ["01110", "10001", "10001", "01111", "00001", "00010", "01100"],
  " ": ["00000", "00000", "00000", "00000", "00000", "00000", "00000"],
  ".": ["00000", "00000", "00000", "00000", "00000", "01100", "01100"],
  ",": ["00000", "00000", "00000", "00000", "01100", "00100", "01000"],
  "'": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "-": ["00000", "00000", "00000", "01110", "00000", "00000", "00000"],
  "\u2014": ["00000", "00000", "00000", "11111", "00000", "00000", "00000"],
  ":": ["00000", "01100", "01100", "00000", "01100", "01100", "00000"],
  ";": ["00000", "01100", "01100", "00000", "01100", "00100", "01000"],
  "!": ["00100", "00100", "00100", "00100", "00100", "00000", "00100"],
  "?": ["01110", "10001", "00001", "00110", "00100", "00000", "00100"],
  "/": ["00001", "00010", "00010", "00100", "01000", "01000", "10000"],
  "(": ["00010", "00100", "01000", "01000", "01000", "00100", "00010"],
  ")": ["01000", "00100", "00010", "00010", "00010", "00100", "01000"],
  "&": ["01100", "10010", "10100", "01000", "10101", "10010", "01101"],
  "%": ["11001", "11010", "00010", "00100", "01000", "01011", "10011"],
  $: ["00100", "01111", "10100", "01110", "00101", "11110", "00100"],
  "+": ["00000", "00100", "00100", "11111", "00100", "00100", "00000"],
  "=": ["00000", "00000", "11111", "00000", "11111", "00000", "00000"],
  '"': ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "#": ["01010", "01010", "11111", "01010", "11111", "01010", "01010"],
  "@": ["01110", "10001", "10111", "10101", "10110", "10000", "01110"],
  "*": ["00000", "10101", "01110", "10101", "00000", "00000", "00000"],
  "\u2022": ["00000", "00000", "01100", "01100", "01100", "00000", "00000"],
  ">": ["10000", "01000", "00100", "00010", "00100", "01000", "10000"],
  "<": ["00001", "00010", "00100", "01000", "00100", "00010", "00001"],
  "\u2018": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "\u2019": ["00100", "00100", "01000", "00000", "00000", "00000", "00000"],
  "\u201c": ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "\u201d": ["01010", "01010", "00000", "00000", "00000", "00000", "00000"],
  "\u2191": ["00100", "01110", "10101", "00100", "00100", "00100", "00100"],
  "\u00b0": ["01100", "10010", "10010", "01100", "00000", "00000", "00000"],
};

// ---------------------------------------------------------------------------
// Canvas: a plain RGB buffer with rectangle, line and text drawing.
// ---------------------------------------------------------------------------
type RGB = [number, number, number];

const PAPER: RGB = [247, 243, 234];
const INK: RGB = [17, 17, 17];
const RED: RGB = [178, 34, 34];
const DARKRED: RGB = [139, 0, 0];
const GREEN: RGB = [27, 94, 32];
const BLUE: RGB = [18, 52, 86];
const GREY: RGB = [90, 86, 78];
const LIGHTGREY: RGB = [214, 208, 196];

const px = new Uint8Array(W * H * 3);

function fill(c: RGB): void {
  for (let i = 0; i < W * H; i++) {
    px[i * 3] = c[0];
    px[i * 3 + 1] = c[1];
    px[i * 3 + 2] = c[2];
  }
}

function setPixel(x: number, y: number, c: RGB): void {
  if (x < 0 || y < 0 || x >= W || y >= H) return;
  const i = (y * W + x) * 3;
  px[i] = c[0];
  px[i + 1] = c[1];
  px[i + 2] = c[2];
}

function rect(x: number, y: number, w: number, h: number, c: RGB): void {
  for (let yy = y; yy < y + h; yy++) {
    for (let xx = x; xx < x + w; xx++) setPixel(xx, yy, c);
  }
}

function hline(x: number, y: number, w: number, c: RGB, t = 1): void {
  rect(x, y, w, t, c);
}

function vline(x: number, y: number, h: number, c: RGB, t = 1): void {
  rect(x, y, t, h, c);
}

// Bresenham line.
function line(x0: number, y0: number, x1: number, y1: number, c: RGB, t = 1): void {
  const dx = Math.abs(x1 - x0);
  const dy = -Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx + dy;
  let x = x0;
  let y = y0;
  for (;;) {
    rect(x - Math.floor(t / 2), y - Math.floor(t / 2), t, t, c);
    if (x === x1 && y === y1) break;
    const e2 = 2 * err;
    if (e2 >= dy) {
      err += dy;
      x += sx;
    }
    if (e2 <= dx) {
      err += dx;
      y += sy;
    }
  }
}

function textWidth(s: string, scale: number): number {
  let w = 0;
  for (const ch of s) {
    void ch;
    w += 6 * scale;
  }
  return w - scale; // no trailing gap
}

function drawText(x: number, y: number, s: string, scale: number, c: RGB): void {
  let cx = x;
  for (const ch of s) {
    const g = FONT[ch] ?? FONT["?"];
    for (let r = 0; r < 7; r++) {
      const row = g[r];
      for (let col = 0; col < 5; col++) {
        if (row[col] === "1") {
          rect(cx + col * scale, y + r * scale, scale, scale, c);
        }
      }
    }
    cx += 6 * scale;
  }
}

function drawTextCentered(x: number, y: number, w: number, s: string, scale: number, c: RGB): void {
  const tw = textWidth(s, scale);
  drawText(x + Math.floor((w - tw) / 2), y, s, scale, c);
}

// Word-wrap plain text to a pixel width at a given scale.
function wrap(text: string, maxW: number, scale: number): string[] {
  const words = text.split(" ");
  const lines: string[] = [];
  let cur = "";
  for (const word of words) {
    const trial = cur === "" ? word : cur + " " + word;
    if (textWidth(trial, scale) <= maxW) {
      cur = trial;
    } else {
      if (cur !== "") lines.push(cur);
      cur = word;
    }
  }
  if (cur !== "") lines.push(cur);
  return lines;
}

function drawParagraph(x: number, y: number, text: string, maxW: number, scale: number, c: RGB, leading: number): number {
  const lines = wrap(text, maxW, scale);
  let yy = y;
  for (const ln of lines) {
    drawText(x, yy, ln, scale, c);
    yy += leading;
  }
  return yy;
}

// ---------------------------------------------------------------------------
// PNG encoder: deterministic, no ancillary chunks, zlib level 9.
// ---------------------------------------------------------------------------
const CRC_TABLE: Uint32Array = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    t[n] = c >>> 0;
  }
  return t;
})();

function crc32(buf: Buffer): number {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type: string, data: Buffer): Buffer {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const td = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(td), 0);
  return Buffer.concat([len, td, crc]);
}

function encodePng(): Buffer {
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(W, 0);
  ihdr.writeUInt32BE(H, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // colour type RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;
  const raw = Buffer.alloc(H * (1 + W * 3));
  for (let y = 0; y < H; y++) {
    raw[y * (1 + W * 3)] = 0; // filter: none
    raw.set(px.subarray(y * W * 3, (y + 1) * W * 3), y * (1 + W * 3) + 1);
  }
  const idat = deflateSync(raw, { level: 9 });
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

// ---------------------------------------------------------------------------
// The front page. All facts were verified against sources read on
// 24 November 2026 (see FACTS.md). No story is dated before 23 Nov 2026.
// ---------------------------------------------------------------------------

const M = 36; // margin
const CW = W - 2 * M; // content width = 952

function rule(y: number, t = 2): void {
  hline(M, y, CW, INK, t);
}

function kicker(x: number, y: number, s: string): void {
  drawText(x, y, s.toUpperCase(), 2, RED);
}

function headline(x: number, y: number, s: string, maxW: number, scale: number, leading: number): number {
  const lines = wrap(s, maxW, scale);
  let yy = y;
  for (const ln of lines) {
    drawText(x, yy, ln, scale, INK);
    yy += leading;
  }
  return yy;
}

function deck(x: number, y: number, s: string, maxW: number): number {
  return drawParagraph(x, y, s, maxW, 2, INK, 15);
}

function storyHead(x: number, y: number, w: number, kick: string, head: string, body: string): number {
  kicker(x, y, kick);
  let yy = headline(x, y + 20, head, w, 3, 24);
  yy = deck(x, yy + 2, body, w);
  return yy;
}

function main(): void {
  fill(PAPER);

  // ---- Masthead ------------------------------------------------------------
  let y = 20;
  drawTextCentered(M, y, CW, "THE WORLD TODAY", 6, INK);
  y += 49;
  drawTextCentered(M, y, CW, "ONE DAY  \u2022  ONE PAGE  \u2022  THE WORLD", 2, GREY);
  y += 18;
  rule(y, 4);
  y += 6;

  // ---- Dateline bar --------------------------------------------------------
  rect(M, y, CW, 30, INK);
  drawText(M + 14, y + 8, "TUESDAY 24 NOVEMBER 2026", 2, PAPER);
  const right = "THE DAY IN FULL \u2014 AS REPORTED TODAY";
  drawText(M + CW - 14 - textWidth(right, 2), y + 8, right, 2, PAPER);
  y += 30 + 8;
  rule(y, 2);
  y += 10;

  // ---- Lead story: Nvidia --------------------------------------------------
  // Headline spans the full width; deck on the left, share chart on the right.
  kicker(M, y, "Lead story \u2022 Technology \u2022 Wall Street");
  y += 20;
  y = headline(M, y, "HUANG IS BACK: NVIDIA REINSTATES ITS CEO AFTER TRUMP STEPS IN", CW, 4, 34);
  y += 6;

  const chartX = M + CW - 260;
  const chartY = y;
  const chartW = 260;
  const chartH = 96;
  // Chart frame.
  rect(chartX, chartY, chartW, chartH, PAPER);
  for (let i = 0; i < chartW; i++) {
    setPixel(chartX + i, chartY, LIGHTGREY);
    setPixel(chartX + i, chartY + chartH - 1, LIGHTGREY);
  }
  for (let i = 0; i < chartH; i++) {
    setPixel(chartX, chartY + i, LIGHTGREY);
    setPixel(chartX + chartW - 1, chartY + i, LIGHTGREY);
  }
  // Rising share line: resignation dip, then a steep climb after the news.
  const pts: Array<[number, number]> = [
    [14, 72], [46, 68], [78, 74], [110, 62], [142, 78], [174, 56], [206, 36], [238, 18],
  ];
  for (let i = 0; i < pts.length - 1; i++) {
    line(chartX + pts[i][0], chartY + pts[i][1], chartX + pts[i + 1][0], chartY + pts[i + 1][1], GREEN, 3);
  }
  line(chartX + 238, chartY + 18, chartX + 252, chartY + 18, GREEN, 3);
  // Arrowhead at the top of the climb.
  line(chartX + 238, chartY + 18, chartX + 246, chartY + 30, GREEN, 3);
  line(chartX + 252, chartY + 18, chartX + 246, chartY + 30, GREEN, 3);
  drawText(chartX + 12, chartY + 8, "NVDA SHARES", 2, GREY);
  drawText(chartX + 12, chartY + 76, "+30% IN A DAY", 2, GREEN);

  const leadDeck =
    "Nvidia's board voted unanimously on Monday to bring back co-founder Jensen Huang as chief executive, only 11 days after he resigned over an affair with a woman US officials believe is a Chinese spy. President Trump pressed the board directly \u2014 \u201cI made the deal\u201d, he told CNBC \u2014 and shares soared more than 30% in a day. Huang testifies before the Senate Banking Committee on 3 December.";
  const leadEnd = deck(M, y, leadDeck, CW - 280);
  y = Math.max(leadEnd, chartY + chartH) + 10;
  rule(y, 2);
  y += 10;

  // ---- Row 1: Ukraine at sea | Ukraine peace talks -------------------------
  const colW = Math.floor((CW - 24) / 2);
  const col2X = M + colW + 24;
  const row1Y = y;
  const endA = storyHead(
    M,
    row1Y,
    colW,
    "War at sea \u2022 Libya",
    "UKRAINE SINKS A RUSSIAN WARSHIP OFF LIBYA",
    "Ukrainian naval drones sank one of Russia's newest warships off Libya, President Zelenskyy said on Monday. Kyiv said a corvette and a helicopter were destroyed off Benghazi.",
  );
  const endB = storyHead(
    col2X,
    row1Y,
    colW,
    "Diplomacy \u2022 Kyiv",
    "ZELENSKYY: PEACE TALKS \u201cLITERALLY TOMORROW\u201d",
    "Ukraine is ready to join four-way talks with Russia, Europe and the US as soon as possible, Zelenskyy told NATO lawmakers in Berlin. Partners aim to meet before Christmas.",
  );
  vline(M + colW + 12, row1Y, Math.max(endA, endB) - row1Y, LIGHTGREY, 1);
  y = Math.max(endA, endB) + 8;
  rule(y, 2);
  y += 10;

  // ---- Row 2: Cyber mega-deal | Gaza ---------------------------------------
  const row2Y = y;
  const endC = storyHead(
    M,
    row2Y,
    colW,
    "Business \u2022 Cybersecurity",
    "CROWDSTRIKE BUYS ZSCALER IN $44 BILLION DEAL",
    "CrowdStrike agreed on Monday to buy Zscaler in a $43.9 billion all-stock deal, the biggest cybersecurity takeover on record, at a 34% premium. It is expected to close in the second half of 2027.",
  );
  const endD = storyHead(
    col2X,
    row2Y,
    colW,
    "Middle East \u2022 Gaza",
    "THREE KILLED IN GAZA STRIKES AS US SQUEEZES IRAN",
    "Israeli strikes killed three people in Gaza on Monday, health officials said, including a UN relief agency worker. The US sanctioned nearly 30 Iran-linked exchange houses.",
  );
  vline(M + colW + 12, row2Y, Math.max(endC, endD) - row2Y, LIGHTGREY, 1);
  y = Math.max(endC, endD) + 8;
  rule(y, 2);
  y += 10;

  // ---- Row 3: Climate talks | The night sky --------------------------------
  const row3Y = y;
  const endE = storyHead(
    M,
    row3Y,
    colW,
    "Climate \u2022 Turkey",
    "CLIMATE SUMMIT STALLS AS OIL STATES PUSH BACK",
    "UN climate talks in Turkey stalled as Saudi Arabia, Russia and other oil producers clashed with countries demanding stronger action, with little agreed and the outcome open.",
  );
  const endF = storyHead(
    col2X,
    row3Y,
    colW,
    "Science \u2022 Tonight",
    "SUPERMOON MEETS THE SEVEN SISTERS",
    "A supermoon rises tonight beside the Pleiades, the Seven Sisters, in one of the year's brightest sky pairings. Venus is at its brightest on 27 November.",
  );
  vline(M + colW + 12, row3Y, Math.max(endE, endF) - row3Y, LIGHTGREY, 1);
  y = Math.max(endE, endF) + 8;
  rule(y, 4);
  y += 8;

  // ---- In Brief ------------------------------------------------------------
  rect(M, y, CW, 24, INK);
  drawText(M + 12, y + 6, "IN BRIEF", 2, PAPER);
  y += 24 + 8;
  const briefs = [
    "EU: Commission unveils a 22nd sanctions package against Russia.",
    "US: Rubio meets Qatar's PM as uncertainty grows over Iran.",
    "UK: 12,000 evacuated from a concert after a mystery substance in the air.",
    "US: Waymo pulls driverless taxis from all freeways.",
    "KOREA: Education minister resigns over AI cheating rules.",
    "INDIA: Nepal PM Shah visits New Delhi for talks with Modi.",
  ];
  const bColW = Math.floor((CW - 24) / 2);
  let by = y;
  for (let i = 0; i < 3; i++) {
    by = drawParagraph(M, by, "\u2022 " + briefs[i], bColW, 2, INK, 14);
  }
  let by2 = y;
  for (let i = 3; i < 6; i++) {
    by2 = drawParagraph(col2X, by2, "\u2022 " + briefs[i], bColW, 2, INK, 14);
  }
  y = Math.max(by, by2) + 4;
  rule(y, 2);
  y += 8;

  // ---- Footer ---------------------------------------------------------------
  drawText(
    M,
    y,
    "Sources: Reuters, AP, BBC, Bloomberg, Euronews, Forbes. Every story above was reported on Tuesday 24 November 2026.",
    1,
    GREY,
  );

  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? "out";
  mkdirSync(outDir, { recursive: true });
  writeFileSync(outDir + "/entry.png", encodePng());
}

main();
