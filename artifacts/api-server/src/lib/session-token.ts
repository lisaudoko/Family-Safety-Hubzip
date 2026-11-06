import { createHash } from 'crypto';

// Session tokens are bearer credentials: the client holds the plaintext, the
// database only ever stores this SHA-256 digest, so a leaked DB/backup cannot
// be replayed as live sessions. Tokens are 122-bit random UUIDs, so an unsalted
// fast hash is sufficient (nothing to brute-force).
export function hashToken(token: string): string {
  return createHash('sha256').update(token).digest('hex');
}
