# Ganit Offer Letter Generator

A simple local tool for generating Ganit offer letters (PDF + Word) from the
real company template. Fill in a candidate's details, see the compensation
breakdown update live, and download both files.

## Running locally

Two terminals, from the repo root:

```bash
npm run dev:backend   # starts the API on port 3001
npm run dev:frontend  # starts the form on http://localhost:5173
```

Open the URL Vite prints (typically http://localhost:5173), fill in the
form, and click "Generate Offer Letter" to download a zip containing the
PDF and Word versions.

## Running backend tests

```bash
npm run test:backend
```

## Notes

- No login, database, or cloud storage — everything runs locally.
- The reference number counter resets if you restart the backend.
- CTC breakdown percentages and default insurance amounts in
  `backend/config/compensation.js` are placeholder values pending the real
  numbers from Ganit HR.
- Retention Pay / Relocation Bonus support an "Auto" formula mode in the
  form, but that formula hasn't been provided yet — use "Manual" entry for
  now.
