# Dual-Server IoT Authentication Stack

Implementation of “Practical and Secure Password Authentication and Key Agreement Scheme Based Dual-Server for IoT Devices in 5G Network.” The stack comprises a Node.js backend hosting the master server (S1), auxiliary server (S2), ECC/Paillier crypto, and a Vite/React frontend that exercises Algorithms 1–6 end-to-end.

## Project Layout

```
root/
├── backend/      # Express API, MongoDB models, ECC/Paillier/ZKP logic
├── frontend/     # React UI driving registration/auth/password change flows
└── docs/         # Supplemental documentation (this file)
```

## Backend

- `src/services/systemService.js` bootstraps Algorithm 1 (ECC params, Paillier keys, server secrets).
- `src/s1/masterServer.js` and `src/s2/auxServer.js` implement Algorithms 2–5, including honeywords and Schnorr ZK proofs.
- REST endpoints live under `/api`:
  - `GET /api/params`
  - `POST /api/register`
  - `POST /api/login`
  - `POST /api/password/change`
- MongoDB stores registration artifacts (`UserCredential`, `AuxRecord`). Copy `backend/env.sample` to `.env` and adjust `MONGO_URI`, `PORT`, and honeyword limits.

### Run backend

```bash
cd backend
cp env.sample .env        # edit if needed
npm install               # already done once
npm run dev               # nodemon with hot reload
```

The server boots after connecting to MongoDB and generating Paillier keys (can take ~10s the first time). API responses include raw protocol material (R-values, proofs, β values, etc.) for auditability.

## Frontend

The Vite/React client calls the REST APIs and visualizes outputs from each algorithmic step (params, honeyword alarms, session keys). Three panels map directly to Algorithm 2 (Registration), Algorithms 3–5 (Authentication), and the Password Change phase.

### Run frontend

```bash
cd frontend
cp env.sample .env        # optional, defaults to http://localhost:5000/api
npm install               # already done once
npm run dev
```

Access via the shown Vite URL (default `http://localhost:5173`). Ensure the backend is running first.

## Development Notes

- Hashing uses SHA-256 (`h0`–`h4`), ECC is `secp256k1`, Paillier modulus length is 2048 bits.
- Honeyword traps live in `AuxRecord.honeyList`. Exceeding the configured threshold resets the trap and rejects future attempts until manual cleanup.
- ZK proofs follow a Schnorr construction made non-interactive via Fiat–Shamir (`src/crypto/zkp.js`).
- All cryptographic values are hex-encoded when transported over the API to keep the frontend framework-agnostic.

## Testing Checklist

1. Register a device ID with nonce `ni`.
2. Authenticate using the same credentials; observe session key output and β-verification logs in the response JSON.
3. Change the password; re-run login with new secret to ensure α\* refresh works.
4. Trigger honeyword detection by altering stored nonce/password (manual DB edit) and watch the frontend flag “honeyword detected.”

This documentation should help future contributors extend the system (e.g., integrate hardware devices, add telemetry, or plug in formal verification tooling). For further protocol context, keep the IEEE paper handy.

