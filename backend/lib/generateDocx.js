import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType } from 'docx';

function labeledRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({ children: [new Paragraph(label)] }),
      new TableCell({ children: [new Paragraph(value)] })
    ]
  });
}

function compensationRow(label, monthly, yearly) {
  return new TableRow({
    children: [
      new TableCell({ children: [new Paragraph(label)] }),
      new TableCell({ children: [new Paragraph(`₹ ${monthly}`)] }),
      new TableCell({ children: [new Paragraph(`₹ ${yearly}`)] })
    ]
  });
}

/**
 * Builds a .docx buffer covering the same content as the PDF:
 * candidate/offer details, compensation breakdown table (with optional
 * retention/relocation lines), and insurance coverage.
 */
export async function generateDocx(values, flags) {
  const children = [
    new Paragraph({ text: 'OFFER LETTER', heading: HeadingLevel.TITLE }),
    new Paragraph(`Ref: ${values.REF_NUMBER}    Date: ${values.OFFER_DATE}`),
    new Paragraph(''),
    new Paragraph(`Dear ${values.NAME},`),
    new Paragraph(
      `We are pleased to offer you a full-time role as ${values.ROLE} at Ganit Business Solutions Pvt. Ltd. ` +
      `Your potential annual Compensation of INR ${values.CTC_NUM} (${values.CTC_WORDS}). ` +
      `You will join Ganit on ${values.DOJ} and your position is work from ${values.POSTING} and not remote.`
    ),
    new Paragraph(''),
    new Paragraph({ text: 'Annexure 2 - Compensation Structure', heading: HeadingLevel.HEADING_1 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        labeledRow('Name', values.NAME),
        labeledRow('Date of Joining', values.DOJ),
        labeledRow('Designation', values.ROLE),
        labeledRow('CTC (Per Annum) ₹', values.CTC_NUM)
      ]
    }),
    new Paragraph(''),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        new TableRow({
          children: [
            new TableCell({ children: [new Paragraph('Component')] }),
            new TableCell({ children: [new Paragraph('Monthly')] }),
            new TableCell({ children: [new Paragraph('Yearly')] })
          ]
        }),
        compensationRow('Basic Pay', values.BASIC_PAY_M, values.BASIC_PAY_Y),
        compensationRow('House Rent Allowance', values.HRA_M, values.HRA_Y),
        compensationRow('Conveyance Allowance', values.CONVEYANCE_M, values.CONVEYANCE_Y),
        compensationRow('Total Fixed Pay Component', values.TOTAL_FIXED_M, values.TOTAL_FIXED_Y),
        compensationRow('Variable Pay #', '', values.VARIABLE_PAY),
        compensationRow('PF Employer Contribution', values.PF_M, values.PF_Y),
        compensationRow('Gratuity Benefits', values.GRATUITY_M, values.GRATUITY_Y),
        compensationRow('Total Benefit Component', values.TOTAL_BENEFIT_M, values.TOTAL_BENEFIT_Y)
      ]
    })
  ];

  if (flags.RETENTION_PAY_LINE) {
    children.push(new Paragraph(''));
    children.push(new Paragraph(`Retention Pay* (Yearly): ₹ ${values.RETENTION_PAY_AMOUNT}`));
  }

  if (flags.RELOCATION_BONUS_LINE) {
    children.push(new Paragraph(''));
    children.push(new Paragraph(`Relocation Bonus** (Yearly): ₹ ${values.RELOCATION_BONUS_AMOUNT}`));
  }

  children.push(new Paragraph(''));
  children.push(new Paragraph({ text: 'Insurance Coverage', heading: HeadingLevel.HEADING_2 }));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      labeledRow('Medical Insurance', `₹ ${values.MEDICAL_INSURANCE}`),
      labeledRow('Personal Accident Insurance', `₹ ${values.PERSONAL_ACCIDENT_INSURANCE}`),
      labeledRow('Term Insurance', `₹ ${values.TERM_INSURANCE}`)
    ]
  }));

  if (flags.RETENTION_PAY_LINE) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: '* Retention pay will be prorated & paid during June & December payroll. Any payout must be reimbursed if you resign within 12 months from the date of joining.',
        size: 16
      })]
    }));
  }

  if (flags.RELOCATION_BONUS_LINE) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: '** Relocation bonus will be paid during the subsequent payroll after employees complete 1 month from date of joining and will be recovered if you resign within 12 months from the date of joining.',
        size: 16
      })]
    }));
  }

  const doc = new Document({ sections: [{ children }] });
  return Packer.toBuffer(doc);
}
