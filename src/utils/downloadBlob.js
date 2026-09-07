/**
 * Saves a Blob to the user's machine.
 *
 * The anchor must be in the document before it is clicked. Browsers ignore a
 * download click on a detached element — Chrome silently does nothing, with no
 * error raised — so creating the link and calling click() without appending it
 * first produces a button that appears to work but never saves a file.
 *
 * The object URL is revoked on the next tick rather than immediately, because
 * revoking it in the same turn can cancel a download that has not started yet.
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.style.display = 'none';

  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  setTimeout(() => URL.revokeObjectURL(url), 0);
}
