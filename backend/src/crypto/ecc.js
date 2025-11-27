import elliptic from 'elliptic';
import BN from 'bn.js';

const EC = elliptic.ec;
const ec = new EC('secp256k1');

const curve = ec.curve;
const G = ec.g;
const q = curve.n;

export function randomScalar() {
  return new BN(ec.genKeyPair().getPrivate());
}

export function scalarToHex(scalar) {
  return scalar.umod(q).toString(16);
}

export function pointToHex(point) {
  return point.encode('hex', false);
}

export function hexToPoint(hex) {
  return ec.curve.decodePoint(hex, 'hex');
}

export function addPoints(a, b) {
  return a.add(b);
}

export function mulPoint(point, scalar) {
  return point.mul(new BN(scalar));
}

export function baseMul(scalar) {
  return G.mul(new BN(scalar));
}

export function modInverse(value) {
  return new BN(value).invm(q);
}

export function normalizeScalar(value) {
  return new BN(value).umod(q);
}

export function getParams() {
  return { ec, curve, G, q };
}

