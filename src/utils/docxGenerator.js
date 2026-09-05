import { unzipSync, zipSync, strToU8, strFromU8 } from 'fflate';
import {
  formatNumber, formatDateSlashes, formatDateLong, formatDateLongHyphen,
  numberToWordsTitleCase
} from './formatters';
import { downloadBlob } from './downloadBlob';

const TEMPLATE_URL = '/offer-letter-template.docx';
const DOCUMENT_PART = 'word/document.xml';
const FOOTER_PART = 'word/footer1.xml';

/**
 * Word stores a run of text as <w:t>...</w:t>, but it may split a single
 * visible string across several runs (spell-check state, formatting, revision
 * marks). "{name}" can therefore live in the file as "{na" + "me}", so a
 * naive search for "{name}" misses it.
 *
 * Each paragraph's runs are merged into the first one before substitution so
 * placeholders are always contiguous. Formatting is taken from the first run,
 * which is what the placeholder itself was styled with.
 */
function mergeRunsWithinParagraphs(xml) {
  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => {
    const textNodes = [...paragraph.matchAll(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/g)];
    if (textNodes.length < 2) return paragraph;

    const combined = textNodes.map((m) => m[1]).join('');

    // Only collapse the paragraph when a placeholder is actually split across
    // runs. Merging unconditionally would flatten every run in the paragraph
    // into one, throwing away the per-run formatting the template applies to
    // individual words.
    const hasSplitPlaceholder = /\{[^}]*$/.test(textNodes[0][1])
      || textNodes.some((m, i) => i > 0 && /^[^{]*\}/.test(m[1]) && !m[1].includes('{'))
      || (combined.includes('{') && !textNodes.some((m) => /\{[^}]*\}/.test(m[1])));
    if (!hasSplitPlaceholder) return paragraph;

    let isFirst = true;
    return paragraph.replace(/<w:t(?:\s[^>]*)?>[\s\S]*?<\/w:t>/g, () => {
      if (isFirst) {
        isFirst = false;
        return `<w:t xml:space="preserve">${combined}</w:t>`;
      }
      return '<w:t xml:space="preserve"></w:t>';
    });
  });
}

function escapeXml(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Replaces the named {placeholder} tokens the template uses. The template is
 * inconsistent about case ({Name} in the header table, {name} in Annexure 2),
 * so matching ignores case.
 */
function fillNamedPlaceholders(xml, values) {
  let output = xml;
  for (const [token, value] of Object.entries(values)) {
    const pattern = new RegExp(`\\{\\s*${token}\\s*\\}`, 'gi');
    output = output.replace(pattern, escapeXml(value));
  }
  return output;
}

/**
 * The compensation table uses bare "{}" placeholders that carry no name, so
 * they can only be identified by where they sit in the table. They are filled
 * in document order, which for the template's Annexure 2 table is:
 *
 *   CTC, Basic m/y, HRA m/y, Conveyance m/y, Total Fixed m/y,
 *   Variable, PF m/y, Gratuity m/y, Total Benefit m/y
 *
 * If a row is ever added, removed or reordered in the .docx, this list must
 * be updated to match.
 */
function fillPositionalPlaceholders(xml, orderedValues) {
  let index = 0;
  return xml.replace(/\{\s*\}/g, () => {
    const value = orderedValues[index];
    index += 1;
    return value === undefined ? '' : escapeXml(value);
  });
}

/**
 * The insurance table has no placeholders — each coverage cell contains only
 * "/-". The three amounts are inserted before that suffix, in table order:
 * Medical, Personal Accident, Term.
 */
function fillInsuranceAmounts(xml, amounts) {
  let index = 0;
  return xml.replace(/<w:t(?:\s[^>]*)?>\s*\/-\s*<\/w:t>/g, () => {
    const amount = amounts[index];
    index += 1;
    if (amount === undefined) return '<w:t xml:space="preserve">/-</w:t>';
    return `<w:t xml:space="preserve">${escapeXml(amount)}/-</w:t>`;
  });
}

/**
 * Replaces the hardcoded posting city in the offer sentence.
 *
 * After runs are merged the sentence sits in one <w:t>, so the city is matched
 * within the run that follows "join Ganit on". If the template's wording ever
 * changes so the anchor no longer matches, the sentence is left untouched
 * rather than risking a wrong substitution elsewhere.
 */
function replacePostingCity(xml, city) {
  const posting = String(city || '').trim();
  if (!posting) return xml;

  return xml.replace(
    /(join\s+Ganit\s+on\b[\s\S]{0,200}?\bat\s+)Chennai\b/,
    (_match, before) => `${before}${escapeXml(posting)}`
  );
}

const RETENTION_FOOTNOTE =
  '* Retention pay will be prorated & paid during June & December payroll. '
  + 'Any payout must be reimbursed if you resign within 12 months from the date of joining.';

const RELOCATION_FOOTNOTE =
  '** Relocation bonus will be paid during the subsequent payroll after employees '
  + 'complete 1 month from date of joining and will be recovered if you resign within '
  + '12 months from the date of joining.';

/**
 * Adds Retention Pay and Relocation Bonus rows to the compensation table.
 *
 * The template has no rows for them, so the Variable Pay row is cloned: the
 * same three cells, the same widths, and the same gridSpan=4 merged value cell
 * carrying the rupee symbol. Cloning rather than hand-building the XML keeps
 * the new rows identical to the surrounding table if the template's styling
 * ever changes.
 *
 * Rows are only added when an amount was entered; a blank field adds nothing.
 */
function addOptionalBenefitRows(xml, entries) {
  const wanted = entries.filter((entry) => entry.amount > 0);
  if (wanted.length === 0) return xml;

  // The Variable Pay row is the one whose label cell reads "Variable ... Pay".
  const rowPattern = /<w:tr[\s>][\s\S]*?<\/w:tr>/g;
  const rows = [...xml.matchAll(rowPattern)];
  const templateRow = rows.find((m) => {
    const text = m[0].replace(/<[^>]+>/g, '');
    return /Variable\s*Pay/.test(text);
  });
  if (!templateRow) return xml; // template changed — leave the table alone

  const source = templateRow[0];
  let sequence = 4; // Variable Pay is item 4; these follow it

  const newRows = wanted.map((entry) => {
    sequence += 1;

    // Rebuild the row cell by cell. The three cells are, in order: the item
    // number, the label, and the merged value cell. Their text is replaced by
    // position rather than by matching content, because by this point the
    // template's {} placeholders already hold Variable Pay's own figures.
    const cells = [...source.matchAll(/<w:tc>[\s\S]*?<\/w:tc>/g)].map((m) => m[0]);
    if (cells.length !== 3) return null;

    const replacements = [
      String(sequence),
      entry.label,
      `₹ ${formatNumber(entry.amount)}`
    ];

    let row = source;
    cells.forEach((cell, index) => {
      // Collapse the cell's runs into a single run carrying the new text,
      // keeping the first run's properties so styling matches the template.
      const firstRunProps = (cell.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];
      const rebuilt = cell.replace(
        /(<w:p(?:\s[^>]*)?>(?:<w:pPr>[\s\S]*?<\/w:pPr>)?)[\s\S]*?(<\/w:p>)/,
        (_m, open, close) =>
          `${open}<w:r>${firstRunProps}`
          + `<w:t xml:space="preserve">${escapeXml(replacements[index])}</w:t>`
          + `</w:r>${close}`
      );
      row = row.replace(cell, rebuilt);
    });

    return row;
  }).filter(Boolean);

  if (newRows.length === 0) return xml;

  // Insert directly after the Variable Pay row.
  const insertAt = templateRow.index + source.length;
  const withRows = xml.slice(0, insertAt) + newRows.join('') + xml.slice(insertAt);

  // The statutory rows are numbered 5 and 6 in the template, which now
  // collides with the rows just inserted. Push them along so the table reads
  // 1..N without repeats.
  return renumberStatutoryRows(withRows, newRows.length);
}

/**
 * Shifts the PF and Gratuity row numbers by `offset` so they continue the
 * sequence after any inserted optional-benefit rows.
 */
function renumberStatutoryRows(xml, offset) {
  if (offset === 0) return xml;

  return xml.replace(/<w:tr[\s>][\s\S]*?<\/w:tr>/g, (row) => {
    const text = row.replace(/<[^>]+>/g, '');
    if (!/PF Employer Contribution|Gratuity Benefits/.test(text)) return row;

    let done = false;
    return row.replace(/(<w:t(?:\s[^>]*)?>)([56])(<\/w:t>)/, (match, open, digit, close) => {
      if (done) return match;
      done = true;
      return `${open}${Number(digit) + offset}${close}`;
    });
  });
}

/**
 * Adds the retention and relocation footnotes below the compensation table.
 *
 * They are placed after the existing "# Variable Pay will be paid yearly ..."
 * note and styled to match it — italic, 9pt, same indent — so they read as
 * part of the same block. Each appears only when its amount was entered.
 */
function addOptionalBenefitFootnotes(xml, notes) {
  if (notes.length === 0) return xml;

  const paragraphs = [...xml.matchAll(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g)];
  const anchor = paragraphs.find((m) =>
    /Variable Pay will be paid yearly/.test(m[0].replace(/<[^>]+>/g, ''))
  );
  if (!anchor) return xml; // template changed — leave it alone

  const rendered = notes
    .map((note) =>
      '<w:p><w:pPr><w:ind w:left="2"/><w:rPr><w:i/><w:sz w:val="18"/></w:rPr></w:pPr>'
      + `<w:r><w:rPr><w:i/><w:sz w:val="18"/></w:rPr>`
      + `<w:t xml:space="preserve">${escapeXml(note)}</w:t></w:r></w:p>`
    )
    .join('');

  const insertAt = anchor.index + anchor[0].length;
  return xml.slice(0, insertAt) + rendered + xml.slice(insertAt);
}

/**
 * Moves the header's "Date:" left.
 *
 * The Ref and Date share one paragraph, with the Date positioned by a tab
 * stop. The template sets that stop at 7554 twips — 13.3cm, about three
 * quarters of the way across the text area — which leaves the Date stranded
 * near the right margin. Ganit asked for it closer to the Ref, so the stop
 * moves to 5500 twips (9.7cm, just past halfway), still clear of the
 * reference number.
 */
function moveHeaderDateLeft(xml) {
  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => {
    const text = paragraph.replace(/<[^>]+>/g, '');
    if (!/Ref:/.test(text) || !/Date:/.test(text)) return paragraph;

    return paragraph.replace(
      /(<w:tab\b[^>]*w:pos=")\d+(")/,
      (_match, before, after) => `${before}5500${after}`
    );
  });
}

/**
 * Removes the hardcoded "Private and Confidential | Page N of 4" paragraphs
 * from the body.
 *
 * The template repeats that line as four ordinary paragraphs, one at the foot
 * of each page, rather than putting it in the footer. When added rows push the
 * content onto another page, that page gets the real footer (the website and
 * email icons) but no confidentiality line, and the count is wrong besides.
 * The line is re-added as a genuine footer by addFooterPageNumbers().
 */
function removeHardcodedPageFooters(xml) {
  return xml.replace(/<w:p(?:\s[^>]*)?>[\s\S]*?<\/w:p>/g, (paragraph) => {
    const text = paragraph.replace(/<[^>]+>/g, '').replace(/&amp;/g, '&');
    return /Private\s+and\s+Confidential\s*\|\s*Page\s+\d+\s+of\s+\d+/.test(text)
      ? ''
      : paragraph;
  });
}

/**
 * Adds "Private and Confidential | Page N of M" to the real footer, using
 * Word's PAGE and NUMPAGES fields so it renders on every page and counts
 * itself. Styling matches the paragraphs it replaces: 10pt text, a bold
 * orange "|" separator, and bold page numbers.
 *
 * Word computes field results when the document is opened, so the values are
 * marked dirty to force a refresh rather than shipping a stale cached number.
 */
function addFooterPageNumbers(footerXml) {
  if (/PAGE\b/.test(footerXml)) return footerXml; // already present

  const run = (text, props = '') =>
    `<w:r>${props ? `<w:rPr>${props}</w:rPr>` : ''}`
    + `<w:t xml:space="preserve">${text}</w:t></w:r>`;

  const field = (instruction) =>
    '<w:r><w:rPr><w:b/></w:rPr><w:fldChar w:fldCharType="begin" w:dirty="true"/></w:r>'
    + `<w:r><w:rPr><w:b/></w:rPr><w:instrText xml:space="preserve"> ${instruction} </w:instrText></w:r>`
    + '<w:r><w:rPr><w:b/></w:rPr><w:fldChar w:fldCharType="separate"/></w:r>'
    + '<w:r><w:rPr><w:b/></w:rPr><w:t>1</w:t></w:r>'
    + '<w:r><w:rPr><w:b/></w:rPr><w:fldChar w:fldCharType="end"/></w:r>';

  const separator = '<w:b/><w:color w:val="F79446"/><w:sz w:val="24"/>';
  const body = '<w:sz w:val="20"/>';

  const paragraph =
    '<w:p><w:pPr><w:jc w:val="right"/><w:spacing w:after="0"/></w:pPr>'
    + run('Private and Confidential ', body)
    + run('| ', separator)
    + run('Page ')
    + field('PAGE')
    + run(' of ')
    + field('NUMPAGES')
    + '</w:p>';

  return footerXml.replace(/(<w:ftr[^>]*>)/, `$1${paragraph}`);
}

/**
 * Splits a merged run so the given substrings can be set in bold while the
 * text around them stays plain.
 *
 * Filling the offer sentence requires merging its runs, because the template
 * splits {ctc} and {date of joinig} across several. That merge flattens the
 * whole sentence to one style, losing the emphasis the letter is written with.
 * This puts it back: the run is broken into alternating plain and bold runs,
 * so the values stand out exactly as in the signed-off wording.
 *
 * `segments` are matched longest-first so that a value contained inside
 * another (a city that also appears in a role title, say) cannot split its
 * container.
 */
function emphasiseWithinRun(run, segments) {
  const textMatch = run.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/);
  if (!textMatch) return run;

  const fullText = textMatch[1];
  const wanted = segments
    .filter((s) => s.text && String(s.text).trim().length > 0)
    .map((s) => ({ ...s, text: escapeXml(String(s.text).trim()) }))
    .sort((a, b) => b.text.length - a.text.length);
  if (wanted.length === 0) return run;

  const baseProps = (run.match(/<w:rPr>[\s\S]*?<\/w:rPr>/) || [''])[0];

  // Walk the text, carving out each wanted segment as its own run.
  const pieces = [];
  let cursor = 0;
  while (cursor < fullText.length) {
    let hit = null;
    for (const segment of wanted) {
      const at = fullText.indexOf(segment.text, cursor);
      if (at !== -1 && (hit === null || at < hit.at)) hit = { at, segment };
    }
    if (!hit) {
      pieces.push({ text: fullText.slice(cursor), emphasis: null });
      break;
    }
    if (hit.at > cursor) {
      pieces.push({ text: fullText.slice(cursor, hit.at), emphasis: null });
    }
    pieces.push({ text: hit.segment.text, emphasis: hit.segment });
    cursor = hit.at + hit.segment.text.length;
  }
  if (pieces.length < 2) return run;

  return pieces
    .filter((piece) => piece.text.length > 0)
    .map((piece) => {
      if (!piece.emphasis) {
        return `<w:r>${baseProps}<w:t xml:space="preserve">${piece.text}</w:t></w:r>`;
      }
      const props = baseProps
        ? baseProps.replace('</w:rPr>', '<w:b/></w:rPr>')
        : '<w:rPr><w:b/></w:rPr>';
      return `<w:r>${props}<w:t xml:space="preserve">${piece.text}</w:t></w:r>`;
    })
    .join('');
}

/**
 * Restores the offer sentence's emphasis after its runs have been merged.
 *
 * The sentence reads, with the emphasised parts in bold:
 *
 *   We are pleased to offer you a full-time role as **Data Analyst** at Ganit
 *   Business Solutions Pvt. Ltd. Your potential annual Compensation of
 *   **INR 5,00,000/- (Rupees Five Lakh Only).** You will join Ganit on
 *   **02 September 2026** at **Chennai** and your position is work from client
 *   office and or Ganit office and not remote.
 *
 * Note the compensation phrase is emphasised as a whole — "INR", the "/-" and
 * the bracketed words in it are bold too, not just the figure.
 */
function restoreOfferSentenceEmphasis(xml, { role, compensationPhrase, joiningDate, city }) {
  return xml.replace(/<w:r(?:\s[^>]*)?>[\s\S]*?<\/w:r>/g, (run) => {
    const text = (run.match(/<w:t(?:\s[^>]*)?>([\s\S]*?)<\/w:t>/) || [])[1];
    if (text === undefined || !text.includes('pleased to offer')) return run;

    return emphasiseWithinRun(run, [
      { text: role },
      { text: compensationPhrase },
      { text: joiningDate },
      { text: city }
    ]);
  });
}

/**
 * Fills the Ganit offer letter Word template with the form's values.
 *
 * The template's own .docx is downloaded, its document part rewritten, and the
 * package zipped back up. Headers, footers, images, fonts, styles and page
 * layout are carried through untouched, because the original file is edited
 * rather than a new document being built.
 */
export async function generateOfferDocx(formData, breakdown) {
  const response = await fetch(TEMPLATE_URL);
  if (!response.ok) {
    throw new Error(`Could not load the Word template (HTTP ${response.status})`);
  }
  const archive = unzipSync(new Uint8Array(await response.arrayBuffer()));

  const documentPart = archive[DOCUMENT_PART];
  if (!documentPart) {
    throw new Error('The Word template is missing its word/document.xml part');
  }

  const today = new Date();
  const ctcAmount = formData.ctc * 100000;

  let xml = mergeRunsWithinParagraphs(strFromU8(documentPart));

  // Annexure 2's "Date of Joining" row uses {date}, the same token the page-1
  // header uses for the offer date. Fill this one first, matching on the
  // "Joining" run that immediately precedes it, so the generic {date}
  // replacement below does not put today's date in the joining-date cell.
  // Annexure 2 uses the hyphenated form (03-September-2026); page 1's offer
  // sentence keeps the spaced form.
  xml = xml.replace(
    /(Joining<\/w:t>[\s\S]{0,1200}?<w:t(?:\s[^>]*)?>)\{\s*date\s*\}(<\/w:t>)/,
    (_match, before, after) => `${before}${escapeXml(formatDateLongHyphen(formData.doj))}${after}`
  );

  xml = fillNamedPlaceholders(xml, {
    year: today.getFullYear(),
    date: formatDateSlashes(today),
    Name: formData.name,
    name: formData.name,
    email: formData.email,
    contact_no: formData.phone,
    role: formData.role,
    ctc: formatNumber(ctcAmount),
    'in words': numberToWordsTitleCase(Math.floor(ctcAmount)),
    'date of joinig': formatDateLong(formData.doj),
    'date of joining': formatDateLong(formData.doj)
  });

  // The template hardcodes the posting city as "Chennai" in the offer
  // sentence ("You will join Ganit on {date of joinig} at Chennai and your
  // position is ..."). Swap it for the city entered on the form.
  //
  // The word also appears twice in the letterhead address, but that lives in
  // word/header1.xml which is copied through untouched, so only the posting
  // reference is affected. The match is still anchored to the sentence to
  // keep it unambiguous.
  xml = replacePostingCity(xml, formData.posting);

  xml = fillPositionalPlaceholders(xml, [
    formatNumber(ctcAmount),
    formatNumber(breakdown.fixed.basic.monthly),
    formatNumber(breakdown.fixed.basic.yearly),
    formatNumber(breakdown.fixed.hra.monthly),
    formatNumber(breakdown.fixed.hra.yearly),
    formatNumber(breakdown.fixed.conveyance.monthly),
    formatNumber(breakdown.fixed.conveyance.yearly),
    formatNumber(breakdown.fixed.total.monthly),
    formatNumber(breakdown.fixed.total.yearly),
    formatNumber(breakdown.variable.yearly),
    formatNumber(breakdown.statutory.pf.monthly),
    formatNumber(breakdown.statutory.pf.yearly),
    formatNumber(breakdown.statutory.gratuity.monthly),
    formatNumber(breakdown.statutory.gratuity.yearly),
    formatNumber(breakdown.statutory.total.monthly),
    formatNumber(breakdown.statutory.total.yearly)
  ]);

  // Added after the positional {} placeholders are filled: these rows are
  // clones carrying real values, so inserting them earlier would shift the
  // placeholder ordering the compensation table depends on.
  const retentionAmount = breakdown.optional.retention.yearly;
  const relocationAmount = breakdown.optional.relocation.yearly;

  xml = addOptionalBenefitRows(xml, [
    { label: 'Retention Pay *', amount: retentionAmount },
    { label: 'Relocation Bonus **', amount: relocationAmount }
  ]);

  xml = addOptionalBenefitFootnotes(xml, [
    ...(retentionAmount > 0 ? [RETENTION_FOOTNOTE] : []),
    ...(relocationAmount > 0 ? [RELOCATION_FOOTNOTE] : [])
  ]);

  xml = fillInsuranceAmounts(xml, [
    formatNumber(breakdown.insurance.medical),
    formatNumber(breakdown.insurance.personalAccident),
    formatNumber(breakdown.insurance.term)
  ]);

  // Filling the offer sentence required merging its runs, which flattened its
  // styling. Put the emphasis back.
  xml = restoreOfferSentenceEmphasis(xml, {
    role: formData.role,
    compensationPhrase: `INR ${formatNumber(ctcAmount)}/- (Rupees ${numberToWordsTitleCase(Math.floor(ctcAmount))} Only).`,
    joiningDate: formatDateLong(formData.doj),
    city: String(formData.posting || '').trim()
  });

  // The confidentiality line is hardcoded once per page in the body, so an
  // overflow page would be left without it. Move it into the real footer,
  // where Word repeats it on every page and numbers it correctly.
  xml = moveHeaderDateLeft(xml);
  xml = removeHardcodedPageFooters(xml);

  const footerPart = archive[FOOTER_PART];
  if (footerPart) {
    archive[FOOTER_PART] = strToU8(addFooterPageNumbers(strFromU8(footerPart)));
  }

  archive[DOCUMENT_PART] = strToU8(xml);

  const blob = new Blob([zipSync(archive)], {
    type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
  });

  downloadBlob(blob, `offer-letter-${formData.name.replace(/\s+/g, '-')}.docx`);
}
