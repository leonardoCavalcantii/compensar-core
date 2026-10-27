import { getMongoServer, setMongoServer } from './memoryServer';

export default async function globalTeardown() {
  // stop() encerra o mongod e apaga o diretório temporário com os dados.
  await getMongoServer()?.stop();
  setMongoServer(undefined);
}
