import { Document, Packer, Paragraph, TextRun, Table, TableRow, TableCell, HeadingLevel, WidthType } from 'docx';
import { formatCurrency, formatDate, numberToWords } from './formatters';

function labeledRow(label, value) {
  return new TableRow({
    children: [
      new TableCell({ children: [new Paragraph(label)] }),
      new TableCell({ children: [new Paragraph(String(value))] })
    ]
  });
}

function compensationRow(label, monthly, yearly) {
  return new TableRow({
    children: [
      new TableCell({ children: [new Paragraph(label)] }),
      new TableCell({ children: [new Paragraph(formatCurrency(monthly))] }),
      new TableCell({ children: [new Paragraph(formatCurrency(yearly))] })
    ]
  });
}

// For components quoted as a single annual amount (variable pay,
// retention, relocation) rather than split monthly/yearly.
function singleAmountRow(label, amount) {
  return new TableRow({
    children: [
      new TableCell({ children: [new Paragraph(label)] }),
      new TableCell({
        columnSpan: 2,
        children: [new Paragraph(formatCurrency(amount))]
      })
    ]
  });
}

/**
 * Builds an editable .docx offer letter with the same content as the PDF
 * (candidate/offer details, compensation breakdown, optional retention and
 * relocation lines, insurance coverage), so HR can hand-correct anything
 * afterward. Runs entirely client-side, no backend involved.
 */
export async function generateOfferDocx(formData, breakdown) {
  const year = new Date().getFullYear();
  const ctcAmount = formData.ctc * 100000;

  const children = [
    new Paragraph({ text: 'OFFER LETTER', heading: HeadingLevel.TITLE }),
    new Paragraph(`Ref: GANIT/HR/APPT/${year}    Date: ${formatDate(new Date())}`),
    new Paragraph(''),
    new Paragraph(`Dear ${formData.name},`),
    new Paragraph(
      `We are pleased to offer you a full-time role as ${formData.role} at Ganit Business Solutions Pvt. Ltd. ` +
      `Your potential annual Compensation of ${formatCurrency(ctcAmount)} (${numberToWords(Math.floor(ctcAmount))}). ` +
      `You will join Ganit on ${formatDate(formData.doj)} and your position is work from ${formData.posting} and not remote.`
    ),
    new Paragraph(''),
    new Paragraph({ text: 'Annexure 2 - Compensation Structure', heading: HeadingLevel.HEADING_1 }),
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      rows: [
        labeledRow('Name', formData.name),
        labeledRow('Date of Joining', formatDate(formData.doj)),
        labeledRow('Designation', formData.role),
        labeledRow('CTC (Per Annum)', formatCurrency(ctcAmount))
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
        compensationRow('Basic Pay', breakdown.fixed.basic.monthly, breakdown.fixed.basic.yearly),
        compensationRow('House Rent Allowance', breakdown.fixed.hra.monthly, breakdown.fixed.hra.yearly),
        compensationRow('Conveyance Allowance', breakdown.fixed.conveyance.monthly, breakdown.fixed.conveyance.yearly),
        compensationRow('Total Fixed Pay Component', breakdown.fixed.total.monthly, breakdown.fixed.total.yearly),
        singleAmountRow('Variable Pay #', breakdown.variable.yearly),
        compensationRow('PF Employer Contribution', breakdown.statutory.pf.monthly, breakdown.statutory.pf.yearly),
        compensationRow('Gratuity Benefits', breakdown.statutory.gratuity.monthly, breakdown.statutory.gratuity.yearly),
        compensationRow('Total Benefit Component', breakdown.statutory.total.monthly, breakdown.statutory.total.yearly)
      ]
    })
  ];

  if (breakdown.optional.retention.show) {
    children.push(new Paragraph(''));
    children.push(new Paragraph(`Retention Pay* (Yearly): ${formatCurrency(breakdown.optional.retention.yearly)}`));
  }

  if (breakdown.optional.relocation.show) {
    children.push(new Paragraph(''));
    children.push(new Paragraph(`Relocation Bonus** (Yearly): ${formatCurrency(breakdown.optional.relocation.yearly)}`));
  }

  children.push(new Paragraph(''));
  children.push(new Paragraph({ text: 'Insurance Coverage', heading: HeadingLevel.HEADING_2 }));
  children.push(new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows: [
      labeledRow('Medical Insurance', formatCurrency(breakdown.insurance.medical)),
      labeledRow('Personal Accident Insurance', formatCurrency(breakdown.insurance.personalAccident)),
      labeledRow('Term Insurance', formatCurrency(breakdown.insurance.term))
    ]
  }));

  if (breakdown.optional.retention.show) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: '* Retention pay will be prorated & paid during June & December payroll. Any payout must be reimbursed if you resign within 12 months from the date of joining.',
        size: 16
      })]
    }));
  }

  if (breakdown.optional.relocation.show) {
    children.push(new Paragraph({
      children: [new TextRun({
        text: '** Relocation bonus will be paid during the subsequent payroll after employees complete 1 month from date of joining and will be recovered if you resign within 12 months from the date of joining.',
        size: 16
      })]
    }));
  }

  const doc = new Document({ sections: [{ children }] });
  const blob = await Packer.toBlob(doc);

  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `offer-letter-${formData.name.replace(/\s+/g, '-')}.docx`;
  link.click();
  URL.revokeObjectURL(url);
}
