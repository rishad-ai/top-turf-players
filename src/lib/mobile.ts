/**
 * Normalizes a mobile number for storage and comparison so that formatting
 * differences (spaces, dashes, country code, leading zero) don't prevent a match.
 * Keeps only digits, then takes the last 10 (the local significant number for most
 * regions including India). "+91 98765-43210" and "098765 43210" both become
 * "9876543210".
 */
export function normalizeMobile(input: string): string {
  const digits = (input || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function isValidMobile(input: string): boolean {
  return normalizeMobile(input).length === 10;
}
