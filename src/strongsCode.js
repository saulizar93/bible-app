/** Canonicalize a Strong's number regardless of zero-padding: "H03130" / "H0727" -> "H3130" / "H727". */
export function normalizeStrong(raw) {
  if (!raw) return raw;
  const m = String(raw).toUpperCase().match(/^([HG])0*(\d+)$/);
  return m ? `${m[1]}${m[2]}` : raw;
}
