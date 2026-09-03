import {
  Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell,
  WidthType, AlignmentType, HeadingLevel, PageBreak, BorderStyle
} from 'docx';
import { formatCurrency, formatDateSlashes, formatDateLong, numberToWords } from './formatters';

const GANIT_BLUE = '1A00D9';
const GANIT_ORANGE = 'FE6E06';
const GREY = 'A6A6A6';

const COMPANY_ADDRESS = [
  'Geeyam Tech Square,',
  '57, Estate Main Rd, Industrial Estate,',
  'Perungudi, Chennai 600096'
];

function heading(text) {
  return new Paragraph({
    spacing: { before: 240, after: 120 },
    children: [new TextRun({ text, bold: true, color: GANIT_BLUE, size: 24 })]
  });
}

function body(text, opts = {}) {
  return new Paragraph({
    spacing: { after: 120 },
    alignment: opts.align,
    children: [new TextRun({ text, size: 20, ...opts.run })]
  });
}

function bullet(boldPart, rest) {
  return new Paragraph({
    bullet: { level: 0 },
    spacing: { after: 80 },
    children: [
      new TextRun({ text: boldPart, bold: true, italics: true, size: 20 }),
      new TextRun({ text: rest, size: 20 })
    ]
  });
}

function numbered(index, boldPart, rest) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({ text: `${index}. `, size: 20 }),
      new TextRun({ text: boldPart, bold: true, size: 20 }),
      new TextRun({ text: rest, size: 20 })
    ]
  });
}

function letterhead() {
  return [
    new Paragraph({
      alignment: AlignmentType.RIGHT,
      spacing: { after: 0 },
      children: COMPANY_ADDRESS.flatMap((line, i) => [
        ...(i > 0 ? [new TextRun({ break: 1 })] : []),
        new TextRun({ text: line, size: 18, color: '333333' })
      ])
    }),
    new Paragraph({ spacing: { after: 120 }, children: [] })
  ];
}

function footer(pageNumber) {
  return new Paragraph({
    alignment: AlignmentType.RIGHT,
    spacing: { before: 240 },
    border: { top: { style: BorderStyle.SINGLE, size: 4, color: 'DDDDDD' } },
    children: [
      new TextRun({ text: 'Private and Confidential ', size: 16, color: GREY }),
      new TextRun({ text: '| ', size: 16, color: GANIT_ORANGE }),
      new TextRun({ text: `Page ${pageNumber} of 4`, size: 16, color: GREY })
    ]
  });
}

function cell(children, opts = {}) {
  return new TableCell({
    columnSpan: opts.columnSpan,
    children: Array.isArray(children) ? children : [children]
  });
}

function labeledRow(label, value) {
  return new TableRow({
    children: [
      cell(new Paragraph({ children: [new TextRun({ text: label, size: 20 })] })),
      cell(new Paragraph({ children: [new TextRun({ text: String(value), size: 20 })] }))
    ]
  });
}

function amountRow(label, monthly, yearly, opts = {}) {
  const make = (t) => new Paragraph({
    children: [new TextRun({ text: t, size: 20, bold: opts.bold })]
  });
  return new TableRow({
    children: [cell(make(label)), cell(make(monthly)), cell(make(yearly))]
  });
}

// Variable pay, retention and relocation are quoted as one annual amount,
// so the value spans the monthly and yearly columns.
function singleAmountRow(label, amount, opts = {}) {
  const make = (t) => new Paragraph({
    children: [new TextRun({ text: t, size: 20, bold: opts.bold })]
  });
  return new TableRow({
    children: [cell(make(label)), cell(make(amount), { columnSpan: 2 })]
  });
}

function sectionRow(label) {
  return new TableRow({
    children: [
      cell(
        new Paragraph({
          alignment: AlignmentType.CENTER,
          children: [new TextRun({ text: label, bold: true, size: 20 })]
        }),
        { columnSpan: 3 }
      )
    ]
  });
}

function fullWidthTable(rows) {
  return new Table({ width: { size: 100, type: WidthType.PERCENTAGE }, rows });
}

/**
 * Builds an editable .docx of the complete offer letter — all four pages of
 * the template's content: the letterhead and offer, mission/culture,
 * signature and acceptance sections, Annexure 1's terms and conditions, and
 * Annexure 2's compensation structure.
 *
 * This mirrors the letter's *content*, not its exact visual design: the
 * template's logo, accent bar and precise typography live inside the PDF and
 * cannot be reproduced byte-for-byte in Word. The point of this file is that
 * HR can edit it; the PDF remains the pixel-accurate version.
 */
export async function generateOfferDocx(formData, breakdown) {
  const today = new Date();
  const ctcAmount = formData.ctc * 100000;

  // ---------------------------------------------------------------- page 1
  const page1 = [
    ...letterhead(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'OFFER LETTER', bold: true, color: GANIT_BLUE, size: 40 })]
    }),

    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `Ref: GANIT/HR/APPT/${today.getFullYear()}`, size: 20, color: GREY }),
        new TextRun({ text: '\t\t\t', size: 20 }),
        new TextRun({ text: `Date: ${formatDateSlashes(today)}`, size: 20, color: GREY })
      ]
    }),

    fullWidthTable([
      new TableRow({
        children: [
          cell(new Paragraph({ children: [new TextRun({ text: 'Name', size: 18, color: GREY })] })),
          cell(new Paragraph({ children: [new TextRun({ text: 'Email', size: 18, color: GREY })] })),
          cell(new Paragraph({ children: [new TextRun({ text: 'Contact', size: 18, color: GREY })] }))
        ]
      }),
      new TableRow({
        children: [
          cell(new Paragraph({ children: [new TextRun({ text: formData.name, size: 20 })] })),
          cell(new Paragraph({ children: [new TextRun({ text: formData.email, size: 20 })] })),
          cell(new Paragraph({ children: [new TextRun({ text: formData.phone, size: 20 })] }))
        ]
      })
    ]),

    new Paragraph({ spacing: { after: 200 }, children: [] }),
    body(`Dear ${formData.name},`),

    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'Congratulations', bold: true, color: GANIT_BLUE, size: 20 }),
        new TextRun({ text: '. Welcome to the exciting world of ', color: GANIT_BLUE, size: 20 }),
        new TextRun({ text: 'Data and AI!', bold: true, color: GANIT_ORANGE, size: 20 })
      ]
    }),

    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'We are pleased to offer you a full-time role as ', size: 20 }),
        new TextRun({ text: formData.role, bold: true, size: 20 }),
        new TextRun({ text: ' at Ganit Business Solutions Pvt. Ltd. Your potential annual Compensation of ', size: 20 }),
        // formatCurrency already renders the rupee symbol, so no "INR" prefix.
        new TextRun({ text: formatCurrency(ctcAmount), bold: true, size: 20 }),
        new TextRun({ text: ` (${numberToWords(Math.floor(ctcAmount))}). You will join Ganit on `, size: 20 }),
        new TextRun({ text: formatDateLong(formData.doj), bold: true, size: 20 }),
        new TextRun({ text: ' and your position is work from ', size: 20 }),
        new TextRun({ text: formData.posting, bold: true, size: 20 }),
        new TextRun({ text: ' and not remote.', size: 20 })
      ]
    }),

    body(
      'At Ganit you are expected to operate with the highest degree of Integrity, efficiency and ' +
      "responsibility. We are fully confident that you will add tremendous value through your role and " +
      "strengthen Ganit's growth."
    ),

    heading('Our Mission'),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: 'Maximize ', italics: true, size: 20 }),
        new TextRun({ text: 'decision velocity', bold: true, italics: true, color: GANIT_BLUE, size: 20 }),
        new TextRun({ text: ' and ', italics: true, size: 20 }),
        new TextRun({ text: 'minimize decision risk.', bold: true, italics: true, color: GANIT_ORANGE, size: 20 })
      ]
    }),
    body(
      'We partner with business leaders to give their data, a voice. We partner with them to discover, ' +
      'frame and solve problems across four key quadrants: descriptive, diagnostic, predictive and prescriptive.'
    ),

    heading('Our Culture'),
    body('Our culture is about behaviors and not buzzwords.'),
    bullet('We are yellow color blind', ': To us there is no yellow light, its either red or green.'),
    bullet('We punch above our weight', ': We take challenges beyond our comfort zone.'),
    bullet('To us, Attitude>Aptitude', ': Our team grows on attitude and drive rather than skills.'),
    bullet('Maximize Vocalness, minimize hierarchy', ': We follow flat structure to reduce bureaucracy.'),
    bullet('We keep our small promises', ': We build trust by delivering consistently on our small promises.'),

    heading("What's exciting at Ganit"),
    new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "You aren't just filling a position; you are its architect.", size: 20 })] }),
    new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: 'Artificial Intelligence is our first language and the foundation of every solution we build.', size: 20 })] }),
    new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: 'We champion a flat hierarchy to foster talent to have a fast-track career progression.', size: 20 })] }),
    new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: 'You will collaborate directly with enterprise leaders to influence high-stakes decision-making', size: 20 })] }),

    footer(1),
    new Paragraph({ children: [new PageBreak()] })
  ];

  // ---------------------------------------------------------------- page 2
  const page2 = [
    ...letterhead(),

    body(
      'Terms and Conditions applicable to this offer are stated in Annexure 1 and break up of your ' +
      'potential compensation in Annexure 2. Both Annexures are integral part of this offer letter. ' +
      'Please sign this letter within five calendar days to confirm your acceptance. Reach out to our ' +
      'Talent Partner for revalidating this letter, if you could not accept in time.'
    ),
    body('We welcome you to Ganit and wish you a bright & prosperous career with us.'),

    new Paragraph({
      spacing: { before: 200, after: 480 },
      children: [new TextRun({ text: 'Yours Sincerely,', bold: true, color: GANIT_BLUE, size: 20 })]
    }),
    new Paragraph({
      spacing: { after: 0 },
      children: [new TextRun({ text: 'Ashok Harwani', bold: true, color: GANIT_BLUE, size: 20 })]
    }),
    new Paragraph({
      spacing: { after: 480 },
      children: [new TextRun({ text: 'Co-Founder & Chief Growth Officer', bold: true, color: GANIT_BLUE, size: 20 })]
    }),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 200 },
      children: [new TextRun({ text: 'Acceptance', bold: true, size: 22 })]
    }),
    body(
      'I hereby accept employment with Ganit. I have read the offer completely and accept all the terms ' +
      'and conditions mentioned. I have understood and accepted the compensation details as explained ' +
      'in Annexure-1 and will keep it confidential. I accept that I have provided correct and updated ' +
      'personal information till now and will provide any additional information as and when required ' +
      'by the organization.'
    ),
    new Paragraph({ spacing: { before: 360, after: 360 }, children: [new TextRun({ text: 'Name:', bold: true, size: 20 })] }),
    new Paragraph({ spacing: { after: 360 }, children: [new TextRun({ text: 'Signature:', bold: true, size: 20 })] }),
    new Paragraph({ spacing: { after: 120 }, children: [new TextRun({ text: 'Date:', bold: true, size: 20 })] }),

    footer(2),
    new Paragraph({ children: [new PageBreak()] })
  ];

  // ---------------------------------------------------------------- page 3
  const page3 = [
    ...letterhead(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: 'Annexure 1 - Terms & Conditions', bold: true, underline: {}, size: 22 })]
    }),

    numbered(1, 'Probation Period', ": You will be under 6 months' probation period and will be confirmed in writing based on your performance and contributions."),
    numbered(2, 'Leave', ": You shall be entitled to 32 days of leave, comprising 22 paid leave days and 10 company's declared holidays."),
    numbered(3, 'Annual Appraisal', ': Ganit follows calendar year appraisal process (January to December).'),
    numbered(4, 'Background Check', ": Candidates' employment with Ganit is conditional and subject to satisfactory background and reference checks in line with Company policy."),
    numbered(5, 'Notice for Separation', ": You will typically have to serve 30 days' notice during probation period and 90 days after confirmation. However, notice period requirement is subject to extant policy and business requirements. To ensure business continuity, a six-month commitment is required. If you decide to separate before expiry of this period, an amount of 10% of your Annual Fixed Pay will be payable by you as damages to cover business impact."),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: '6. From the day of joining, you will be governed and adhered to the ', size: 20 }),
        new TextRun({ text: 'Code of conduct', bold: true, size: 20 }),
        new TextRun({ text: ' Policies, and ', size: 20 }),
        new TextRun({ text: 'Confidentiality provisions', bold: true, size: 20 }),
        new TextRun({ text: '.', size: 20 })
      ]
    }),
    numbered(7, 'Minimum tenure commitment clause', ': To ensure business continuity, a six-month commitment is required. If you decide to separate before expiry of this period, 10% of your Annual Fixed Pay will be payable by you as damages to cover business impact.'),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: '8. ', size: 20 }),
        new TextRun({ text: 'Retention', bold: true, size: 20 })
      ]
    }),
    body(
      'As part of your appointment with Ganit, you agree to commit to a minimum period of one year ' +
      '(12 months) of employment from the date of joining.'
    ),
    new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: 'If you voluntarily resign before completing 12 months, you will be required to reimburse the company INR 1,00,000, to compensate for training and onboarding costs.', size: 20 })] }),
    new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: "However, if you leave due to medical reasons, or higher education, this clause may be waived at the company's discretion upon providing valid documentation.", size: 20 })] }),
    new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: 'If the company terminates your employment due to performance issues, code of conduct violations, or policy breaches, this clause will remain inapplicable, and no compensation will be owed by the company.', size: 20 })] }),
    new Paragraph({ bullet: { level: 0 }, spacing: { after: 80 }, children: [new TextRun({ text: 'If the company terminates employment for reasons other than misconduct or performance issues, the company will provide compensation in accordance with the statutory notice period.', size: 20 })] }),

    footer(3),
    new Paragraph({ children: [new PageBreak()] })
  ];

  // ---------------------------------------------------------------- page 4
  const compensationRows = [
    new TableRow({
      children: [
        cell(new Paragraph({ children: [] })),
        cell(new Paragraph({ children: [new TextRun({ text: 'Monthly', bold: true, size: 20 })] })),
        cell(new Paragraph({ children: [new TextRun({ text: 'Yearly', bold: true, size: 20 })] }))
      ]
    }),
    sectionRow('FIXED PAY'),
    amountRow('1  Basic Pay', formatCurrency(breakdown.fixed.basic.monthly), formatCurrency(breakdown.fixed.basic.yearly)),
    amountRow('2  House Rent Allowance', formatCurrency(breakdown.fixed.hra.monthly), formatCurrency(breakdown.fixed.hra.yearly)),
    amountRow('3  Conveyance Allowance', formatCurrency(breakdown.fixed.conveyance.monthly), formatCurrency(breakdown.fixed.conveyance.yearly)),
    amountRow('Total Fixed Pay Component', formatCurrency(breakdown.fixed.total.monthly), formatCurrency(breakdown.fixed.total.yearly), { bold: true }),
    sectionRow('VARIABLE'),
    singleAmountRow('4  Variable Pay #', formatCurrency(breakdown.variable.yearly))
  ];

  if (breakdown.optional.retention.show || breakdown.optional.relocation.show) {
    compensationRows.push(sectionRow('OPTIONAL BENEFITS'));
    if (breakdown.optional.retention.show) {
      compensationRows.push(singleAmountRow('Retention Pay *', formatCurrency(breakdown.optional.retention.yearly), { bold: true }));
    }
    if (breakdown.optional.relocation.show) {
      compensationRows.push(singleAmountRow('Relocation Bonus **', formatCurrency(breakdown.optional.relocation.yearly), { bold: true }));
    }
  }

  compensationRows.push(
    sectionRow('STATUTORY BENEFITS'),
    amountRow('5  PF Employer Contribution', formatCurrency(breakdown.statutory.pf.monthly), formatCurrency(breakdown.statutory.pf.yearly)),
    amountRow('6  Gratuity Benefits', formatCurrency(breakdown.statutory.gratuity.monthly), formatCurrency(breakdown.statutory.gratuity.yearly)),
    amountRow('Total Benefit Component', formatCurrency(breakdown.statutory.total.monthly), formatCurrency(breakdown.statutory.total.yearly), { bold: true })
  );

  const page4 = [
    ...letterhead(),

    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { after: 240 },
      children: [new TextRun({ text: 'Annexure 2 - Compensation Structure', bold: true, underline: {}, size: 22 })]
    }),

    fullWidthTable([
      labeledRow('Name', formData.name),
      labeledRow('Date of Joining', formatDateLong(formData.doj)),
      labeledRow('Designation', formData.role),
      labeledRow('CTC (Per Annum)', formatCurrency(ctcAmount))
    ]),

    new Paragraph({ spacing: { after: 200 }, children: [] }),
    fullWidthTable(compensationRows),

    new Paragraph({
      spacing: { before: 120, after: 60 },
      children: [new TextRun({ text: 'Salary heads are subject to government policies & tax will be apportioned accordingly.', italics: true, size: 18 })]
    }),
    new Paragraph({
      spacing: { after: 200 },
      children: [new TextRun({ text: '# Variable Pay will be paid yearly based on employee & company performance during Q1 of next calendar year.', italics: true, size: 18 })]
    }),

    body('Employees will be covered under the company sponsored Insurance coverage as mentioned below:'),
    fullWidthTable([
      new TableRow({
        children: [
          cell(new Paragraph({ children: [new TextRun({ text: 'Benefit', bold: true, size: 20 })] })),
          cell(new Paragraph({ children: [new TextRun({ text: 'Coverage', bold: true, size: 20 })] }))
        ]
      }),
      labeledRow('Medical Insurance', formatCurrency(breakdown.insurance.medical)),
      labeledRow('Personal Accident Insurance', formatCurrency(breakdown.insurance.personalAccident)),
      labeledRow('Term Insurance', formatCurrency(breakdown.insurance.term))
    ])
  ];

  if (breakdown.optional.retention.show) {
    page4.push(new Paragraph({
      spacing: { before: 160, after: 60 },
      children: [new TextRun({
        text: '* Retention pay will be prorated & paid during June & December payroll. Any payout must be reimbursed if you resign within 12 months from the date of joining.',
        size: 16
      })]
    }));
  }
  if (breakdown.optional.relocation.show) {
    page4.push(new Paragraph({
      spacing: { after: 60 },
      children: [new TextRun({
        text: '** Relocation bonus will be paid during the subsequent payroll after employees complete 1 month from date of joining and will be recovered if you resign within 12 months from the date of joining.',
        size: 16
      })]
    }));
  }

  page4.push(
    new Paragraph({
      alignment: AlignmentType.CENTER,
      spacing: { before: 240, after: 120 },
      children: [new TextRun({
        text: 'This offer & compensation is strictly confidential, you are advised not to discuss it with anyone.',
        bold: true,
        size: 20
      })]
    }),
    footer(4)
  );

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: 'Calibri', size: 20 } }
      }
    },
    sections: [{ children: [...page1, ...page2, ...page3, ...page4] }]
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `offer-letter-${formData.name.replace(/\s+/g, '-')}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}
