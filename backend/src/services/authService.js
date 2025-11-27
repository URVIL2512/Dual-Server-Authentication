import BN from 'bn.js';
import {
  baseMul,
  getParams,
  hexToPoint,
  modInverse,
  pointToHex,
  randomScalar
} from '../crypto/ecc.js';
import {
  getPrivateKeys,
  getSystemParams
} from './systemService.js';
import {
  h0, h2, h3
} from '../crypto/hash.js';
import { registerOnS1, getUserRecord, decryptC2, updatePasswordOnServers } from '../s1/masterServer.js';
import { processAuxAuthentication } from '../s2/auxServer.js';
import { bnToBuffer, xorBuffers } from '../utils/bytes.js';
import { getPaillierKeys } from '../crypto/paillier.js';
import { bnToBigInt } from '../utils/number.js';
import { generateProof, verifyProof } from '../crypto/zkp.js';

const { q } = getParams();

export async function handleRegistration(payload) {
  return registerOnS1(payload);
}

export async function handlePasswordChange(payload) {
  const { id, password, newPassword, ni } = payload;
  const actualPassword = newPassword || password;
  if (!id || !actualPassword || !ni) {
    throw new Error('Missing required fields: id, password, and ni are required');
  }
  await updatePasswordOnServers({ id, newPassword: actualPassword, ni });
  return { message: 'Password updated and honey index refreshed' };
}

export async function authenticateUser({ id, password, ni }) {
  const hashId = h0(id);
  const record = await getUserRecord(hashId.toString(16));
  if (!record) {
    throw new Error('User not registered');
  }
  const storedNi = String(record.ni || '').trim();
  const providedNi = String(ni || '').trim();
  if (storedNi !== providedNi) {
    const errorMsg = `Nonce mismatch. The stored nonce for device "${id}" is "${storedNi}", but you provided "${providedNi}". ` +
                     `If you changed your password, use the nonce from the password change operation.`;
    throw new Error(errorMsg);
  }
  const actualNi = storedNi;
  const userPhase = await runUserPhase({ id, password, ni: actualNi, record, hashId });
  if (userPhase.hashPwNiHex !== record.hashPwNi) {
    throw new Error('Stored credential mismatch');
  }
  const auxPhase = await runAuxPhase(userPhase);
  if (auxPhase.honeyAlert) {
    return {
      status: 'honeyword',
      message: auxPhase.message
    };
  }
  const masterResult = await runMasterPhase(userPhase, auxPhase.payload);
  return {
    status: 'success',
    sessionKey: masterResult.sessionKey,
    audit: {
      Ti: userPhase.Ti,
      T1: masterResult.T1,
      T2: auxPhase.payload.T2
    }
  };
}

async function runUserPhase({ id, password, ni, record, hashId }) {
  const ri = randomScalar();
  const Ri = baseMul(ri);
  const Di = hexToPoint(record.di);
  const riInv = modInverse(ri);
  const Ei = Di.mul(riInv);
  const { Ppub1, Ppub2 } = getSystemParams();
  const Ppub1Point = hexToPoint(Ppub1);
  const Ppub2Point = hexToPoint(Ppub2);
  const mask1 = h2(pointToHex(Ri), pointToHex(Ppub1Point.mul(ri)));
  const pid1 = xorBuffers(Buffer.from(id), mask1).toString('hex');
  const riPpub2 = Ppub2Point.mul(ri);
  const mask2 = h2(pointToHex(Ri), pointToHex(riPpub2));
  const pid2 = xorBuffers(Buffer.from(id), mask2).toString('hex');
  const hashPwNi = h0(password, ni);
  const hashedBuffer = bnToBuffer(hashPwNi);
  const pwMask = h2(pointToHex(Ri), pointToHex(riPpub2), id);
  const ppw = xorBuffers(hashedBuffer, pwMask).toString('hex');
  const Ti = Date.now().toString();
  const { publicKey } = getPaillierKeys();
  const Ci = publicKey.encrypt(bnToBigInt(ri));
  const beta1 = h3(id, pid1, pointToHex(Ri), pointToHex(Ei), Ti).toString(16).padStart(64, '0');
  const CiHex = Ci.toString(16);
  const beta2 = h3(id, pid2, pointToHex(Ri), CiHex, Ti).toString(16).padStart(64, '0');
  const proof = generateProof(ri, Ri, [id, pid1, Ti]);
  return {
    id,
    hashIdHex: hashId.toString(16),
    hashPwNiHex: hashPwNi.toString(16),
    ri,
    RiHex: pointToHex(Ri),
    EiHex: pointToHex(Ei),
    pid1,
    pid2,
    Ti,
    CiHex,
    beta1Hex: beta1,
    beta2Hex: beta2,
    proof,
    ppwHex: ppw,
    kiHex: record.ki,
    ni,
    record
  };
}

async function runAuxPhase(userPhase) {
  return processAuxAuthentication({
    userContext: {
      hashIdHex: userPhase.hashIdHex,
      RiHex: userPhase.RiHex,
      PID2: userPhase.pid2,
      beta2Hex: userPhase.beta2Hex,
      CiHex: userPhase.CiHex,
      Ti: userPhase.Ti,
      kiHex: userPhase.kiHex,
      ppwHex: userPhase.ppwHex,
      originalId: userPhase.id
    }
  });
}

async function runMasterPhase(userPhase, auxPayload) {
  const { x1 } = getPrivateKeys();
  const Ri = hexToPoint(userPhase.RiHex);
  
  if (!userPhase.id) {
    const mask = h2(userPhase.RiHex, pointToHex(Ri.mul(x1)));
    const recoveredIdBuffer = xorBuffers(Buffer.from(userPhase.pid1, 'hex'), mask);
    let recoveredId = recoveredIdBuffer.toString('utf8');
    if (recoveredId.includes('\0')) {
      recoveredId = recoveredId.replace(/\0/g, '').trim();
    }
    userPhase.id = recoveredId;
  }
  
  const actualId = userPhase.id;
  const expectedBeta1 = h3(actualId, userPhase.pid1, userPhase.RiHex, userPhase.EiHex, userPhase.Ti).toString(16).padStart(64, '0');
  const normalizedBeta1Hex = (userPhase.beta1Hex || '').padStart(64, '0');
  if (expectedBeta1 !== normalizedBeta1Hex) {
    console.error('β1 mismatch debug:', {
      usedId: actualId,
      pid1: userPhase.pid1?.slice(0, 20) + '...',
      RiHex: userPhase.RiHex?.slice(0, 20) + '...',
      EiHex: userPhase.EiHex?.slice(0, 20) + '...',
      Ti: userPhase.Ti,
      expected: expectedBeta1,
      received: normalizedBeta1Hex,
      expectedLen: expectedBeta1.length,
      receivedLen: normalizedBeta1Hex.length
    });
    throw new Error(`β1 mismatch at master server: expected ${expectedBeta1}, got ${normalizedBeta1Hex}`);
  }
  const proofValid = verifyProof(Ri, userPhase.proof, [actualId, userPhase.pid1, userPhase.Ti]);
  if (!proofValid) {
    throw new Error('Schnorr proof invalid');
  }
  const R2Point = hexToPoint(auxPayload.R2);
  const pid3Mask = h2(auxPayload.R2, pointToHex(R2Point.mul(x1)));
  const idFromS2Buffer = xorBuffers(Buffer.from(auxPayload.PID3, 'hex'), pid3Mask);
  let idFromS2 = idFromS2Buffer.toString('utf8');
  if (idFromS2.includes('\0')) {
    idFromS2 = idFromS2.replace(/\0/g, '').trim();
  }
  const idForBeta2 = auxPayload.resolvedId || actualId || idFromS2;
  const beta2Check = h3(idForBeta2, auxPayload.PID3, auxPayload.R2, auxPayload.C2, auxPayload.T2).toString(16).padStart(64, '0');
  const normalizedAuxBeta2 = (auxPayload.beta2 || '').padStart(64, '0');
  if (beta2Check !== normalizedAuxBeta2) {
    console.error('β2 verification failed on master debug:', {
      actualId,
      idFromS2,
      resolvedId: auxPayload.resolvedId,
      idForBeta2,
      PID3: auxPayload.PID3,
      R2: auxPayload.R2.slice(0, 20) + '...',
      C2: auxPayload.C2.slice(0, 20) + '...',
      T2: auxPayload.T2,
      expected: beta2Check,
      received: normalizedAuxBeta2
    });
    throw new Error(`β2 verification failed on master: expected ${beta2Check}, got ${normalizedAuxBeta2}`);
  }
  const proofValidS2 = verifyProof(R2Point, auxPayload.proof, [idForBeta2, auxPayload.PID3, auxPayload.T2]);
  if (!proofValidS2) {
    throw new Error('Auxiliary server proof invalid');
  }

  const ks = decryptC2(auxPayload.C2);
  const Ei = hexToPoint(userPhase.EiHex);
  const hashIdBN = new BN(userPhase.hashIdHex, 16);
  const scalarSum = x1.add(hashIdBN).umod(q);
  const ksNormalized = ks.umod(q);
  const left = Ei.mul(ksNormalized);
  const right = R2Point.mul(scalarSum);
  if (!left.eq(right)) {
    const Di = hexToPoint(userPhase.record.di);
    const riInv = modInverse(userPhase.ri);
    const EiRecomputed = Di.mul(riInv);
    const EiMatches = Ei.eq(EiRecomputed);
    const kiBN = new BN(userPhase.kiHex, 16);
    const expectedDiScalar = modInverse(kiBN).mul(scalarSum).umod(q);
    const expectedDi = baseMul(expectedDiScalar);
    const DiMatches = Di.eq(expectedDi);
    const riBN = userPhase.ri;
    const kiInv = modInverse(kiBN);
    const expectedEiScalar = kiInv.mul(scalarSum).umod(q);
    const expectedEi = baseMul(expectedEiScalar);
    const expectedLeft = expectedEi.mul(ksNormalized);
    const expectedRight = R2Point.mul(scalarSum);
    console.error('Session key relation invalid - detailed analysis:', {
      actualId,
      ksHex: ks.toString(16),
      ksNormalizedHex: ksNormalized.toString(16),
      EiHex: userPhase.EiHex,
      EiMatches,
      EiRecomputedHex: pointToHex(EiRecomputed),
      expectedEiHex: pointToHex(expectedEi),
      DiMatches,
      expectedDiHex: pointToHex(expectedDi),
      R2Hex: auxPayload.R2,
      x1Hex: x1.toString(16),
      hashIdHex: hashIdBN.toString(16),
      scalarSumHex: scalarSum.toString(16),
      leftHex: pointToHex(left),
      rightHex: pointToHex(right),
      expectedLeftHex: pointToHex(expectedLeft),
      expectedRightHex: pointToHex(expectedRight),
      leftEqRight: left.eq(right),
      expectedLeftEqRight: expectedLeft.eq(expectedRight),
      DiHex: userPhase.record.di,
      kiHex: userPhase.kiHex,
      riHex: riBN.toString(16),
      kiInvHex: kiInv.toString(16)
    });
    throw new Error('Session key relation invalid');
  }
  const T1 = Date.now().toString();
  const r1 = randomScalar();
  const R1 = baseMul(r1);
  const R1i = Ri.mul(r1);
  const sessionKey = h3(actualId, pointToHex(R1i), userPhase.RiHex, pointToHex(R1), userPhase.Ti, T1).toString(16);
  const beta1Server = h3(actualId, pointToHex(R1), T1, sessionKey, userPhase.Ti).toString(16);
  return {
    sessionKey,
    beta1Server,
    R1: pointToHex(R1),
    T1
  };
}

