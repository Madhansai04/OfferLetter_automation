/**
 * Assembles the folder that gets handed to an HR machine.
 *
 * `vite build` already produces one self-contained index.html; this only gives
 * it a human-readable name and drops the one-time installer beside it, so the
 * whole handover is "copy this folder, run Setup.ps1 once".
 */
import { copyFileSync, mkdirSync, readFileSync, rmSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const APP_NAME = 'Ganit Offer Letter';
const OUT = 'release';

const built = 'dist/index.html';
if (!statSync(built, { throwIfNoEntry: false })) {
  throw new Error(`${built} not found — run "npm run build" first.`);
}

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const appFile = join(OUT, `${APP_NAME}.html`);
copyFileSync(built, appFile);
copyFileSync('launcher/Setup.ps1', join(OUT, 'Setup.ps1'));

writeFileSync(join(OUT, 'READ ME FIRST.txt'), [
  `${APP_NAME}`,
  '='.repeat(APP_NAME.length),
  '',
  'TO INSTALL (once per computer)',
  '',
  '  1. Copy this whole folder onto the computer.',
  '  2. Right-click "Setup.ps1" and choose "Run with PowerShell".',
  '  3. A "' + APP_NAME + '" icon appears on the Desktop.',
  '',
  'TO USE',
  '',
  '  Double-click the "' + APP_NAME + '" icon on the Desktop.',
  '  Fill in the candidate details and click "Download Offer Letter".',
  '',
  'GOOD TO KNOW',
  '',
  '  - Nothing is installed system-wide and no admin rights are needed.',
  '  - The app works completely offline. No candidate data ever leaves',
  '    the computer.',
  '  - To be asked WHERE to save each letter instead of it going straight',
  '    to the Downloads folder, open Edge, go to Settings > Downloads, and',
  '    turn on "Ask me what to do with each download".',
  '',
  'TO REMOVE',
  '',
  '  Right-click "Setup.ps1", choose "Run with PowerShell", but first edit',
  '  the shortcut to add -Uninstall. Or ask IT to run:',
  '     powershell -ExecutionPolicy Bypass -File Setup.ps1 -Uninstall',
  '',
].join('\r\n'));

const kb = (p) => Math.round(statSync(p).size / 1024);
console.log(`\n  ${OUT}/`);
console.log(`    ${APP_NAME}.html   ${kb(appFile)} KB   <- the whole app, one file`);
console.log(`    Setup.ps1          ${kb(join(OUT, 'Setup.ps1'))} KB   <- run once per machine`);
console.log(`    READ ME FIRST.txt  ${kb(join(OUT, 'READ ME FIRST.txt'))} KB`);
console.log('\n  Ready to hand over.\n');
