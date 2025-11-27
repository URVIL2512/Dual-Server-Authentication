import BN from 'bn.js';
import AuxRecord from '../models/AuxRecord.js';
import { h1, h2, h3, h4 } from '../crypto/hash.js';
import {
  hexToPoint,
  pointToHex,
  randomScalar,
  baseMul
} from '../crypto/ecc.js';
import { generateHoneywords } from '../crypto/honeywords.js';
import { bnToBuffer, xorBuffers } from '../utils/bytes.js';
import { getPrivateKeys, getSystemParams } from '../services/systemService.js';
import { generateProof } from '../crypto/zkp.js';
import { getPaillierKeys } from '../crypto/paillier.js';
import { bnToBigInt } from '../utils/number.js';
import { config } from '../config/env.js';

export async function registerOnS2({ hashId, hashPwNi }) {
  if (!hashId || !hashPwNi) {
    throw new Error(`registerOnS2: Missing required parameters. hashId: ${hashId}, hashPwNi: ${hashPwNi}`);
  }
  const { x2 } = getPrivateKeys();
  if (!x2) {
    throw new Error('registerOnS2: x2 private key not available');
  }
  const treg = new Date();
  const mi = h4(x2.toString(16), hashId.toString(16), treg.getTime().toString());
  const pwBuffer = bnToBuffer(hashPwNi);
  const miBuffer = bnToBuffer(mi);
  const alphaStarBuffer = xorBuffers(pwBuffer, miBuffer);
  const alphaStarHex = alphaStarBuffer.toString('hex').toLowerCase();
  const honeywords = generateHoneywords(alphaStarHex, config.honeyMax);
  await AuxRecord.findOneAndUpdate(
    { hashedId: hashId.toString(16) },
    {
      hashedId: hashId.toString(16),
      treg,
      ai: h1(hashId.toString(16), treg.getTime().toString(), mi.toString(16)).toString(16),
      mi: mi.toString(16),
      alphaStar: alphaStarHex,
      honeyList: honeywords
    },
    { upsert: true, new: true }
  );
}

export async function processAuxAuthentication({ userContext }) {
  const {
    hashIdHex,
    RiHex,
    PID2,
    beta2Hex,
    CiHex,
    Ti,
    kiHex,
    ppwHex,
    originalId
  } = userContext;
  const { x2 } = getPrivateKeys();
  const auxRecord = await AuxRecord.findOne({ hashedId: hashIdHex });
  if (!auxRecord) {
    throw new Error('Unregistered user on auxiliary server');
  }
  const Ri = hexToPoint(RiHex);
  const x2Ri = Ri.mul(x2);
  const riPpub2 = x2Ri;
  const mask = h2(RiHex, pointToHex(riPpub2));
  const pid2HexBuffer = Buffer.from(PID2, 'hex');
  const recoveredIdBuffer = xorBuffers(pid2HexBuffer, mask);
  let recoveredId = recoveredIdBuffer.toString('utf8');
  if (recoveredId.includes('\0')) {
    recoveredId = recoveredId.replace(/\0/g, '').trim();
  }
  
  if (originalId && recoveredId !== originalId) {
    const originalIdBuffer = Buffer.from(originalId, 'utf8');
    const originalIdPadded = Buffer.concat([originalIdBuffer, Buffer.alloc(Math.max(0, mask.length - originalIdBuffer.length))]);
    const testMask = xorBuffers(originalIdPadded, Buffer.from(PID2, 'hex'));
    console.error('ID recovery mismatch:', {
      originalId: `"${originalId}"`,
      recoveredId: `"${recoveredId}"`,
      originalIdHex: originalIdBuffer.toString('hex'),
      recoveredIdHex: recoveredIdBuffer.toString('hex'),
      maskLength: mask.length,
      pid2Length: PID2.length
    });
  }
  
  const actualId = originalId || recoveredId;
  
  if (!originalId) {
    console.warn('Original ID not provided, using recovered ID which may be incorrect');
  }
  const expectedBeta2 = h3(actualId, PID2, RiHex, CiHex, Ti).toString(16).padStart(64, '0');
  const normalizedBeta2Hex = beta2Hex.padStart(64, '0');
  if (expectedBeta2 !== normalizedBeta2Hex) {
    console.error('β2 validation failed:', {
      usedId: actualId,
      PID2,
      RiHex: RiHex.slice(0, 20) + '...',
      CiHex: CiHex.slice(0, 20) + '...',
      Ti,
      expected: expectedBeta2,
      received: normalizedBeta2Hex
    });
    throw new Error(`β2 validation failed: expected ${expectedBeta2}, got ${normalizedBeta2Hex}`);
  }

  if (!originalId) {
    throw new Error('Original ID required for password validation');
  }
  
  const RiPointHex = pointToHex(Ri);
  if (RiPointHex.toLowerCase() !== RiHex.toLowerCase()) {
    console.warn('Ri encoding mismatch - using RiHex directly');
  }
  
  const riPpub2Hex = pointToHex(riPpub2);
  const pwMaskForRecovery = h2(RiHex, riPpub2Hex, originalId);
  const pwStarBuffer = xorBuffers(Buffer.from(ppwHex, 'hex'), pwMaskForRecovery);
  
  const miBN = new BN(auxRecord.mi, 16);
  const alphaCandidateBuffer = xorBuffers(pwStarBuffer, bnToBuffer(miBN));
  const alphaCandidate = alphaCandidateBuffer.toString('hex').toLowerCase();
  const storedAlphaStar = (auxRecord.alphaStar || '').toLowerCase();
  
  if (alphaCandidate !== storedAlphaStar) {
    console.error('Honeyword check failed:', {
      alphaCandidate: alphaCandidate.slice(0, 32) + '...',
      storedAlphaStar: storedAlphaStar.slice(0, 32) + '...',
      idUsed: originalId,
      pwStarHex: pwStarBuffer.toString('hex').slice(0, 32) + '...',
      miHex: auxRecord.mi.slice(0, 32) + '...'
    });
    await recordHoneyEvent(auxRecord, alphaCandidate);
    return { honeyAlert: true, message: 'Honeyword detected by auxiliary server' };
  }
  const ai = h1(hashIdHex, auxRecord.treg.getTime().toString(), auxRecord.mi).toString(16);
  if (ai !== auxRecord.ai) {
    await recordHoneyEvent(auxRecord, alphaCandidate);
    return { honeyAlert: true, message: 'Key index mismatch; honey pot triggered' };
  }

  const r2 = randomScalar();
  const rho = randomScalar();
  const R2 = baseMul(r2);
  const { publicKey } = getPaillierKeys();
  const Ci = BigInt(`0x${CiHex}`);
  const encR2 = publicKey.multiply(Ci, bnToBigInt(r2));
  const encR2ki = publicKey.multiply(encR2, BigInt(`0x${kiHex}`));
  const qBigInt = BigInt(`0x${getSystemParams().q}`);
  const encNoise = publicKey.encrypt(bnToBigInt(rho) * qBigInt);
  const C2 = publicKey.addition(encR2ki, encNoise);

  const { Ppub1 } = getSystemParams();
  const pid3Mask = h2(pointToHex(R2), pointToHex(hexToPoint(Ppub1).mul(r2)));
  const pid3 = xorBuffers(Buffer.from(actualId), pid3Mask).toString('hex');
  const T2 = Date.now().toString();
  const beta2 = h3(actualId, pid3, pointToHex(R2), C2.toString(16), T2).toString(16).padStart(64, '0');
  const proof = generateProof(r2, R2, [actualId, pid3, T2]);
  return {
    honeyAlert: false,
    payload: {
      PID3: pid3,
      R2: pointToHex(R2),
      C2: C2.toString(16),
      T2,
      beta2,
      proof,
      resolvedId: actualId
    }
  };
}

async function recordHoneyEvent(record, candidate) {
  const updated = record;
  if (updated.honeyList.length < config.honeyMax) {
    updated.honeyList.push(candidate);
    await updated.save();
  } else {
    updated.honeyList = [];
    await updated.save();
  }
}

