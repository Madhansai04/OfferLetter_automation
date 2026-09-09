/**
 * Saves a Blob to the user's machine, asking where to put it when the browser
 * allows it.
 *
 * HR wants to choose the folder for each letter rather than fishing files out
 * of Downloads, so showSaveFilePicker() is tried first. It is not always
 * available: it needs a secure context, and the app ships as a single .html
 * opened over file://, whose origin is opaque. Rather than detect that up
 * front, the call is attempted and the anchor fallback runs if it is refused.
 *
 * A cancelled picker is NOT a failure. Falling back there would save the file
 * anyway — the opposite of what the user just asked for — so AbortError
 * returns quietly and nothing is written.
 */
export async function downloadBlob(blob, filename) {
  if (typeof window.showSaveFilePicker === 'function') {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: filename,
        types: [{
          description: 'Word document',
          accept: {
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
          },
        }],
      });
      const writable = await handle.createWritable();
      await writable.write(blob);
      await writable.close();
      return;
    } catch (error) {
      if (error.name === 'AbortError') return;
      // Anything else — SecurityError on an opaque origin, a lost user
      // gesture, an unsupported build — means the picker is unusable here.
      // Fall through to the anchor, which works everywhere.
    }
  }

  // The anchor must be in the document before it is clicked. Browsers ignore a
  // download click on a detached element — Chrome silently does nothing, with
  // no error raised — so creating the link and calling click() without
  // appending it first produces a button that appears to work but never saves.
  //
  // The object URL is revoked on the next tick rather than immediately,
  // because revoking it in the same turn can cancel a download that has not
  // started yet.
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
