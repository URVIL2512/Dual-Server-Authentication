import mongoose from 'mongoose';

const AuxRecordSchema = new mongoose.Schema(
  {
    hashedId: { type: String, required: true, unique: true },
    treg: { type: Date, required: true },
    ai: { type: String, required: true },
    mi: { type: String, required: true },
    alphaStar: { type: String, required: true },
    honeyList: { type: [String], default: [] }
  },
  { timestamps: true }
);

export default mongoose.model('AuxRecord', AuxRecordSchema);

