import BN from 'bn.js';

export function bnToBigInt(bn) {
  return BigInt(`0x${bn.toString(16)}`);
}

export function bigIntToBN(value) {
  return new BN(value.toString(16), 16);
}

