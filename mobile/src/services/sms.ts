export function extractMainlandChinaPhone(values: unknown[]) {
  for (const value of values) {
    const digits = String(value ?? '').replace(/\D/g, '');
    const phone = digits.startsWith('86') && digits.length === 13 ? digits.slice(2) : digits;

    if (/^1[3-9]\d{9}$/.test(phone)) {
      return phone;
    }
  }

  return '';
}
