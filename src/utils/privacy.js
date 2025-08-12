// Simple privacy helpers for export redaction and PII detection

export const PII_KEYS = [
  'firstName','lastName','name','primaryPhone','secondaryPhone','phone','address','dob','email'
];

export function hasPII(value, depth = 0) {
  try {
    if (value == null) return false;
    if (depth > 4) return false; // cap recursion
    if (typeof value === 'string') {
      // Light heuristic: detect phone-like and email-like patterns
      if (/\b\d{3}[-.\s]?\d{3}[-.\s]?\d{4}\b/.test(value)) return true;
      if (/[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}/.test(value)) return true;
      return false;
    }
    if (Array.isArray(value)) return value.some(v => hasPII(v, depth + 1));
    if (typeof value === 'object') {
      for (const k of Object.keys(value)) {
        if (PII_KEYS.includes(k)) return true;
        if (hasPII(value[k], depth + 1)) return true;
      }
    }
    return false;
  } catch { return false; }
}

// Build a sanitized manifest for export (JSON/clipboard)
export function sanitizeManifestForExport(manifest, opts = {}) {
  const { includeComments = false } = opts;
  if (!manifest || typeof manifest !== 'object') return manifest;
  const meta = manifest.meta || {};
  const pickPassenger = (p) => {
    if (!p || typeof p !== 'object') return {};
    const base = {
      id: p.id,
      name: p.name || '',
      company: p.company || '',
      bodyWeight: p.bodyWeight || '',
      bagWeight: p.bagWeight || '',
      bagCount: p.bagCount || '',
      origin: p.origin || '',
      destination: p.destination || '',
      flightIndex: p.flightIndex || undefined
    };
    if (includeComments) base.comments = p.comments || '';
    return base;
  };
  return {
    meta: { ...meta },
    outbound: (manifest.outbound || []).map(pickPassenger),
    inbound: (manifest.inbound || []).map(pickPassenger)
  };
}

// Redact comments field in rows for CSV/print when not included
export function maybeStripComments(rows, includeComments) {
  if (includeComments) return rows;
  return rows.map(r => ({ ...r, comments: '' }));
}
