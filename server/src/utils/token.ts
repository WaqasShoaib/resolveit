import crypto from 'crypto';

const SECRET = process.env.CONSENT_SECRET || 'dev-consent-secret';

function hmac(data: string) {
  return crypto.createHmac('sha256', SECRET).update(data).digest('hex');
}

// Token format: caseId.expTs.nonce.sig (all URL-safe/plain)
export function signConsentToken(caseId: string, expiresInDays = 7) {
  const exp = Math.floor(Date.now() / 1000) + expiresInDays * 24 * 60 * 60;
  const nonce = crypto.randomBytes(8).toString('hex');
  const payload = `${caseId}.${exp}.${nonce}`;
  const sig = hmac(payload);
  return `${payload}.${sig}`;
}

export function verifyConsentToken(token: string) {
  const parts = token.split('.');
  if (parts.length !== 4) return { ok: false as const, reason: 'bad_format' };
  const [caseId, expStr, nonce, sig] = parts;
  const payload = `${caseId}.${expStr}.${nonce}`;
  const expected = hmac(payload);
  if (expected !== sig) return { ok: false as const, reason: 'bad_sig' };
  const exp = parseInt(expStr, 10);
  if (Number.isNaN(exp) || Math.floor(Date.now() / 1000) > exp) {
    return { ok: false as const, reason: 'expired' };
  }
  return { ok: true as const, caseId, exp };
}
