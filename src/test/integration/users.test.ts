import bcrypt from 'bcrypt';
import UserModel from '../../models/user.model';
import { userErrorMessages } from '../../utils/users.validation';
import { api, authHeader, registerAndLogin, userPayload } from './helpers';

describe('Integração - POST /api/users', () => {
  it('cadastra o usuário e grava a senha como hash bcrypt', async () => {
    const user = userPayload();

    const response = await api().post('/api/users').send(user);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: `Created '${user.username}' with success` });

    const saved = await UserModel.findOne({ username: user.username });
    expect(saved).toMatchObject({ name: user.name, username: user.username, email: user.email });
    expect(saved?.password).not.toBe(user.password);
    expect(await bcrypt.compare(user.password, saved?.password as string)).toBe(true);
  });

  it('recusa username repetido com 409 e não grava outro registro', async () => {
    await api().post('/api/users').send(userPayload());

    const response = await api().post('/api/users').send(userPayload({ email: 'outra@exemplo.com' }));

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: `Exist user with: ${userPayload().username}` });
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it('recusa e-mail repetido com 409 e não grava outro registro', async () => {
    await api().post('/api/users').send(userPayload());

    const response = await api().post('/api/users').send(userPayload({ username: 'outra' }));

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: `Exist user with: ${userPayload().email}` });
    expect(await UserModel.countDocuments()).toBe(1);
  });

  it('recusa corpo inválido com 422 e não grava nada', async () => {
    const response = await api().post('/api/users').send(userPayload({ email: 'invalido', password: 'fraca' }));

    expect(response.status).toBe(422);
    expect(response.body.message).toContain(userErrorMessages.emailInvalid);
    expect(response.body.message).toContain(userErrorMessages.passwordLength);
    expect(await UserModel.countDocuments()).toBe(0);
  });
});

describe('Integração - autenticação das rotas de usuário', () => {
  it('GET /api/users sem token responde 401', async () => {
    const response = await api().get('/api/users');

    expect(response.status).toBe(401);
    expect(response.body).toEqual({ message: 'Authentication token not provided.' });
  });

  it('GET /api/users com token inválido responde 498', async () => {
    const response = await api().get('/api/users').set(authHeader('token-invalido'));

    expect(response.status).toBe(498);
    expect(response.body).toEqual({ message: 'Invalid token.' });
  });
});

describe('Integração - rotas de usuário com login', () => {
  let token: string;
  let otherUserId: string;

  beforeEach(async () => {
    token = await registerAndLogin();

    const other = userPayload({ username: 'outra', email: 'outra@exemplo.com' });
    await api().post('/api/users').send(other);
    otherUserId = String((await UserModel.findOne({ username: other.username }))?._id);
  });

  it('GET /api/users lista os usuários sem o campo password', async () => {
    const response = await api().get('/api/users').set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((user: { username: string }) => user.username).sort()).toEqual(['outra', 'professora']);
    response.body.forEach((user: object) => expect(user).not.toHaveProperty('password'));
  });

  it('GET /api/users/:id de outro usuário responde 403', async () => {
    const response = await api().get(`/api/users/${otherUserId}`).set(authHeader(token));

    expect(response.status).toBe(403);
  });

  it('PUT /api/users/:id de outro usuário responde 403 e não altera o banco', async () => {
    const response = await api()
      .put(`/api/users/${otherUserId}`)
      .set(authHeader(token))
      .send(userPayload({ username: 'invasora', email: 'invasora@exemplo.com' }));

    expect(response.status).toBe(403);
    expect(await UserModel.findById(otherUserId)).toMatchObject({ username: 'outra', email: 'outra@exemplo.com' });
  });

  it('DELETE /api/users/:id de outro usuário responde 403 e não apaga o registro', async () => {
    const response = await api().delete(`/api/users/${otherUserId}`).set(authHeader(token));

    expect(response.status).toBe(403);
    expect(await UserModel.findById(otherUserId)).not.toBeNull();
  });
});
