import BN from 'bn.js';
import { hashBytes } from '../utils/bytes.js';
import { getParams } from './ecc.js';

const { q } = getParams();

function hashToBN(tag, parts = []) {
  const digest = hashBytes(tag, parts);
  return new BN(digest.toString('hex'), 16).umod(q);
}

export function hashToBuffer(tag, parts = []) {
  return hashBytes(tag, parts);
}

export const h0 = (...parts) => hashToBN('h0', parts);
export const h1 = (...parts) => hashToBN('h1', parts);
export const h2 = (...parts) => hashBytes('h2', parts);
export const h3 = (...parts) => hashToBN('h3', parts);
export const h4 = (...parts) => hashToBN('h4', parts);

