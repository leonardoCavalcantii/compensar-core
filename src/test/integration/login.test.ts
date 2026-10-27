import jwt from 'jsonwebtoken';
import UserModel from '../../models/user.model';
import { api, authHeader, registerAndLogin, userPayload } from './helpers';

describe('Integração - POST /api/login', () => {
  const user = userPayload();

  beforeEach(async () => {
    const response = await api().post('/api/users').send(user);
    expect(response.status).toBe(201);
  });

  it('faz login com username e devolve um token assinado com a chave do servidor', async () => {
    const response = await api().post('/api/login').send({ username: user.username, password: user.password });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
    expect(() => jwt.verify(response.body.token, process.env.PRIVATE_KEY as string)).not.toThrow();
  });

  it('faz login com e-mail', async () => {
    const response = await api().post('/api/login').send({ email: user.email, password: user.password });

    expect(response.status).toBe(200);
    expect(typeof response.body.token).toBe('string');
  });

  it('o token permite acessar uma rota protegida', async () => {
    const login = await api().post('/api/login').send({ username: user.username, password: user.password });

    const response = await api().get('/api/questions').set(authHeader(login.body.token));

    expect(response.status).toBe(200);
  });

  it('recusa senha errada com 401', async () => {
    const response = await api().post('/api/login').send({ username: user.username, password: '#Errada123' });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Credenciais inválidas' });
  });

  it('recusa usuário inexistente com 401', async () => {
    const response = await api().post('/api/login').send({ username: 'ninguem', password: user.password });

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Credenciais inválidas' });
  });
});

// P1: o login assina o JWT com { id: user.id }, mas o campo id do schema nunca é
// preenchido. O token sai sem identificação e o próprio usuário recebe 403.
// test.failing passa enquanto o defeito existir; a US-05 troca por um teste normal.
describe('Integração - P1: login que não identifica o usuário', () => {
  let token: string;
  let userId: string;

  beforeEach(async () => {
    token = await registerAndLogin();

    const saved = await UserModel.findOne({ username: userPayload().username });
    expect(saved).not.toBeNull();
    userId = String(saved?._id);
  });

  test.failing('GET /api/users/:id do próprio usuário responde 200', async () => {
    const response = await api().get(`/api/users/${userId}`).set(authHeader(token));

    expect(response.status).toBe(200);
  });
});
