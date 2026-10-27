import dotenv from 'dotenv';
dotenv.config();

import mongoose from 'mongoose';
import app from './app';
import { loadConfig } from './config';

const startServer = async () => {
  const { port, mongoUri } = loadConfig();

  await mongoose.connect(mongoUri);
  console.log('Connected to MongoDB');

  app.listen(port, () => {
    console.log(`Server is running on port ${port}`);
  });
};

startServer().catch(err => {
  console.error('Erro ao iniciar o servidor:', err.message);
  process.exit(1);
});
