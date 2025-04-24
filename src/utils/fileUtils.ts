import crypto from 'crypto';

export function generateHash(input: string, length = 6): string {
  return crypto.createHash('md5').update(input).digest('hex').substring(0, length);
} 