import { Types } from 'mongoose';
import CompetenceModel from '../../models/competence.model';
import { competenceErrorMessages } from '../../utils/competences.validation';
import { api, competencePayload, createCompetence } from './helpers';

const missingId = () => new Types.ObjectId().toString();

describe('Integração - /api/competences', () => {
  it('POST cria a competência e grava no banco', async () => {
    const competence = competencePayload();

    const response = await api().post('/api/competences').send(competence);

    expect(response.status).toBe(201);
    expect(response.body).toMatchObject({ _id: expect.any(String), ...competence });
    expect(await CompetenceModel.findById(response.body._id)).toMatchObject(competence);
  });

  it('POST recusa corpo inválido com 422 e não grava nada', async () => {
    const response = await api().post('/api/competences').send({ title: 'ab', description: '' });

    expect(response.status).toBe(422);
    expect(response.body.message).toContain(competenceErrorMessages.titleLength);
    expect(response.body.message).toContain(competenceErrorMessages.descriptionEmpty);
    expect(await CompetenceModel.countDocuments()).toBe(0);
  });

  it('GET lista as competências gravadas', async () => {
    await createCompetence();
    await createCompetence(competencePayload({ title: 'Análise de Dados' }));

    const response = await api().get('/api/competences');

    expect(response.status).toBe(200);
    expect(response.body.map((competence: { title: string }) => competence.title).sort())
      .toEqual(['Análise de Dados', 'Coleta de Dados']);
  });

  it('GET /:id devolve a competência', async () => {
    const saved = await createCompetence();

    const response = await api().get(`/api/competences/${saved._id}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({ _id: String(saved._id), ...competencePayload() });
  });

  it('GET /:id inexistente responde 404', async () => {
    const response = await api().get(`/api/competences/${missingId()}`);

    expect(response.status).toBe(404);
    expect(response.body).toEqual({ message: 'Competence not found' });
  });

  it('PUT /:id atualiza a competência no banco', async () => {
    const saved = await createCompetence();
    const changes = { title: 'Modelagem', description: 'Representar o problema por meio de um modelo matemático.' };

    const response = await api().put(`/api/competences/${saved._id}`).send(changes);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject(changes);
    expect(await CompetenceModel.findById(saved._id)).toMatchObject(changes);
  });

  it('PUT /:id inexistente responde 404', async () => {
    const response = await api().put(`/api/competences/${missingId()}`).send(competencePayload());

    expect(response.status).toBe(404);
  });

  it('PUT /:id recusa corpo inválido com 422 e não altera o banco', async () => {
    const saved = await createCompetence();

    const response = await api().put(`/api/competences/${saved._id}`).send({ title: '', description: 'abc' });

    expect(response.status).toBe(422);
    expect(await CompetenceModel.findById(saved._id)).toMatchObject(competencePayload());
  });

  it('DELETE /:id remove a competência do banco', async () => {
    const saved = await createCompetence();

    const response = await api().delete(`/api/competences/${saved._id}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ message: `Delete competence '${saved.title}' with success` });
    expect(await CompetenceModel.findById(saved._id)).toBeNull();
  });

  it('DELETE /:id inexistente responde 404', async () => {
    const response = await api().delete(`/api/competences/${missingId()}`);

    expect(response.status).toBe(404);
  });
});
