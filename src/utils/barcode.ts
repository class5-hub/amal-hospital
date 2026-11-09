// --- Code 128 Barcode Subset B Vector Generator ---
// Standard patterns for indices 0 to 106 (each is 6 bar/space widths, stop is 7)
const CODE128_PATTERNS: string[] = [
  "212222","222122","222221","121223","121322","131222","122213","122312","132212","221213",
  "221312","231212","112232","122132","122231","113222","123122","123221","223211","221132",
  "221231","213212","223112","312131","311222","321122","321221","312212","322112","322211",
  "212123","212321","232121","111323","131123","131321","112313","132113","132311","211313",
  "231113","231311","112133","112331","132131","113123","113321","133121","313121","211331",
  "231131","213113","213311","213131","311123","311321","331121","312113","312311","332111",
  "314111","221411","431111","111224","111422","121124","121421","141122","141221","112214",
  "112412","122114","122411","142112","142211","241211","221114","413111","241112","134111",
  "111242","121142","121241","114212","124112","124211","411212","421112","421211","212141",
  "214121","412121","111143","111341","131141","114113","114311","411113","411311","113141",
  "114131","311141","411131","211412","211214","211232","2331112"
];

export function generateCode128Svg(text: string, height: number = 36, barWidth: number = 1.8): { svgBars: string; totalWidth: number } {
  const safeText = text.replace(/[^\x20-\x7E]/g, '');
  if (!safeText) return { svgBars: '', totalWidth: 0 };

  const startCode = 104; // Start Code B
  let checksum = startCode;
  const codes: number[] = [startCode];

  for (let i = 0; i < safeText.length; i++) {
    const charCode = safeText.charCodeAt(i);
    const codeVal = charCode - 32;
    codes.push(codeVal);
    checksum += codeVal * (i + 1);
  }

  const checkCode = checksum % 103;
  codes.push(checkCode);
  codes.push(106); // Stop code

  let x = 8; // Quiet zone
  const rects: string[] = [];

  for (let c = 0; c < codes.length; c++) {
    const codeIndex = codes[c];
    const pattern = CODE128_PATTERNS[codeIndex] || CODE128_PATTERNS[0];
    let isBar = true;
    for (let p = 0; p < pattern.length; p++) {
      const w = parseInt(pattern[p], 10) * barWidth;
      if (isBar) {
        rects.push(`<rect x="${x.toFixed(1)}" y="0" width="${w.toFixed(1)}" height="${height}" fill="#0f172a" />`);
      }
      x += w;
      isBar = !isBar;
    }
  }

  // Termination bar for stop code
  rects.push(`<rect x="${x.toFixed(1)}" y="0" width="${(barWidth * 2).toFixed(1)}" height="${height}" fill="#0f172a" />`);
  x += barWidth * 2 + 8; // Ending quiet zone

  return { svgBars: rects.join(''), totalWidth: Math.ceil(x) };
}
