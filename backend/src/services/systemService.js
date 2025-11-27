import BN from 'bn.js';
import { randomScalar, baseMul, pointToHex, getParams } from '../crypto/ecc.js';
import { bootstrapPaillier, getPaillierKeys } from '../crypto/paillier.js';

let systemParams;

export async function bootstrapSystemParams() {
  if (systemParams) {
    return systemParams;
  }
  const { G, q } = getParams();
  const x1 = randomScalar();
  const x2 = randomScalar();
  const Ppub1 = baseMul(x1);
  const Ppub2 = baseMul(x2);

  await bootstrapPaillier();

  systemParams = {
    curve: 'secp256k1',
    q: q.toString(16),
    generator: pointToHex(G),
    x1: x1.toString(16),
    x2: x2.toString(16),
    Ppub1: pointToHex(Ppub1),
    Ppub2: pointToHex(Ppub2)
  };
  return systemParams;
}

export function getSystemParams() {
  if (!systemParams) {
    throw new Error('System parameters not initialised');
  }
  const { generator, q, Ppub1, Ppub2, curve } = systemParams;
  const { publicKey } = getPaillierKeys();
  return {
    curve,
    q,
    generator,
    Ppub1,
    Ppub2,
    paillier: {
      n: publicKey.n.toString(),
      g: publicKey.g.toString()
    }
  };
}

export function getPrivateKeys() {
  if (!systemParams) {
    throw new Error('System parameters not initialised');
  }
  return {
    x1: new BN(systemParams.x1, 16),
    x2: new BN(systemParams.x2, 16)
  };
}

