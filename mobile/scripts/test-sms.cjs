const endpoint = process.env.SPUG_SMS_URL || '';
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const phone = args.find((arg) => !arg.startsWith('--')) || '';
const codeArg = args.find((arg) => arg.startsWith('--code='));
const code = codeArg ? codeArg.slice('--code='.length) : String(Math.floor(100000 + Math.random() * 900000));

function mask(value) {
  if (!value) return '';
  if (value.length <= 10) return '***';
  return `${value.slice(0, 24)}...${value.slice(-6)}`;
}

function normalizePhone(value) {
  const digits = String(value || '').replace(/\D/g, '');
  return digits.startsWith('86') && digits.length === 13 ? digits.slice(2) : digits;
}

async function main() {
  if (!endpoint) {
    throw new Error('Missing SPUG_SMS_URL. Example: $env:SPUG_SMS_URL=\"https://push.spug.cc/send/xxx\"; npm run sms:test -- 18600000000');
  }

  const target = normalizePhone(phone);
  if (!/^1[3-9]\d{9}$/.test(target)) {
    throw new Error('Please pass a valid mainland China mobile number. Example: npm run sms:test -- 18600000000');
  }

  const payload = {
    code,
    name: '\u7075\u4f34',
    targets: target,
  };

  if (dryRun) {
    console.log(JSON.stringify({ dryRun: true, endpoint: mask(endpoint), payload }, null, 2));
    return;
  }

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  const text = await response.text();
  let body = text;
  try {
    body = JSON.parse(text);
  } catch {
    // Keep plain text provider responses readable.
  }

  console.log(JSON.stringify({ ok: response.ok, status: response.status, body, payload }, null, 2));

  if (!response.ok || isProviderError(body)) {
    process.exitCode = 1;
  }
}

function isProviderError(body) {
  if (!body || typeof body !== 'object' || !Object.prototype.hasOwnProperty.call(body, 'code')) return false;

  const code = Number(body.code);
  return Number.isFinite(code) && code !== 0 && code !== 200;
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
