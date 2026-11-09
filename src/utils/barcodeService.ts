import QRCode from 'qrcode';

// --- Code 128 Barcode Subset B Vector Generator ---
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

export interface Code128Result {
  svgBars: string;
  totalWidth: number;
}

export function generateCode128Svg(text: string, height: number = 44, barWidth: number = 2): Code128Result {
  const safeText = (text || '').replace(/[^\x20-\x7E]/g, '');
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
        rects.push(`<rect x="${x}" y="0" width="${w}" height="${height}" fill="#000000" />`);
      }
      x += w;
      isBar = !isBar;
    }
  }

  // Termination bar for stop code
  rects.push(`<rect x="${x}" y="0" width="${barWidth * 2}" height="${height}" fill="#000000" />`);
  x += barWidth * 2 + 8; // Ending quiet zone

  return { svgBars: rects.join(''), totalWidth: x };
}

/**
 * Generates an ultra-crisp, high-fidelity scannable QR Code as an SVG or DataURL
 */
export async function generateQrDataUrl(data: string, size: number = 256): Promise<string> {
  try {
    return await QRCode.toDataURL(data, {
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR data URL:', err);
    return '';
  }
}

export async function generateQrSvgString(data: string, size: number = 120): Promise<string> {
  try {
    return await QRCode.toString(data, {
      type: 'svg',
      width: size,
      margin: 1,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#000000',
        light: '#ffffff'
      }
    });
  } catch (err) {
    console.error('Failed to generate QR SVG:', err);
    return '';
  }
}

/**
 * Generates structured, standard medical QR payloads
 */
export function createPatientQrPayload(patient: { mrn: string; fullName: string; dob: string; bloodGroup?: string }, admissionId?: string): string {
  return JSON.stringify({
    sys: 'AL-AMAL-HMIS',
    mrn: patient.mrn,
    name: patient.fullName,
    dob: patient.dob,
    adm: admissionId || '',
    bg: patient.bloodGroup || '',
    ts: Date.now()
  });
}

export function createSpecimenQrPayload(orderId: string, mrn: string, testName: string, specimenType: string): string {
  return `HMIS:LAB|ORD:${orderId}|MRN:${mrn}|TEST:${testName}|SPEC:${specimenType}|T:${Date.now()}`;
}

export function createMedicationQrPayload(orderId: string, mrn: string, drugName: string, dose: string): string {
  return `HMIS:EMAR|ORD:${orderId}|MRN:${mrn}|DRUG:${drugName}|DOSE:${dose}|AUTH:VALID`;
}

export type ScannedItemType = 'patient' | 'specimen' | 'medication' | 'unknown';

export interface ParsedClinicalScan {
  type: ScannedItemType;
  raw: string;
  format?: string;
  mrn?: string;
  patientName?: string;
  dob?: string;
  admissionId?: string;
  bloodGroup?: string;
  orderId?: string;
  testName?: string;
  specimenType?: string;
  drugName?: string;
  dose?: string;
  timestamp: number;
}

/**
 * Parses any incoming raw barcode string or QR payload and normalizes it
 */
export function parseScannedClinicalPayload(raw: string, format?: string): ParsedClinicalScan {
  const clean = (raw || '').trim();
  const timestamp = Date.now();

  // 1. JSON payload from QR codes
  if (clean.startsWith('{') && clean.endsWith('}')) {
    try {
      const parsed = JSON.parse(clean);
      if (parsed.mrn) {
        return {
          type: 'patient',
          raw: clean,
          format: format || 'qr_code',
          mrn: parsed.mrn,
          patientName: parsed.name,
          dob: parsed.dob,
          admissionId: parsed.adm,
          bloodGroup: parsed.bg,
          timestamp
        };
      }
      if (parsed.type === 'specimen') {
        return {
          type: 'specimen',
          raw: clean,
          format: format || 'qr_code',
          orderId: parsed.orderId,
          mrn: parsed.mrn,
          testName: parsed.test,
          specimenType: parsed.tube,
          timestamp
        };
      }
      if (parsed.type === 'medication') {
        return {
          type: 'medication',
          raw: clean,
          format: format || 'qr_code',
          orderId: parsed.orderId,
          mrn: parsed.mrn,
          drugName: parsed.drug,
          dose: parsed.dose,
          timestamp
        };
      }
    } catch {
      // not JSON
    }
  }

  // 2. Structured string: HMIS:LAB|ORD:...|MRN:...
  if (clean.startsWith('HMIS:LAB|')) {
    const parts = clean.split('|');
    let orderId = '';
    let mrn = '';
    let testName = '';
    let specimenType = '';
    for (const p of parts) {
      if (p.startsWith('ORD:')) orderId = p.replace('ORD:', '');
      if (p.startsWith('MRN:')) mrn = p.replace('MRN:', '');
      if (p.startsWith('TEST:')) testName = p.replace('TEST:', '');
      if (p.startsWith('SPEC:')) specimenType = p.replace('SPEC:', '');
    }
    return {
      type: 'specimen',
      raw: clean,
      format: format || 'qr_code',
      orderId,
      mrn,
      testName,
      specimenType,
      timestamp
    };
  }

  // 3. Structured string: HMIS:EMAR|ORD:...|MRN:...|DRUG:...
  if (clean.startsWith('HMIS:EMAR|')) {
    const parts = clean.split('|');
    let orderId = '';
    let mrn = '';
    let drugName = '';
    let dose = '';
    for (const p of parts) {
      if (p.startsWith('ORD:')) orderId = p.replace('ORD:', '');
      if (p.startsWith('MRN:')) mrn = p.replace('MRN:', '');
      if (p.startsWith('DRUG:')) drugName = p.replace('DRUG:', '');
      if (p.startsWith('DOSE:')) dose = p.replace('DOSE:', '');
    }
    return {
      type: 'medication',
      raw: clean,
      format: format || 'qr_code',
      orderId,
      mrn,
      drugName,
      dose,
      timestamp
    };
  }

  // 4. Lab / Tube code patterns (e.g. LAB-MRN-2026-4401-01 or LAB-102)
  if (clean.toUpperCase().startsWith('LAB-') || clean.toUpperCase().includes('SPEC-')) {
    const mrnMatch = clean.match(/MRN-\d{4}-\d{4}/i);
    return {
      type: 'specimen',
      raw: clean,
      format: format || 'code_128',
      orderId: clean,
      mrn: mrnMatch ? mrnMatch[0] : undefined,
      testName: 'Blood Chemistry / Hematology Panel',
      timestamp
    };
  }

  // 5. Medication / RX patterns (e.g. MED-2026-01 or RX-4401-01)
  if (clean.toUpperCase().startsWith('MED-') || clean.toUpperCase().startsWith('RX-') || clean.toUpperCase().includes('EMAR-')) {
    const mrnMatch = clean.match(/MRN-\d{4}-\d{4}/i);
    return {
      type: 'medication',
      raw: clean,
      format: format || 'code_128',
      orderId: clean,
      mrn: mrnMatch ? mrnMatch[0] : undefined,
      drugName: 'Prescribed Inpatient Medication',
      timestamp
    };
  }

  // 6. Direct MRN pattern (e.g. MRN-2026-0812)
  if (/^MRN-\d{4}-\d{4}$/i.test(clean) || clean.toLowerCase().startsWith('mrn-')) {
    return {
      type: 'patient',
      raw: clean,
      format: format || 'code_128',
      mrn: clean.toUpperCase(),
      timestamp
    };
  }

  // 7. Generic unknown code
  return {
    type: 'unknown',
    raw: clean,
    format: format || 'unknown',
    timestamp
  };
}

/**
 * Synthesizes high-fidelity bedside barcode scanner chimes
 */
export function playScannerAudioBeep(tone: 'success' | 'warning' | 'error' = 'success'): void {
  try {
    const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
    if (!AudioContextClass) return;
    const ctx = new AudioContextClass();
    
    if (tone === 'success') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(1900, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(2500, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.12);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.13);
    } else if (tone === 'warning') {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(360, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.25);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.26);
    } else {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, ctx.currentTime);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.31);
    }
  } catch {
    // Audio autoplay restrictions
  }
}
