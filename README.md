# Ganit Offer Letter Generator

A small, fully client-side tool for producing Ganit offer letters. Fill in a
candidate's details, watch the compensation breakdown update as you type, and
download a completed Word document. No backend, no server, no database.
It ships to HR as one double-clickable `.html` file — see **Shipping it to
HR** below.

## Shipping it to HR

The app is handed over as a single self-contained `.html` file. There is no
server, no install and no Node on the target machine — the JavaScript, CSS,
logo and the .docx template are all inlined into the page as data: URIs, so
it runs straight off `file://`.

```bash
npm run package
```

That produces `release/`:

| File | Purpose |
| --- | --- |
| `Ganit Offer Letter.html` | the entire app, ~375 KB |
| `Setup.ps1` | run once per machine |
| `READ ME FIRST.txt` | instructions for whoever installs it |

Copy that folder to the machine and right-click `Setup.ps1` → **Run with**
**PowerShell**. It installs to `%LOCALAPPDATA%GanitOffer Letter Generator`
(no admin rights), rebuilds the Ganit logo into an `.ico`, and creates Desktop
and Start-menu shortcuts that launch Edge with `--app=`, giving a plain window
with no address bar or tabs. To remove it:

```powershell
powershell -ExecutionPolicy Bypass -File Setup.ps1 -Uninstall
```

### Where letters get saved

`downloadBlob.js` tries `showSaveFilePicker()` first so HR can choose a folder
per letter, and falls back to a normal download if the browser refuses it —
which it may, since a `file://` page has an opaque origin. Where the fallback
is used, turning on **Ask me what to do with each download** in Edge's
download settings gives the same prompt.

## Developing
## Running locally

```bash
npm install
npm run dev
```

Open the URL Vite prints (usually http://localhost:5173), fill in the form,
and click **Download Offer Letter**.

## How it works

- `src/assets/offer-letter-template.docx` — the Ganit offer letter template,
  used exactly as supplied.
- `src/utils/docxGenerator.js` — reads that template in the browser,
  rewrites `word/document.xml`, and repackages the archive. Headers,
  footers, images, fonts, styles and page layout carry through untouched,
  because the original file is edited rather than a new document being
  built from scratch.
- `src/utils/calculator.js` — derives the CTC breakdown (Basic, HRA,
  Conveyance, Variable, PF, Gratuity) and the insurance tier. Ported from
  `docs/CTC Calculator Final 2.xlsm` and checked against that workbook's
  own figures.
- `src/components/` — the form and the live preview.

## Template notes

The generator has to work around a few things in the template, all documented
in `docxGenerator.js`:

- Word can split a placeholder across runs, so `{name}` may be stored as
  `{na` + `me}`. Runs are merged before substitution where that happens.
- Annexure 2's compensation table uses bare `{}` placeholders with no names,
  so they are filled **in document order**. If a row is added, removed or
  reordered in the .docx, that order must be updated to match.
- Annexure 2's "Date of Joining" cell reuses `{date}`, the same token the
  page-1 header uses for the offer date, so it is filled first to keep the
  two apart.
- Retention Pay and Relocation Bonus have no rows in the template. When an
  amount is entered, a row is cloned from the Variable Pay row and the
  matching footnote is added below the table.

## Testing

```bash
npm test
```

## Notes

- Everything runs in the browser. No data leaves the machine.
- The CTC percentages and insurance amounts in `src/utils/calculator.js`
  come from the Ganit workbook and the tiers confirmed by HR.
- Output is Word only. Producing a PDF from the Word file would need a
  converter (LibreOffice or a cloud service) running at download time,
  which would mean either a server to maintain or a per-machine install —
  so the letter is issued as an editable .docx instead.
