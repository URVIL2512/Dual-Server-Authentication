import crypto from 'crypto';

export function toBuffer(value) {
  if (Buffer.isBuffer(value)) {
    return value;
  }
  if (typeof value === 'string') {
    return Buffer.from(value, 'utf8');
  }
  if (typeof value === 'bigint') {
    return Buffer.from(value.toString(16).padStart(64, '0'), 'hex');
  }
  if (typeof value === 'number') {
    return Buffer.from(value.toString(16).padStart(16, '0'), 'hex');
  }
  if (value?.toArray) {
    return Buffer.from(value.toArray('be', 32));
  }
  if (value?.toString) {
    const str = value.toString();
    if (value.constructor?.name === 'BN') {
      return Buffer.from(str.toString(16).padStart(64, '0'), 'hex');
    }
    return Buffer.from(str, 'utf8');
  }
  throw new Error(`Unsupported buffer conversion for type: ${typeof value}, value: ${value}`);
}

export function bnToBuffer(bn) {
  const hex = bn.toString(16).padStart(64, '0');
  return Buffer.from(hex, 'hex');
}

export function xorBuffers(a, b) {
  const length = Math.max(a.length, b.length);
  const out = Buffer.alloc(length);
  for (let i = 0; i < length; i += 1) {
    out[i] = a[i % a.length] ^ b[i % b.length];
  }
  return out;
}

export function hashBytes(tag, parts) {
  const hash = crypto.createHash('sha256');
  hash.update(tag);
  parts.forEach((part) => {
    if (part === undefined || part === null) {
      throw new Error(`Cannot hash undefined/null value in parts array. Tag: ${tag}, Parts: [${parts.map(p => typeof p).join(', ')}]`);
    }
    hash.update(toBuffer(part));
  });
  return hash.digest();
}

