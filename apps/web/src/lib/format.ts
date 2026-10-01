const pkr = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", minimumFractionDigits: 2 });
export const formatPKR = (n: number) => pkr.format(n);
export const formatDate = (iso: string) => new Date(iso).toLocaleString("en-PK", { dateStyle: "medium", timeStyle: "short" });
const pkrCompact = new Intl.NumberFormat("en-PK", { style: "currency", currency: "PKR", notation: "compact", maximumFractionDigits: 1 });
export const formatPKRCompact = (n: number) => pkrCompact.format(n);
