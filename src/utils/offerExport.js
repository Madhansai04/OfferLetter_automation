/**
 * Exports the Offer Details register as an Excel workbook.
 *
 * The app runs offline as one .html file, so rather than pull in a spreadsheet
 * library the .xlsx is assembled by hand: a handful of XML parts zipped with
 * fflate, which the letter generator already ships. Dates and the CTC are
 * written as real Excel dates and numbers, so HR can sort, filter and total
 * them, not as text.
 */
import { zipSync, strToU8 } from 'fflate';

const COLUMNS = [
  { header: 'Date of offer released', width: 22, value: (r) => date(r.offerDate) },
  { header: 'Candidate Name', width: 26, value: (r) => text(r.name) },
  { header: 'Designation', width: 28, value: (r) => text(r.designation) },
  { header: 'Offered CTC', width: 16, value: (r) => (r.ctc ? { n: r.ctc, s: STYLE.currency } : null) },
  { header: 'Contact Number', width: 18, value: (r) => text(r.phone) },
  { header: 'Email ID', width: 32, value: (r) => text(r.email) },
  { header: 'Date of Joining', width: 16, value: (r) => date(r.doj) },
  { header: 'Status', width: 12, value: (r) => text(r.status, STATUS_STYLE[r.status]) },
  { header: 'Recruiter Name', width: 18, value: (r) => text(r.recruiter) }
];

// Indices into cellXfs in styles.xml below.
const STYLE = { header: 1, date: 2, currency: 3 };
const STATUS_STYLE = { Offered: 4, Joined: 5, Declined: 6, Withdrew: 7 };

function text(value, s = 0) {
  const str = String(value ?? '').trim();
  return str ? { t: str, s } : null;
}

// Excel stores a date as days since 1899-12-30.
function date(iso) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso || '');
  if (!m) return null;
  return { n: Date.UTC(+m[1], +m[2] - 1, +m[3]) / 86400000 + 25569, s: STYLE.date };
}

function escapeXml(str) {
  return str.replace(/[<>&"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]);
}

function colName(i) {
  return String.fromCharCode(65 + i);
}

function cellXml(cell, ref) {
  if (!cell) return '';
  if ('n' in cell) return `<c r="${ref}" s="${cell.s}"><v>${cell.n}</v></c>`;
  return `<c r="${ref}" s="${cell.s}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(cell.t)}</t></is></c>`;
}

function sheetXml(records) {
  const rows = [
    COLUMNS.map((c) => ({ t: c.header, s: STYLE.header })),
    ...records.map((r) => COLUMNS.map((c) => c.value(r)))
  ];
  const lastRef = `${colName(COLUMNS.length - 1)}${rows.length}`;

  const body = rows.map((cells, ri) => {
    const n = ri + 1;
    return `<row r="${n}">${cells.map((cell, ci) => cellXml(cell, `${colName(ci)}${n}`)).join('')}</row>`;
  }).join('');

  return '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
    + '<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
    + '<sheetViews><sheetView workbookViewId="0"><pane ySplit="1" topLeftCell="A2" activePane="bottomLeft" state="frozen"/></sheetView></sheetViews>'
    + `<cols>${COLUMNS.map((c, i) => `<col min="${i + 1}" max="${i + 1}" width="${c.width}" customWidth="1"/>`).join('')}</cols>`
    + `<sheetData>${body}</sheetData>`
    + `<autoFilter ref="A1:${lastRef}"/>`
    + '</worksheet>';
}

const fill = (rgb) => `<fill><patternFill patternType="solid"><fgColor rgb="FF${rgb}"/></patternFill></fill>`;
const font = (rgb, bold) => `<font>${bold ? '<b/>' : ''}<sz val="11"/><color rgb="FF${rgb}"/><name val="Calibri"/></font>`;

// Same colours as the status chips in the app.
const STYLES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">'
  + '<numFmts count="2">'
  + '<numFmt numFmtId="164" formatCode="dd/mm/yyyy"/>'
  // Indian digit grouping: 12,50,000 rather than 1,250,000.
  + '<numFmt numFmtId="165" formatCode="[&gt;=10000000]&quot;₹&quot;##\\,##\\,##\\,##0;[&gt;=100000]&quot;₹&quot;##\\,##\\,##0;&quot;₹&quot;##,##0"/>'
  + '</numFmts>'
  + `<fonts count="6">${font('111827')}${font('12009B', true)}${font('1D4ED8', true)}${font('15803D', true)}${font('B91C1C', true)}${font('4B5563', true)}</fonts>`
  + '<fills count="7"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill>'
  + `${fill('DBEAFF')}${fill('EFF6FF')}${fill('F0FDF4')}${fill('FEF2F2')}${fill('F3F4F6')}</fills>`
  + '<borders count="1"><border><left/><right/><top/><bottom/><diagonal/></border></borders>'
  + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
  + '<cellXfs count="8">'
  + '<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>'
  + '<xf numFmtId="0" fontId="1" fillId="2" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
  + '<xf numFmtId="164" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="165" fontId="0" fillId="0" borderId="0" xfId="0" applyNumberFormat="1"/>'
  + '<xf numFmtId="0" fontId="2" fillId="3" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
  + '<xf numFmtId="0" fontId="3" fillId="4" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
  + '<xf numFmtId="0" fontId="4" fillId="5" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
  + '<xf numFmtId="0" fontId="5" fillId="6" borderId="0" xfId="0" applyFont="1" applyFill="1"/>'
  + '</cellXfs>'
  + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
  + '</styleSheet>';

const CONTENT_TYPES_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">'
  + '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>'
  + '<Default Extension="xml" ContentType="application/xml"/>'
  + '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>'
  + '<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>'
  + '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>'
  + '</Types>';

const ROOT_RELS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>'
  + '</Relationships>';

const WORKBOOK_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">'
  + '<sheets><sheet name="Offer Details" sheetId="1" r:id="rId1"/></sheets>'
  + '</workbook>';

const WORKBOOK_RELS_XML = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
  + '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">'
  + '<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>'
  + '<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>'
  + '</Relationships>';

export const XLSX_MIME = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

export function buildOfferWorkbook(records) {
  return zipSync({
    '[Content_Types].xml': strToU8(CONTENT_TYPES_XML),
    '_rels/.rels': strToU8(ROOT_RELS_XML),
    'xl/workbook.xml': strToU8(WORKBOOK_XML),
    'xl/_rels/workbook.xml.rels': strToU8(WORKBOOK_RELS_XML),
    'xl/styles.xml': strToU8(STYLES_XML),
    'xl/worksheets/sheet1.xml': strToU8(sheetXml(records))
  });
}
