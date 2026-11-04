import zlib from 'zlib';

export interface MedicalCertificateOptions {
  patientName?: string;
  doctorName?: string;
  crm?: string;
  clinicName?: string;
  clinicAddress?: string;
  clinicPhone?: string;
  dateStr?: string;
  daysOff?: string;
  cid?: string;
  subject?: string;
  reasonType?: string;
}

const DOCTORS = [
  { name: 'Dr. Roberto Albuquerque Mendes', crm: 'CRM/SP 148.921', spec: 'Clinica Medica' },
  { name: 'Dra. Camila Bittencourt Siqueira', crm: 'CRM/SP 182.405', spec: 'Medicina do Trabalho' },
  { name: 'Dr. Fernando Vasconcelos Prado', crm: 'CRM/SP 163.782', spec: 'Infectologia e Clinica Geral' },
  { name: 'Dra. Juliana Prado Cavalcanti', crm: 'CRM/SP 195.310', spec: 'Medicina de Familia e Comunidade' },
];

const CIDS_BY_REASON: Record<string, string[]> = {
  SAUDE: [
    'CID 10: J11.1 - Influenza (Gripe) com manifestacoes respiratorias',
    'CID 10: K52.9 - Gastroenterite e colite nao-infecciosas',
    'CID 10: M54.5 - Dor lombar baixa (Lombalgia aguda incapacitante)',
    'CID 10: R51 - Cefaleia aguda intensa e enxaqueca',
    'CID 10: B34.2 - Infeccao por coronavirus de localizacao nao especificada',
    'CID 10: H10.1 - Conjuntivite aguda contagiosa',
  ],
  OUTROS: [
    'CID 10: Z76.5 - Pessoa simulando doenca / Avaliacao clinica geral',
    'CID 10: R53 - Mal-estar geral e fadiga extrema',
  ],
};

// 5x7 ASCII bitmap font
const FONT_5X7: Record<string, number[]> = {
  ' ': [0x00, 0x00, 0x00, 0x00, 0x00],
  '!': [0x00, 0x00, 0x5f, 0x00, 0x00],
  '"': [0x00, 0x07, 0x00, 0x07, 0x00],
  '#': [0x14, 0x7f, 0x14, 0x7f, 0x14],
  '$': [0x24, 0x2a, 0x7f, 0x2a, 0x12],
  '%': [0x23, 0x13, 0x08, 0x64, 0x62],
  '&': [0x36, 0x49, 0x55, 0x22, 0x50],
  "'": [0x00, 0x05, 0x03, 0x00, 0x00],
  '(': [0x00, 0x1c, 0x22, 0x41, 0x00],
  ')': [0x00, 0x41, 0x22, 0x1c, 0x00],
  '*': [0x14, 0x08, 0x3e, 0x08, 0x14],
  '+': [0x08, 0x08, 0x3e, 0x08, 0x08],
  ',': [0x00, 0x50, 0x30, 0x00, 0x00],
  '-': [0x08, 0x08, 0x08, 0x08, 0x08],
  '.': [0x00, 0x60, 0x60, 0x00, 0x00],
  '/': [0x20, 0x10, 0x08, 0x04, 0x02],
  '0': [0x3e, 0x51, 0x49, 0x45, 0x3e],
  '1': [0x00, 0x42, 0x7f, 0x40, 0x00],
  '2': [0x42, 0x61, 0x51, 0x49, 0x46],
  '3': [0x21, 0x41, 0x45, 0x4b, 0x31],
  '4': [0x18, 0x14, 0x12, 0x7f, 0x10],
  '5': [0x27, 0x45, 0x45, 0x45, 0x39],
  '6': [0x3c, 0x4a, 0x49, 0x49, 0x30],
  '7': [0x01, 0x71, 0x09, 0x05, 0x03],
  '8': [0x36, 0x49, 0x49, 0x49, 0x36],
  '9': [0x06, 0x49, 0x49, 0x29, 0x1e],
  ':': [0x00, 0x36, 0x36, 0x00, 0x00],
  ';': [0x00, 0x56, 0x36, 0x00, 0x00],
  '<': [0x08, 0x14, 0x22, 0x41, 0x00],
  '=': [0x14, 0x14, 0x14, 0x14, 0x14],
  '>': [0x00, 0x41, 0x22, 0x14, 0x08],
  '?': [0x02, 0x01, 0x51, 0x09, 0x06],
  '@': [0x32, 0x49, 0x79, 0x41, 0x3e],
  'A': [0x7e, 0x11, 0x11, 0x11, 0x7e],
  'B': [0x7f, 0x49, 0x49, 0x49, 0x36],
  'C': [0x3e, 0x41, 0x41, 0x41, 0x22],
  'D': [0x7f, 0x41, 0x41, 0x22, 0x1c],
  'E': [0x7f, 0x49, 0x49, 0x49, 0x41],
  'F': [0x7f, 0x09, 0x09, 0x09, 0x01],
  'G': [0x3e, 0x41, 0x49, 0x49, 0x7a],
  'H': [0x7f, 0x08, 0x08, 0x08, 0x7f],
  'I': [0x00, 0x41, 0x7f, 0x41, 0x00],
  'J': [0x20, 0x40, 0x41, 0x3f, 0x01],
  'K': [0x7f, 0x08, 0x14, 0x22, 0x41],
  'L': [0x7f, 0x40, 0x40, 0x40, 0x40],
  'M': [0x7f, 0x02, 0x0c, 0x02, 0x7f],
  'N': [0x7f, 0x04, 0x08, 0x10, 0x7f],
  'O': [0x3e, 0x41, 0x41, 0x41, 0x3e],
  'P': [0x7f, 0x09, 0x09, 0x09, 0x06],
  'Q': [0x3e, 0x41, 0x51, 0x21, 0x5e],
  'R': [0x7f, 0x09, 0x19, 0x29, 0x46],
  'S': [0x46, 0x49, 0x49, 0x49, 0x31],
  'T': [0x01, 0x01, 0x7f, 0x01, 0x01],
  'U': [0x3f, 0x40, 0x40, 0x40, 0x3f],
  'V': [0x1f, 0x20, 0x40, 0x20, 0x1f],
  'W': [0x7f, 0x20, 0x18, 0x20, 0x7f],
  'X': [0x63, 0x14, 0x08, 0x14, 0x63],
  'Y': [0x07, 0x08, 0x70, 0x08, 0x07],
  'Z': [0x61, 0x51, 0x49, 0x45, 0x43],
  '[': [0x00, 0x7f, 0x41, 0x41, 0x00],
  '\\': [0x02, 0x04, 0x08, 0x10, 0x20],
  ']': [0x00, 0x41, 0x41, 0x7f, 0x00],
  '^': [0x04, 0x02, 0x01, 0x02, 0x04],
  '_': [0x40, 0x40, 0x40, 0x40, 0x40],
  'a': [0x20, 0x54, 0x54, 0x54, 0x78],
  'b': [0x7f, 0x48, 0x44, 0x44, 0x38],
  'c': [0x38, 0x44, 0x44, 0x44, 0x20],
  'd': [0x38, 0x44, 0x44, 0x48, 0x7f],
  'e': [0x38, 0x54, 0x54, 0x54, 0x18],
  'f': [0x08, 0x7e, 0x09, 0x01, 0x02],
  'g': [0x0c, 0x52, 0x52, 0x52, 0x3e],
  'h': [0x7f, 0x08, 0x04, 0x04, 0x78],
  'i': [0x00, 0x44, 0x7d, 0x40, 0x00],
  'j': [0x20, 0x40, 0x44, 0x3d, 0x00],
  'k': [0x7f, 0x10, 0x28, 0x44, 0x00],
  'l': [0x00, 0x41, 0x7f, 0x40, 0x00],
  'm': [0x7c, 0x04, 0x18, 0x04, 0x78],
  'n': [0x7c, 0x08, 0x04, 0x04, 0x78],
  'o': [0x38, 0x44, 0x44, 0x44, 0x38],
  'p': [0x7c, 0x14, 0x14, 0x14, 0x08],
  'q': [0x08, 0x14, 0x14, 0x18, 0x7c],
  'r': [0x7c, 0x08, 0x04, 0x04, 0x08],
  's': [0x48, 0x54, 0x54, 0x54, 0x20],
  't': [0x04, 0x3f, 0x44, 0x40, 0x20],
  'u': [0x3c, 0x40, 0x40, 0x20, 0x7c],
  'v': [0x1c, 0x20, 0x40, 0x20, 0x1c],
  'w': [0x3c, 0x40, 0x30, 0x40, 0x3c],
  'x': [0x44, 0x28, 0x10, 0x28, 0x44],
  'y': [0x0c, 0x50, 0x50, 0x50, 0x3c],
  'z': [0x44, 0x64, 0x54, 0x4c, 0x44],
  '|': [0x00, 0x00, 0x77, 0x00, 0x00],
};

function normalizeAscii(str: string): string {
  return str
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E]/g, '');
}

export function isSimulatedBase64(base64Data: string): boolean {
  if (!base64Data) return true;
  const clean = base64Data.replace(/^data:.*?;base64,/, '').trim();
  if (clean.length < 250) return true;
  if (clean.includes('JVBERi0xLjQKJUZha2VQZGY')) return true; // FakePdf
  if (clean.startsWith('/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAP//////////////////////////////////////////////////////////////////////////////////////')) return true;
  return false;
}

function resolveOptions(opts: MedicalCertificateOptions) {
  const doctor = DOCTORS[Math.abs((opts.patientName || 'A').charCodeAt(0)) % DOCTORS.length];
  const cids = CIDS_BY_REASON[opts.reasonType || 'SAUDE'] || CIDS_BY_REASON.SAUDE;
  const defaultCid = cids[Math.abs((opts.subject || 'B').charCodeAt(0)) % cids.length];

  return {
    patientName: opts.patientName || 'Professor(a) Titular',
    doctorName: opts.doctorName || doctor.name,
    crm: opts.crm || doctor.crm,
    clinicName: opts.clinicName || 'HOSPITAL & CLINICA MEDICA UNIVERSITARIA',
    clinicAddress: opts.clinicAddress || 'Av. das Nacoes Unidas, 12.300 - Centro Medico',
    clinicPhone: opts.clinicPhone || 'Tel: (11) 3456-7890 | CNPJ: 54.321.987/0001-44',
    dateStr: opts.dateStr || new Date().toLocaleDateString('pt-BR'),
    daysOff: opts.daysOff || '1 (um) dia',
    cid: opts.cid || defaultCid,
    subject: opts.subject || 'Atividades Academicas / Docencia',
    authCode: 'MED-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
  };
}

export function generateMedicalCertificatePdf(opts: MedicalCertificateOptions): Buffer {
  const o = resolveOptions(opts);
  const patientClean = normalizeAscii(o.patientName);
  const doctorClean = normalizeAscii(o.doctorName);
  const subjectClean = normalizeAscii(o.subject);
  const cidClean = normalizeAscii(o.cid);
  const clinicClean = normalizeAscii(o.clinicName);
  const addressClean = normalizeAscii(o.clinicAddress);
  const phoneClean = normalizeAscii(o.clinicPhone);

  const content = `
q
0.1 0.45 0.75 rg
15 827 565 5 re f
0.98 0.98 0.99 rg
20 20 555 802 re f
0.8 0.85 0.9 rg
20 20 555 802 re S
Q

BT
/F2 16 Tf
0.1 0.35 0.65 rg
110 780 Td
(${clinicClean}) Tj
ET

BT
/F1 9 Tf
0.4 0.45 0.5 rg
150 765 Td
(${addressClean}) Tj
175 752 Td
(${phoneClean}) Tj
ET

q
0.8 0.85 0.9 rg
40 735 515 1 re f
Q

BT
/F2 20 Tf
0.15 0.2 0.3 rg
195 685 Td
(ATESTADO MEDICO) Tj
ET

BT
/F1 12 Tf
0.2 0.2 0.2 rg
60 615 Td
(Atesto, para os devidos fins de comprovacao de ausencia e frequencia academica,) Tj
0 -22 Td
(que o\\(a\\) paciente:) Tj
ET

BT
/F2 14 Tf
0.05 0.25 0.5 rg
155 593 Td
(${patientClean}) Tj
ET

BT
/F1 12 Tf
0.2 0.2 0.2 rg
60 555 Td
(esteve sob atendimento medico em ${o.dateStr}, tendo sido submetido\\(a\\) a) Tj
0 -22 Td
(consulta clinica e avaliacao fisica detalhada.) Tj
0 -28 Td
(Em virtude do quadro clinico diagnosticado, foi recomendado repouso domiciliar) Tj
0 -22 Td
(e afastamento de suas atividades profissionais pelo periodo de ${o.daysOff},) Tj
0 -22 Td
(referente a disciplina de ${subjectClean}.) Tj
ET

q
0.94 0.96 0.99 rg
60 380 475 48 re f
0.75 0.8 0.9 rg
60 380 475 48 re S
Q

BT
/F2 10 Tf
0.1 0.3 0.6 rg
75 408 Td
(CLASSIFICACAO INTERNACIONAL DE DOENCAS \\(CID-10\\):) Tj
/F1 11 Tf
0.2 0.2 0.2 rg
75 392 Td
(${cidClean}) Tj
ET

BT
/F1 11 Tf
0.3 0.3 0.3 rg
350 260 Td
(Sao Paulo, ${o.dateStr}.) Tj
ET

q
0.5 0.5 0.5 rg
320 180 200 1 re f
Q

BT
/F2 12 Tf
0.1 0.2 0.3 rg
330 162 Td
(${doctorClean}) Tj
/F1 10 Tf
0.35 0.35 0.35 rg
365 148 Td
(${o.crm}) Tj
/F1 9 Tf
0.1 0.6 0.4 rg
320 132 Td
([ Assinatura e Certificado Digital ICP-Brasil Validados ]) Tj
ET

BT
/F1 8 Tf
0.5 0.5 0.5 rg
60 60 Td
(Documento assinado digitalmente conforme MP n. 2.200-2/2001 e Resolucao CFM n. 2.299/2021.) Tj
0 -12 Td
(Codigo de Autenticidade Digital: ${o.authCode}) Tj
ET
`;

  const streamLength = Buffer.byteLength(content, 'latin1');

  const pdf = `%PDF-1.4
1 0 obj
<< /Type /Catalog /Pages 2 0 R >>
endobj
2 0 obj
<< /Type /Pages /Kids [3 0 R] /Count 1 >>
endobj
3 0 obj
<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 4 0 R /F2 5 0 R >> >> /Contents 6 0 R >>
endobj
4 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>
endobj
5 0 obj
<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>
endobj
6 0 obj
<< /Length ${streamLength} >>
stream${content}
endstream
endobj
xref
0 7
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000244 00000 n 
0000000315 00000 n 
0000000391 00000 n 
trailer
<< /Size 7 /Root 1 0 R >>
startxref
${470 + streamLength}
%%EOF`;

  return Buffer.from(pdf, 'latin1');
}

export function generateMedicalCertificatePng(opts: MedicalCertificateOptions): Buffer {
  const o = resolveOptions(opts);
  const patientClean = normalizeAscii(o.patientName).toUpperCase();
  const doctorClean = normalizeAscii(o.doctorName);
  const subjectClean = normalizeAscii(o.subject);
  const cidClean = normalizeAscii(o.cid);

  const width = 640;
  const height = 860;
  const buffer = Buffer.alloc((width * 3 + 1) * height);

  function setPixel(x: number, y: number, r: number, g: number, b: number) {
    if (x < 0 || x >= width || y < 0 || y >= height) return;
    const offset = y * (width * 3 + 1) + 1 + x * 3;
    buffer[offset] = r;
    buffer[offset + 1] = g;
    buffer[offset + 2] = b;
  }

  // Draw background white with border
  for (let y = 0; y < height; y++) {
    buffer[y * (width * 3 + 1)] = 0;
    for (let x = 0; x < width; x++) {
      if (x < 12 || x >= width - 12 || y < 12 || y >= height - 12) {
        setPixel(x, y, 241, 245, 249);
      } else if (x === 12 || x === width - 13 || y === 12 || y === height - 13) {
        setPixel(x, y, 203, 213, 225);
      } else if (y < 22) {
        setPixel(x, y, 2, 132, 199);
      } else {
        setPixel(x, y, 255, 255, 255);
      }
    }
  }

  function fillRect(rx: number, ry: number, rw: number, rh: number, r: number, g: number, b: number) {
    for (let y = ry; y < ry + rh; y++) {
      for (let x = rx; x < rx + rw; x++) {
        setPixel(x, y, r, g, b);
      }
    }
  }

  function drawLine(x1: number, y1: number, x2: number, y2: number, r: number, g: number, b: number) {
    const dx = Math.abs(x2 - x1);
    const dy = Math.abs(y2 - y1);
    const sx = x1 < x2 ? 1 : -1;
    const sy = y1 < y2 ? 1 : -1;
    let err = dx - dy;
    let cx = x1;
    let cy = y1;
    while (true) {
      setPixel(cx, cy, r, g, b);
      if (cx === x2 && cy === y2) break;
      const e2 = 2 * err;
      if (e2 > -dy) { err -= dy; cx += sx; }
      if (e2 < dx) { err += dx; cy += sy; }
    }
  }

  function drawText(str: string, startX: number, startY: number, scale = 2, r = 30, g = 40, b = 50) {
    let curX = startX;
    for (let i = 0; i < str.length; i++) {
      const char = str[i];
      const glyph = FONT_5X7[char] || FONT_5X7['?'] || [0x7f, 0x7f, 0x7f, 0x7f, 0x7f];
      for (let col = 0; col < 5; col++) {
        const colBits = glyph[col];
        for (let row = 0; row < 7; row++) {
          if ((colBits >> row) & 1) {
            fillRect(curX + col * scale, startY + row * scale, scale, scale, r, g, b);
          }
        }
      }
      curX += 6 * scale;
    }
  }

  // Header
  fillRect(40, 40, 560, 2, 2, 132, 199);
  drawText('HOSPITAL & CLINICA UNIVERSITARIA', 100, 55, 2, 2, 132, 199);
  drawText('CENTRO MEDICO INTEGRADO - MEDICINA OCUPACIONAL', 80, 78, 1, 100, 116, 139);
  drawText('Av. das Nacoes Unidas, 12.300 | CNPJ: 54.321.987/0001-44', 110, 93, 1, 148, 163, 184);
  fillRect(40, 112, 560, 1, 226, 232, 240);

  // Title Box
  fillRect(190, 130, 260, 42, 240, 249, 255);
  for (let x = 190; x < 450; x++) { setPixel(x, 130, 186, 230, 253); setPixel(x, 172, 186, 230, 253); }
  for (let y = 130; y < 172; y++) { setPixel(190, y, 186, 230, 253); setPixel(450, y, 186, 230, 253); }
  drawText('ATESTADO MEDICO', 215, 144, 2, 3, 105, 161);

  // Body Text
  drawText('Atesto para os devidos fins de comprovacao de frequencia', 50, 205, 1, 51, 65, 85);
  drawText('e justificativa de ausencia que o(a) paciente:', 50, 222, 1, 51, 65, 85);

  // Patient Name Box
  fillRect(50, 244, 540, 40, 248, 250, 252);
  drawText('PACIENTE / PROFESSOR(A):', 65, 252, 1, 100, 116, 139);
  drawText(patientClean, 65, 268, 1, 15, 23, 42);

  drawText('esteve sob atendimento medico nesta data, tendo sido avaliado(a)', 50, 310, 1, 51, 65, 85);
  drawText('clinicamente e submetido(a) a anamnese e exame fisico.', 50, 326, 1, 51, 65, 85);
  drawText(`Recomenda-se repouso domiciliar e dispensa de atividades por ${o.daysOff},`, 50, 344, 1, 51, 65, 85);
  drawText(`referente a disciplina: ${subjectClean}.`, 50, 360, 1, 51, 65, 85);

  // CID Box
  fillRect(50, 395, 540, 52, 254, 242, 242);
  for (let x = 50; x < 590; x++) { setPixel(x, 395, 254, 202, 202); setPixel(x, 447, 254, 202, 202); }
  for (let y = 395; y < 447; y++) { setPixel(50, y, 254, 202, 202); setPixel(590, y, 254, 202, 202); }
  drawText('CLASSIFICACAO INTERNACIONAL DE DOENCAS (CID-10):', 65, 407, 1, 185, 28, 28);
  drawText(cidClean, 65, 425, 1, 153, 27, 27);

  // Date and location
  drawText(`Sao Paulo, ${o.dateStr}`, 400, 500, 1, 71, 85, 105);

  // Doctor Signature Stamp
  fillRect(330, 540, 250, 105, 240, 253, 250);
  for (let x = 330; x < 580; x++) { setPixel(x, 540, 153, 246, 228); setPixel(x, 645, 153, 246, 228); }
  for (let y = 540; y < 645; y++) { setPixel(330, y, 153, 246, 228); setPixel(580, y, 153, 246, 228); }

  drawLine(350, 585, 560, 585, 15, 118, 110);
  drawText(doctorClean, 355, 595, 1, 15, 118, 110);
  drawText(o.crm, 400, 610, 1, 13, 148, 136);
  drawText('[ ASSINATURA DIGITAL VALIDADA ]', 350, 626, 1, 16, 185, 129);

  // Security Footer
  fillRect(40, 740, 560, 75, 248, 250, 252);
  drawText('AUTENTICIDADE E CONFORMIDADE LEGAL:', 55, 752, 1, 71, 85, 105);
  drawText(`Codigo de Seguranca: ${o.authCode}`, 55, 770, 1, 2, 132, 199);
  drawText('Documento emitido nos termos da Resolucao CFM 2.299/2021.', 55, 788, 1, 148, 163, 184);

  // PNG compression
  const compressed = zlib.deflateSync(buffer);
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  function crc32(buf: Buffer): number {
    let crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
      crc ^= buf[i];
      for (let j = 0; j < 8; j++) crc = (crc >>> 1) ^ (-(crc & 1) & 0xedb88320);
    }
    return (crc ^ 0xffffffff) >>> 0;
  }

  function makeChunk(type: string, data: Buffer): Buffer {
    const len = data.length;
    const buf = Buffer.alloc(12 + len);
    buf.writeUInt32BE(len, 0);
    buf.write(type, 4, 4, 'ascii');
    data.copy(buf, 8);
    const crc = crc32(buf.subarray(4, 8 + len));
    buf.writeUInt32BE(crc, 8 + len);
    return buf;
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8;
  ihdr[9] = 2; // RGB
  ihdr[10] = 0;
  ihdr[11] = 0;
  ihdr[12] = 0;

  return Buffer.concat([
    signature,
    makeChunk('IHDR', ihdr),
    makeChunk('IDAT', compressed),
    makeChunk('IEND', Buffer.alloc(0)),
  ]);
}

