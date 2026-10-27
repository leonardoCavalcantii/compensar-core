import request from 'supertest';
import app from '../../app';
import QuestionModel from '../../models/question.model';
import CompetenceModel from '../../models/competence.model';

export const api = () => request(app);

export const authHeader = (token: string) => ({ Authorization: `Bearer ${token}` });

export const userPayload = (overrides: Record<string, unknown> = {}) => ({
  name: 'Professora Teste',
  username: 'professora',
  email: 'professora@exemplo.com',
  password: '#Senha123',
  ...overrides,
});

export const competencePayload = (overrides: Record<string, unknown> = {}) => ({
  title: 'Coleta de Dados',
  description: 'Obter ou gerar dados através de observações empíricas ou de figuras, tabelas e gráficos.',
  ...overrides,
});

export const questionPayload = (overrides: Record<string, unknown> = {}) => ({
  title: 'Questão de área do retângulo',
  statement: 'Um retângulo tem lados 5 e 3. Qual é a sua área?',
  type: 'mathematics',
  font: 'enem',
  year: 2012,
  alternatives: ['8', '15', '16'],
  response: '15',
  ...overrides,
});

// Cadastra e faz login pelas mesmas rotas que o frontend usa.
export const registerAndLogin = async (user = userPayload()) => {
  const signUp = await api().post('/api/users').send(user);
  expect(signUp.status).toBe(201);

  const login = await api().post('/api/login').send({ username: user.username, password: user.password });
  expect(login.status).toBe(200);

  return login.body.token as string;
};

// POST /api/questions só devolve uma mensagem; o id é lido do banco.
export const createQuestion = async (token: string, question = questionPayload()) => {
  const response = await api().post('/api/questions').set(authHeader(token)).send(question);
  expect(response.status).toBe(201);

  const saved = await QuestionModel.findOne({ title: question.title });
  if (!saved) throw new Error(`Questão '${question.title}' não foi gravada`);

  return saved;
};

export const createCompetence = async (competence = competencePayload()) => {
  const response = await api().post('/api/competences').send(competence);
  expect(response.status).toBe(201);

  const saved = await CompetenceModel.findById(response.body._id);
  if (!saved) throw new Error(`Competência '${competence.title}' não foi gravada`);

  return saved;
};
