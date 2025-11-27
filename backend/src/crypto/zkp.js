import BN from 'bn.js';
import { randomScalar, baseMul, getParams } from './ecc.js';
import { hashToBuffer } from './hash.js';

const { q } = getParams();

function bufferToBN(buffer) {
  return new BN(buffer.toString('hex'), 16).umod(q);
}

export function generateProof(secretScalar, publicPoint, context = []) {
  const w = randomScalar();
  const commitment = baseMul(w);
  const challenge = bufferToBN(hashToBuffer('zkp', [commitment.encode('hex', false), publicPoint.encode('hex', false), ...context]));
  const response = w.add(challenge.mul(new BN(secretScalar))).umod(q);
  return {
    commitment: commitment.encode('hex', false),
    response: response.toString(16)
  };
}

export function verifyProof(publicPoint, proof, context = []) {
  const { q: order } = getParams();
  const commitPoint = publicPoint.curve.decodePoint(proof.commitment, 'hex');
  const challenge = bufferToBN(hashToBuffer('zkp', [proof.commitment, publicPoint.encode('hex', false), ...context]));
  const response = new BN(proof.response, 16).umod(order);
  const left = baseMul(response);
  const right = commitPoint.add(publicPoint.mul(challenge));
  return left.eq(right);
}

