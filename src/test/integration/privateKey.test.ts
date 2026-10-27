import { api, authHeader, registerAndLogin, userPayload } from './helpers';

// Sem PRIVATE_KEY o servidor nem sobe (loadConfig). Mesmo assim, as rotas não podem
// cair num valor padrão: assinar ou verificar token com chave vazia não pode acontecer.
describe('Integração - PRIVATE_KEY ausente', () => {
  const privateKey = process.env.PRIVATE_KEY;

  afterEach(() => {
    process.env.PRIVATE_KEY = privateKey;
  });

  it('o login responde 500 e não devolve token', async () => {
    const user = userPayload();
    await api().post('/api/users').send(user);
    delete process.env.PRIVATE_KEY;

    const response = await api().post('/api/login').send({ username: user.username, password: user.password });

    expect(response.status).toBe(500);
    expect(response.body.token).toBeUndefined();
    expect(response.body.message).toContain('PRIVATE_KEY');
  });

  it('a rota protegida responde 500 em vez de verificar o token com chave vazia', async () => {
    const token = await registerAndLogin();
    delete process.env.PRIVATE_KEY;

    const response = await api().get('/api/questions').set(authHeader(token));

    expect(response.status).toBe(500);
    expect(response.body.message).toContain('PRIVATE_KEY');
  });

  it('a falta de token continua respondendo 401', async () => {
    delete process.env.PRIVATE_KEY;

    const response = await api().get('/api/questions');

    expect(response.status).toBe(401);
  });
});
