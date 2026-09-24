import { describe, it, expect } from 'vitest';
import { unzipSync, strFromU8 } from 'fflate';
import { buildOfferWorkbook } from './offerExport.js';

const record = {
  id: 'a1',
  offerDate: '2026-09-23',
  name: 'Asha <Rao> & Co',
  designation: 'Data Scientist',
  phone: '+919876543210',
  email: 'asha@example.com',
  doj: '2026-10-05',
  status: 'Joined',
  recruiter: 'Surya GM',
  ctc: 1250000
};

function sheet(records) {
  const parts = unzipSync(buildOfferWorkbook(records));
  return { parts, xml: strFromU8(parts['xl/worksheets/sheet1.xml']) };
}

describe('buildOfferWorkbook', () => {
  it('contains every part Excel needs to open the file', () => {
    const { parts } = sheet([record]);
    expect(Object.keys(parts).sort()).toEqual([
      '[Content_Types].xml', '_rels/.rels', 'xl/_rels/workbook.xml.rels',
      'xl/styles.xml', 'xl/workbook.xml', 'xl/worksheets/sheet1.xml'
    ]);
  });

  it('writes the same columns as the table, as a header row', () => {
    const { xml } = sheet([record]);
    const headerRow = xml.match(/<row r="1">(.*?)<\/row>/)[1];
    const headers = [...headerRow.matchAll(/<t[^>]*>(.*?)<\/t>/g)].map((m) => m[1]);
    expect(headers).toEqual([
      'Date of offer released', 'Candidate Name', 'Designation', 'Offered CTC', 'Contact Number',
      'Email ID', 'Date of Joining', 'Status', 'Recruiter Name'
    ]);
  });

  it('stores dates and the CTC as numbers Excel can sort and total', () => {
    const { xml } = sheet([record]);
    expect(xml).toContain('<c r="A2" s="2"><v>46288</v></c>'); // 23/09/2026
    expect(xml).toContain('<c r="G2" s="2"><v>46300</v></c>'); // 05/10/2026
    expect(xml).toContain('<c r="D2" s="3"><v>1250000</v></c>');
  });

  it('escapes text and colours the status cell', () => {
    const { xml } = sheet([record]);
    expect(xml).toContain('Asha &lt;Rao&gt; &amp; Co');
    expect(xml).toMatch(/<c r="H2" s="5" t="inlineStr"><is><t[^>]*>Joined<\/t>/);
  });

  it('leaves missing values blank and filters across all rows', () => {
    const { xml } = sheet([record, { ...record, id: 'b', ctc: null, doj: '', recruiter: '' }]);
    expect(xml).not.toContain('r="D3"');
    expect(xml).not.toContain('r="G3"');
    expect(xml).toContain('<autoFilter ref="A1:I3"/>');
  });
});
