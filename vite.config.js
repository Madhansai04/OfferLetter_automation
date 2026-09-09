import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// The build ships as ONE self-contained .html file that HR staff open by
// double-clicking — no server, no install, no Node on their machine.
//
// That imposes two constraints. Every asset has to be inlined into the page,
// since a sibling .js or .docx file would have to be distributed alongside it.
// And no URL may be rooted at "/", because the page is loaded over file://
// where "/" resolves to the drive root rather than the app directory.
export default defineConfig({
  base: './',
  // .docx is not one of Vite's known asset types, so it needs declaring
  // before the template can be imported and inlined.
  assetsInclude: ['**/*.docx'],
  plugins: [react(), viteSingleFile()],
  build: {
    // Default is 4 KB, which would leave the 90 KB template as a separate
    // file. Everything must become a data: URI instead.
    assetsInlineLimit: 10 * 1024 * 1024,
  },
})
