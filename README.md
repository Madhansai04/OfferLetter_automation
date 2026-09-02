# Ganit Offer Letter Generator

A simple, fully client-side tool for generating Ganit offer letters from the
real company PDF template. Fill in a candidate's details, see the
compensation breakdown update live, and download a filled PDF and/or an
editable Word document — no backend, no server, no database.

## Running locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (typically http://localhost:5173), fill in the
form, and click "Download PDF" or "Download Word" to get the filled offer
letter.

## How it works

- `public/offer-letter-template.pdf` — the real Ganit offer letter PDF,
  kept exactly as provided (logo, layout, wording, formatting untouched).
- `src/utils/calculator.js` — computes the CTC breakdown (Basic/HRA/
  Conveyance/Variable/PF/Gratuity) and insurance tier from the entered CTC.
- `src/utils/pdfGenerator.js` — loads the template PDF in the browser via
  `pdf-lib`, covers each `{{PLACEHOLDER}}` region with a white rectangle at
  its exact measured position, and draws the real value in its place, then
  triggers a download. Long values auto-shrink their font size to avoid
  overlapping neighboring static text.
- `src/utils/docxGenerator.js` — builds an equivalent editable Word document
  via the `docx` library, so HR can hand-correct anything after generation.
- `src/components/` — the form and live preview UI.

## Notes

- Everything runs in your browser. No data leaves your machine.
- CTC breakdown percentages and default insurance amounts in
  `src/utils/calculator.js` are placeholder values pending the real numbers
  from Ganit HR.
- The PDF's underlying text layer still contains the original
  `{{PLACEHOLDER}}` tokens beneath the covered/redrawn values (a known
  limitation of overlaying text onto an existing PDF) — copying text or
  using a screen reader on the generated PDF may show both layers
  interleaved. What you see when viewing or printing the PDF is clean.
- Add `public/ganit-logo.svg` to show the Ganit logo in the app's header
  (the PDF itself already has the logo baked in from the template).
