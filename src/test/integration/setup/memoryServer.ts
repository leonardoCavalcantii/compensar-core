import { MongoMemoryServer } from 'mongodb-memory-server';

// O globalSetup e o globalTeardown rodam no processo principal do Jest,
// por isso a instância do MongoDB temporário é compartilhada pelo globalThis.
type GlobalWithMongoServer = typeof globalThis & { __MONGO_MEMORY_SERVER__?: MongoMemoryServer };

export const getMongoServer = () => (globalThis as GlobalWithMongoServer).__MONGO_MEMORY_SERVER__;

export const setMongoServer = (server?: MongoMemoryServer) => {
  (globalThis as GlobalWithMongoServer).__MONGO_MEMORY_SERVER__ = server;
};
