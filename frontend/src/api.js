export async function fetchPreview(formData) {
  const res = await fetch('/api/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  const body = await res.json();
  if (!res.ok) {
    const error = new Error('Preview request failed');
    error.fieldErrors = body.errors;
    throw error;
  }
  return body;
}

export async function fetchGeneratedDocuments(formData) {
  const res = await fetch('/api/generate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  });

  if (!res.ok) {
    const body = await res.json();
    const error = new Error('Generate request failed');
    error.fieldErrors = body.errors;
    throw error;
  }

  return res.blob();
}
