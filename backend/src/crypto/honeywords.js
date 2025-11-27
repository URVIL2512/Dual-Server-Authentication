import crypto from 'crypto';

export function generateHoneywords(trueValue, count = 10) {
  const words = new Set();
  words.add(trueValue);
  while (words.size < count) {
    const candidate = crypto.randomBytes(trueValue.length).toString('hex');
    words.add(candidate);
  }
  return Array.from(words);
}

