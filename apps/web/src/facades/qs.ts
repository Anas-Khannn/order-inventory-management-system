/** Builds a query string, skipping undefined/empty values. */
export const qs = (p: object) => {
  const u = new URLSearchParams();
  Object.entries(p).forEach(([k, v]) => v !== undefined && v !== "" && u.set(k, String(v)));
  return u.toString();
};
