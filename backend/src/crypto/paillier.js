import { generateRandomKeys } from 'paillier-bigint';

let paillierKeys;

export async function bootstrapPaillier() {
  if (paillierKeys) {
    return paillierKeys;
  }
  paillierKeys = await generateRandomKeys(2048);
  return paillierKeys;
}

export function getPaillierKeys() {
  if (!paillierKeys) {
    throw new Error('Paillier keys not initialised');
  }
  return paillierKeys;
}

