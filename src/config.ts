// Toda configuração do backend vem de variáveis de ambiente (veja o .env.example).
// Nenhum endereço de banco, chave ou porta fica fixo no código.

type Env = Record<string, string | undefined>;

export interface AppConfig {
  port: number;
  mongoUri: string;
  privateKey: string;
}

const DEFAULT_PORT = 8080;
const MAX_PORT = 65535;

// As mensagens citam só o nome das variáveis, nunca o valor.
export class ConfigError extends Error {
  status = 500;

  constructor(message: string) {
    super(message);
    this.name = 'ConfigError';
  }
}

const isBlank = (value?: string) => !value || value.trim() === '';

const requireVariables = <Name extends string>(env: Env, names: Name[]) => {
  const missing = names.filter(name => isBlank(env[name]));

  if (missing.length > 0)
    throw new ConfigError(`Variáveis de ambiente obrigatórias não definidas: ${missing.join(', ')}. Veja o .env.example.`);

  return Object.fromEntries(names.map(name => [name, env[name]])) as Record<Name, string>;
};

export const getPort = (env: Env = process.env): number => {
  if (isBlank(env.PORT))
    return DEFAULT_PORT;

  const port = Number(env.PORT);

  if (!Number.isInteger(port) || port < 1 || port > MAX_PORT)
    throw new ConfigError(`PORT precisa ser um número inteiro entre 1 e ${MAX_PORT}.`);

  return port;
};

export const getMongoUri = (env: Env = process.env): string =>
  requireVariables(env, ['MONGO_URI']).MONGO_URI;

export const getPrivateKey = (env: Env = process.env): string =>
  requireVariables(env, ['PRIVATE_KEY']).PRIVATE_KEY;

export const loadConfig = (env: Env = process.env): AppConfig => {
  const { MONGO_URI, PRIVATE_KEY } = requireVariables(env, ['MONGO_URI', 'PRIVATE_KEY']);

  return { port: getPort(env), mongoUri: MONGO_URI, privateKey: PRIVATE_KEY };
};
