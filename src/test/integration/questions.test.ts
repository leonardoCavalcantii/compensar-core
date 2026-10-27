import { Types } from 'mongoose';
import QuestionModel from '../../models/question.model';
import { questionErrorMessages } from '../../utils/questions.validation';
import { api, authHeader, createQuestion, questionPayload, registerAndLogin } from './helpers';

const missingId = () => new Types.ObjectId().toString();

describe('Integração - /api/questions sem login', () => {
  it('GET sem token responde 401', async () => {
    const response = await api().get('/api/questions');

    expect(response.status).toBe(401);
  });

  it('POST sem token responde 401 e não grava nada', async () => {
    const response = await api().post('/api/questions').send(questionPayload());

    expect(response.status).toBe(401);
    expect(await QuestionModel.countDocuments()).toBe(0);
  });
});

describe('Integração - /api/questions com login', () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin();
  });

  it('POST cria a questão e grava todos os campos no banco', async () => {
    const question = questionPayload();

    const response = await api().post('/api/questions').set(authHeader(token)).send(question);

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: `Created '${question.title}' with success` });

    const saved = await QuestionModel.findOne({ title: question.title }).lean();
    expect(saved).toMatchObject(question);
  });

  it('POST recusa corpo inválido com 422 e não grava nada', async () => {
    const response = await api()
      .post('/api/questions')
      .set(authHeader(token))
      .send(questionPayload({ title: '', font: 'revista', alternatives: ['única'] }));

    expect(response.status).toBe(422);
    expect(response.body.message).toContain(questionErrorMessages.titleEmpty);
    expect(response.body.message).toContain(questionErrorMessages.fontMacth);
    expect(response.body.message).toContain(questionErrorMessages.alternativesLenght);
    expect(await QuestionModel.countDocuments()).toBe(0);
  });

  it('POST recusa título repetido e não grava outra questão', async () => {
    await createQuestion(token);

    const response = await api()
      .post('/api/questions')
      .set(authHeader(token))
      .send(questionPayload({ statement: 'Outro enunciado com o mesmo título.' }));

    expect(response.status).toBeGreaterThanOrEqual(400);
    expect(await QuestionModel.countDocuments()).toBe(1);
  });

  it('GET lista as questões com as competências associadas', async () => {
    await createQuestion(token);
    await createQuestion(token, questionPayload({ title: 'Questão de perímetro', statement: 'Qual o perímetro de um quadrado de lado 2?' }));

    const response = await api().get('/api/questions').set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body).toHaveLength(2);
    expect(response.body.map((question: { title: string }) => question.title).sort())
      .toEqual(['Questão de perímetro', 'Questão de área do retângulo']);
    response.body.forEach((question: object) => expect(question).toHaveProperty('competences', []));
  });

  it('GET /:id devolve a questão com as competências', async () => {
    const saved = await createQuestion(token);

    const response = await api().get(`/api/questions/${saved._id}`).set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ _id: String(saved._id), ...questionPayload(), competences: [] });
  });

  it('GET /:id inexistente responde 404', async () => {
    const response = await api().get(`/api/questions/${missingId()}`).set(authHeader(token));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Question not found' });
  });

  it('PUT /:id atualiza a questão no banco', async () => {
    const saved = await createQuestion(token);
    const changes = questionPayload({ title: 'Questão de área revisada', year: 2013, response: '16' });

    const response = await api().put(`/api/questions/${saved._id}`).set(authHeader(token)).send(changes);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: `Updated '${changes.title}' with success` });
    expect(await QuestionModel.findById(saved._id).lean()).toMatchObject(changes);
  });

  it('PUT /:id inexistente responde 404', async () => {
    const response = await api().put(`/api/questions/${missingId()}`).set(authHeader(token)).send(questionPayload());

    expect(response.status).toBe(404);
  });

  it('PUT /:id recusa corpo inválido com 422 e não altera o banco', async () => {
    const saved = await createQuestion(token);

    const response = await api()
      .put(`/api/questions/${saved._id}`)
      .set(authHeader(token))
      .send(questionPayload({ response: '' }));

    expect(response.status).toBe(422);
    expect(await QuestionModel.findById(saved._id).lean()).toMatchObject(questionPayload());
  });

  it('DELETE /:id remove a questão do banco', async () => {
    const saved = await createQuestion(token);

    const response = await api().delete(`/api/questions/${saved._id}`).set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: `Delete question '${saved.title}' with success` });
    expect(await QuestionModel.findById(saved._id)).toBeNull();
  });

  it('DELETE /:id inexistente responde 404', async () => {
    const response = await api().delete(`/api/questions/${missingId()}`).set(authHeader(token));

    expect(response.status).toBe(404);
  });
});

// P4: o .escape() dos validadores troca "<" por "&lt;" e "/" por "&#x2F;",
// corrompendo enunciados e URLs. test.failing passa enquanto o defeito
// existir; a US-07 troca por um teste normal.
describe('Integração - P4: texto corrompido ao salvar', () => {
  const statement = 'x < 3';
  const image = 'https://exemplo.com/figura.png';
  let token: string;
  let questionId: string;

  beforeEach(async () => {
    token = await registerAndLogin();
    const saved = await createQuestion(token, questionPayload({ statement, image }));
    questionId = String(saved._id);
  });

  test.failing('enunciado "x < 3" e imagem com URL voltam iguais ao que foi enviado', async () => {
    const response = await api().get(`/api/questions/${questionId}`).set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ statement, image });
    expect(await QuestionModel.findById(questionId).lean()).toMatchObject({ statement, image });
  });
});
