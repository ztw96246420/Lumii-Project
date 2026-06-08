type RuntimeEnv = {
  process?: {
    env?: Record<string, string | undefined>;
  };
};

declare const process: {
  env?: {
    EXPO_PUBLIC_SPUG_SMS_URL?: string;
    SPUG_SMS_URL?: string;
  };
};

export type SendSmsVerificationCodeInput = {
  code?: string;
  phone: string;
};

export type SendSmsVerificationCodeResult = {
  code: string;
  payload: {
    code: string;
    name: string;
    targets: string;
  };
  response: unknown;
};

const DEFAULT_SENDER_NAME = '\u7075\u4f34';

export function createOtpCode() {
  return String(Math.floor(100000 + Math.random() * 900000));
}

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

export async function sendSmsVerificationCode(input: SendSmsVerificationCodeInput): Promise<SendSmsVerificationCodeResult> {
  const url = getSmsEndpoint();
  if (!url) {
    throw new Error('Missing EXPO_PUBLIC_SPUG_SMS_URL. SMS is skipped in local preview.');
  }

  const phone = extractMainlandChinaPhone([input.phone]);
  if (!phone) {
    throw new Error('Invalid mainland China phone number.');
  }

  const code = input.code ?? createOtpCode();
  const payload = {
    code,
    name: DEFAULT_SENDER_NAME,
    targets: phone,
  };

  const response = await fetch(url, {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
    method: 'POST',
  });

  let responseBody: unknown;
  const responseText = await response.text();
  try {
    responseBody = responseText ? JSON.parse(responseText) : null;
  } catch {
    responseBody = responseText;
  }

  if (!response.ok) {
    throw new Error(`SMS provider responded with ${response.status}: ${responseText}`);
  }

  if (isProviderError(responseBody)) {
    throw new Error(`SMS provider rejected the request: ${JSON.stringify(responseBody)}`);
  }

  return {
    code,
    payload,
    response: responseBody,
  };
}

function getSmsEndpoint() {
  const env = (globalThis as RuntimeEnv).process?.env;
  return process.env?.EXPO_PUBLIC_SPUG_SMS_URL || process.env?.SPUG_SMS_URL || env?.EXPO_PUBLIC_SPUG_SMS_URL || env?.SPUG_SMS_URL || '';
}

function isProviderError(body: unknown) {
  if (!body || typeof body !== 'object' || !('code' in body)) return false;

  const code = Number((body as { code?: unknown }).code);
  return Number.isFinite(code) && code !== 0 && code !== 200;
}
