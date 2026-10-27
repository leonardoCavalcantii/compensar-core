import { getMongoUri, getPort, getPrivateKey, loadConfig } from '../config';

const validEnv = {
  PORT: '9090',
  MONGO_URI: 'mongodb://localhost:27017/compensar',
  PRIVATE_KEY: 'chave-de-teste',
};

describe('Configuração - loadConfig', () => {
  it('lê a porta, o endereço do banco e a chave das variáveis de ambiente', () => {
    expect(loadConfig(validEnv)).toEqual({
      port: 9090,
      mongoUri: validEnv.MONGO_URI,
      privateKey: validEnv.PRIVATE_KEY,
    });
  });

  it('usa a porta 8080 quando PORT não está definida', () => {
    const { PORT, ...env } = validEnv;

    expect(PORT).toBeDefined();
    expect(loadConfig(env).port).toBe(8080);
  });

  it.each(['MONGO_URI', 'PRIVATE_KEY'])('falha quando %s não está definida', name => {
    const env: Record<string, string | undefined> = { ...validEnv, [name]: undefined };

    expect(() => loadConfig(env)).toThrow(name);
  });

  it.each(['', '   '])('trata %p como variável não definida', value => {
    expect(() => loadConfig({ ...validEnv, PRIVATE_KEY: value })).toThrow('PRIVATE_KEY');
  });

  it('lista de uma vez todas as variáveis que faltam', () => {
    expect(() => loadConfig({})).toThrow(/MONGO_URI.*PRIVATE_KEY/);
  });

  it('não expõe os valores das variáveis na mensagem de erro', () => {
    const secretUri = 'mongodb://usuario:senha-secreta@banco:27017/compensar';

    expect(() => loadConfig({ MONGO_URI: secretUri })).toThrow('PRIVATE_KEY');
    try {
      loadConfig({ MONGO_URI: secretUri });
    } catch (err) {
      expect(err.message).not.toContain('senha-secreta');
    }
  });

  it.each(['abc', '0', '70000', '80.5'])('recusa PORT inválida (%p) sem mostrar o valor', value => {
    expect(() => loadConfig({ ...validEnv, PORT: value })).toThrow('PORT');
    try {
      loadConfig({ ...validEnv, PORT: value });
    } catch (err) {
      expect(err.message).not.toContain(value);
    }
  });
});

describe('Configuração - leitura de uma variável', () => {
  it('getPrivateKey devolve a chave definida', () => {
    expect(getPrivateKey({ PRIVATE_KEY: 'k' })).toBe('k');
  });

  it('getPrivateKey falha em vez de devolver chave vazia', () => {
    expect(() => getPrivateKey({})).toThrow('PRIVATE_KEY');
    expect(() => getPrivateKey({ PRIVATE_KEY: '' })).toThrow('PRIVATE_KEY');
  });

  it('getMongoUri não depende de PRIVATE_KEY (usado pelo seed)', () => {
    expect(getMongoUri({ MONGO_URI: validEnv.MONGO_URI })).toBe(validEnv.MONGO_URI);
    expect(() => getMongoUri({})).toThrow('MONGO_URI');
  });

  it('getPort usa 8080 por padrão', () => {
    expect(getPort({})).toBe(8080);
  });
});
