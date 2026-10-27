import { Types } from 'mongoose';
import CompetenceQuestionModel from '../../models/competenceQuestion.model';
import { api, authHeader, competencePayload, createCompetence, createQuestion, registerAndLogin } from './helpers';

const missingId = () => new Types.ObjectId().toString();

describe('Integração - associação entre questão e competência', () => {
  let token: string;
  let questionId: string;
  let competenceId: string;

  const associate = (body: { questionId: string, competenceId: string }) =>
    api().post('/api/questions/competences').set(authHeader(token)).send(body);

  beforeEach(async () => {
    token = await registerAndLogin();
    questionId = String((await createQuestion(token))._id);
    competenceId = String((await createCompetence())._id);
  });

  it('POST sem token responde 401 e não grava a relação', async () => {
    const response = await api().post('/api/questions/competences').send({ questionId, competenceId });

    expect(response.status).toBe(401);
    expect(await CompetenceQuestionModel.countDocuments()).toBe(0);
  });

  it('POST associa a competência à questão e grava a relação', async () => {
    const response = await associate({ questionId, competenceId });

    expect(response.status).toBe(201);
    expect(response.body).toEqual({ message: 'Created with success' });

    const relations = await CompetenceQuestionModel.find().lean();
    expect(relations).toHaveLength(1);
    expect(String(relations[0].question)).toBe(questionId);
    expect(String(relations[0].competence)).toBe(competenceId);
  });

  it('POST repetido responde 409 e não duplica a relação', async () => {
    await associate({ questionId, competenceId });

    const response = await associate({ questionId, competenceId });

    expect(response.status).toBe(409);
    expect(response.body).toEqual({ message: 'Exist relation' });
    expect(await CompetenceQuestionModel.countDocuments()).toBe(1);
  });

  it('POST com competência inexistente responde 404', async () => {
    const response = await associate({ questionId, competenceId: missingId() });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Competence not found' });
    expect(await CompetenceQuestionModel.countDocuments()).toBe(0);
  });

  it('POST com questão inexistente responde 404', async () => {
    const response = await associate({ questionId: missingId(), competenceId });

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Question not found' });
    expect(await CompetenceQuestionModel.countDocuments()).toBe(0);
  });

  it('GET /api/questions/:id/competences lista as competências da questão', async () => {
    const otherCompetenceId = String((await createCompetence(competencePayload({ title: 'Análise de Dados' })))._id);
    await associate({ questionId, competenceId });
    await associate({ questionId, competenceId: otherCompetenceId });

    const response = await api().get(`/api/questions/${questionId}/competences`).set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body.title).toBe('Questão de área do retângulo');
    expect(response.body.competences.map((competence: { _id: string }) => competence._id).sort())
      .toEqual([competenceId, otherCompetenceId].sort());
  });

  it('GET /api/questions/:id/competences sem associação devolve lista vazia', async () => {
    const response = await api().get(`/api/questions/${questionId}/competences`).set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body).toEqual([]);
  });

  it('GET /api/competences/:id/questions lista as questões da competência', async () => {
    await associate({ questionId, competenceId });

    const response = await api().get(`/api/competences/${competenceId}/questions`).set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ id: competenceId, title: competencePayload().title });
    expect(response.body.questions).toHaveLength(1);
    expect(response.body.questions[0]).toMatchObject({ _id: questionId, title: 'Questão de área do retângulo' });
  });

  it('GET /api/questions e /api/questions/:id trazem as competências associadas', async () => {
    await associate({ questionId, competenceId });

    const list = await api().get('/api/questions').set(authHeader(token));
    const detail = await api().get(`/api/questions/${questionId}`).set(authHeader(token));

    expect(list.status).toBe(200);
    expect(list.body[0].competences).toEqual([expect.objectContaining({ _id: competenceId, ...competencePayload() })]);
    expect(detail.status).toBe(200);
    expect(detail.body.competences).toEqual([expect.objectContaining({ _id: competenceId, ...competencePayload() })]);
  });

  it('DELETE remove a relação do banco', async () => {
    await associate({ questionId, competenceId });

    const response = await api().delete(`/api/questions/${questionId}/competences/${competenceId}`).set(authHeader(token));

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: 'Delete relation with success' });
    expect(await CompetenceQuestionModel.countDocuments()).toBe(0);
  });

  it('DELETE de relação inexistente responde 404', async () => {
    const response = await api().delete(`/api/questions/${questionId}/competences/${competenceId}`).set(authHeader(token));

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Relation not found' });
  });
});
