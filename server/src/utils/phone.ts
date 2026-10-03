/** E.164: "+" followed by 8–15 digits, first digit non-zero. */
export const E164_REGEX = /^\+[1-9]\d{7,14}$/;

/** Strips spaces, dashes, dots and parentheses so "+1 (555) 010-2030" becomes "+15550102030". */
export function normalizePhone(input: string): string {
  return input.replace(/[\s().-]/g, '');
}

export function maskPhone(phone: string): string {
  return phone.length <= 4 ? phone : `${'•'.repeat(phone.length - 4)}${phone.slice(-4)}`;
}
