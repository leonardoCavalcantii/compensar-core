import mongoose from 'mongoose';

// Folga para conexão, criação de índices e hash bcrypt em máquinas lentas (CI).
jest.setTimeout(30000);

const LOCAL_HOSTS = ['127.0.0.1', 'localhost'];

const getTestDatabaseUri = () => {
  const uri = process.env.TEST_MONGO_URI;

  if (!uri)
    throw new Error('TEST_MONGO_URI não definida: o globalSetup não subiu o MongoDB temporário.');

  if (!LOCAL_HOSTS.includes(new URL(uri).hostname))
    throw new Error('Os testes de integração só podem usar o MongoDB temporário local.');

  return uri;
};

beforeAll(async () => {
  // Um banco por worker do Jest, para que arquivos rodando em paralelo não se misturem.
  await mongoose.connect(getTestDatabaseUri(), { dbName: `compensar-test-${process.env.JEST_WORKER_ID}` });

  // Garante os índices únicos (username, email, title...) antes do primeiro teste.
  await Promise.all(mongoose.modelNames().map(name => mongoose.model(name).init()));
});

afterEach(async () => {
  const collections = await mongoose.connection.db.collections();
  await Promise.all(collections.map(collection => collection.deleteMany({})));
});

afterAll(async () => {
  await mongoose.connection.dropDatabase();
  await mongoose.disconnect();
});
