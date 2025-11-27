import BN from 'bn.js';
import UserCredential from '../models/UserCredential.js';
import { registerOnS2 } from '../s2/auxServer.js';
import {
  baseMul,
  hexToPoint,
  modInverse,
  pointToHex,
  randomScalar
} from '../crypto/ecc.js';
import { h0 } from '../crypto/hash.js';
import { getPrivateKeys, getSystemParams } from '../services/systemService.js';
import { randomScalar as randomZq } from '../crypto/ecc.js';
import { getPaillierKeys } from '../crypto/paillier.js';
import { bnToBigInt } from '../utils/number.js';
import { generateProof, verifyProof } from '../crypto/zkp.js';

export async function registerOnS1({ id, password, ni }) {
  const hashPwNi = h0(password, ni);
  const hashId = h0(id);
  const { x1 } = getPrivateKeys();
  const ki = randomZq();
  const q = new BN(getSystemParams().q, 16);
  const scalar = hashId.add(x1).umod(q);
  const kiInv = modInverse(ki);
  const diPoint = baseMul(kiInv.mul(scalar).umod(q));
  const diHex = pointToHex(diPoint);
  await UserCredential.findOneAndUpdate(
    { hashedId: hashId.toString(16) },
    {
      originalId: id,
      hashedId: hashId.toString(16),
      di: diHex,
      ni: String(ni || '').trim(),
      ki: ki.toString(16),
      hashPwNi: hashPwNi.toString(16)
    },
    { upsert: true, new: true }
  );
  await registerOnS2({ hashId, hashPwNi });
  return { di: diHex, ni };
}

export async function getUserRecord(hashIdHex) {
  return UserCredential.findOne({ hashedId: hashIdHex });
}

export function validateProof(publicPointHex, proof, context = []) {
  const point = hexToPoint(publicPointHex);
  return verifyProof(point, proof, context);
}

export function decryptC2(cipherHex) {
  const { privateKey } = getPaillierKeys();
  const plaintext = privateKey.decrypt(BigInt(`0x${cipherHex}`));
  const qBN = new BN(getSystemParams().q, 16);
  return new BN(plaintext.toString(16), 16).umod(qBN);
}

export function generateServerProofSecret(publicPoint) {
  const r1 = randomScalar();
  const R1 = baseMul(r1);
  const proof = generateProof(r1, R1, [publicPoint]);
  return { r1, R1, proof };
}

export async function updatePasswordOnServers({ id, newPassword, ni }) {
  if (!id || !newPassword || !ni) {
    throw new Error(`updatePasswordOnServers: Missing required fields. id: ${id}, newPassword: ${newPassword ? '***' : undefined}, ni: ${ni}`);
  }
  const hashId = h0(id);
  const hashPwNi = h0(newPassword, ni);
  if (!hashId || !hashPwNi) {
    throw new Error(`updatePasswordOnServers: Failed to hash credentials. hashId: ${hashId}, hashPwNi: ${hashPwNi}`);
  }
  await UserCredential.findOneAndUpdate(
    { hashedId: hashId.toString(16) },
    { hashPwNi: hashPwNi.toString(16), ni: String(ni || '').trim() },
    { new: true }
  );
  await registerOnS2({ hashId, hashPwNi });
}

