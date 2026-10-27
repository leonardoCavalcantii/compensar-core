import { MongoMemoryServer } from 'mongodb-memory-server';
import { setMongoServer } from './memoryServer';

export default async function globalSetup() {
  const mongoServer = await MongoMemoryServer.create();

  setMongoServer(mongoServer);
  process.env.TEST_MONGO_URI = mongoServer.getUri();
}
