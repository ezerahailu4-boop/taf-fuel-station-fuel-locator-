/**
 * Phone number normalization and utility functions, specially tuned for Ethiopia (+251)
 * and international phone numbers.
 */

export function normalizePhone(raw: string): string {
  if (!raw) return "";
  const cleaned = raw.trim();
  const digits = cleaned.replace(/\D/g, "");

  // If already starts with 251 and has 12 digits (e.g. 251911223344 or 251711223344)
  if (digits.startsWith("251") && digits.length === 12) {
    return `+${digits}`;
  }
  // If starts with 0 and has 10 digits (e.g. 0911223344 or 0711223344)
  if (digits.startsWith("0") && digits.length === 10) {
    return `+251${digits.slice(1)}`;
  }
  // If 9 digits starting with 9 or 7 (e.g. 911223344 or 711223344)
  if ((digits.startsWith("9") || digits.startsWith("7")) && digits.length === 9) {
    return `+251${digits}`;
  }
  // Generic international with +
  if (cleaned.startsWith("+") && digits.length >= 7) {
    return `+${digits}`;
  }
  return digits.length >= 7 ? `+${digits}` : cleaned;
}

export function isPhoneNumber(val: string): boolean {
  const clean = val.trim();
  if (!clean || clean.startsWith("@")) return false;
  if (clean.startsWith("+")) return true;
  const digits = clean.replace(/\D/g, "");
  // Ethiopian mobile: 09... or 07... (10 digits), or 9... / 7... (9 digits), or 251... (12 digits)
  if (/^0[97]\d{8}$/.test(digits)) return true;
  if (/^[97]\d{8}$/.test(digits)) return true;
  if (/^251[97]\d{8}$/.test(digits)) return true;
  // Fallback for general numeric phone
  return digits.length >= 9 && digits.length <= 15 && (clean.startsWith("0") || clean.startsWith("+") || digits.startsWith("251"));
}

export function getPhoneSearchVariants(raw: string): string[] {
  const digits = raw.replace(/\D/g, "");
  const norm = normalizePhone(raw);
  const variants = new Set<string>();

  if (norm) variants.add(norm);
  if (digits) variants.add(digits);

  const last9 = digits.slice(-9);
  if (last9.length === 9) {
    variants.add(last9);
    variants.add(`0${last9}`);
    variants.add(`+251${last9}`);
    variants.add(`251${last9}`);
  }

  return Array.from(variants);
}

export function formatPhoneDisplay(raw?: string | null): string {
  if (!raw) return "";
  const norm = normalizePhone(raw);
  if (norm.startsWith("+251") && norm.length === 13) {
    // +251 91 123 4567
    return `+251 ${norm.slice(4, 6)} ${norm.slice(6, 9)} ${norm.slice(9)}`;
  }
  return norm || raw;
}

