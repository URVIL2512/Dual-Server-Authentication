import dotenv from 'dotenv';

dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  mongoUri: process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/dual-server-iot',
  honeyMax: parseInt(process.env.HONEY_MAX ?? '10', 10)
};

