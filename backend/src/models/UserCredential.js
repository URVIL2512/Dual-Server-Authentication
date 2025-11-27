import mongoose from 'mongoose';

const UserCredentialSchema = new mongoose.Schema(
  {
    originalId: { type: String, required: true },
    hashedId: { type: String, required: true, unique: true },
    di: { type: String, required: true },
    ni: { type: String, required: true },
    ki: { type: String, required: true },
    hashPwNi: { type: String, required: true }
  },
  { timestamps: true }
);

export default mongoose.model('UserCredential', UserCredentialSchema);

