import templateUrl from '../assets/offer-letter-template.docx';

/**
 * Reads the Ganit offer letter template as raw bytes.
 *
 * The production build inlines the .docx into the page as a data: URI, because
 * the app ships as a single .html file opened over file:// — a sibling
 * template file would have to be distributed alongside it, and could not be
 * fetched from an opaque file:// origin anyway. `npm run dev` still serves the
 * template as an ordinary URL, so both forms are handled here.
 *
 * The data: URI is decoded with atob() rather than passed to fetch(). Decoding
 * is synchronous and cannot be refused, whereas fetching a data: URL from a
 * file:// page relies on browser behaviour this app does not need to bet on.
 */
export async function loadTemplateBytes() {
  if (templateUrl.startsWith('data:')) {
    const binary = atob(templateUrl.slice(templateUrl.indexOf(',') + 1));
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  }

  const response = await fetch(templateUrl);
  if (!response.ok) {
    throw new Error(`Could not load the Word template (HTTP ${response.status})`);
  }
  return new Uint8Array(await response.arrayBuffer());
}
