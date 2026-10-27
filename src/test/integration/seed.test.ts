import CompetenceModel from '../../models/competence.model';
import QuestionModel from '../../models/question.model';
import CompetenceQuestionModel from '../../models/competenceQuestion.model';
import { defaultSeedData } from '../../seed/defaultData';
import { seedDatabase } from '../../seed/seedDatabase';
import { parseQuestionsFile } from '../../seed/questionsFile';
import competencesMock from '../mocks/competencesMock.json';
import { api, authHeader, registerAndLogin } from './helpers';

const byTitle = (a: { title: string }, b: { title: string }) => a.title.localeCompare(b.title);
const titleAndDescription = ({ title, description }: { title: string; description: string }) => ({ title, description });

const totalLinks = defaultSeedData.questions
  .reduce((total, question) => total + (question.competences?.length ?? 0), 0);

describe('Integração - seed do banco', () => {
  it('carrega as 9 competências atuais, com os títulos e as descrições da produção', async () => {
    await seedDatabase(defaultSeedData);

    const saved = await CompetenceModel.find().lean();

    expect(saved.map(titleAndDescription).sort(byTitle))
      .toEqual(competencesMock.map(titleAndDescription).sort(byTitle));
  });

  it('carrega as questões de exemplo e os vínculos com as competências', async () => {
    const result = await seedDatabase(defaultSeedData);

    expect(await QuestionModel.countDocuments()).toBe(defaultSeedData.questions.length);
    expect(await CompetenceQuestionModel.countDocuments()).toBe(totalLinks);
    expect(result).toEqual({
      competences: { total: 9, created: 9 },
      questions: { total: defaultSeedData.questions.length, created: defaultSeedData.questions.length },
      links: { total: totalLinks, created: totalLinks },
    });
  });

  it('as questões de exemplo usam todas as 9 competências', () => {
    const used = new Set(defaultSeedData.questions.flatMap(question => question.competences ?? []));

    expect([...used].sort()).toEqual(defaultSeedData.competences.map(({ title }) => title).sort());
  });

  it('rodar duas vezes não duplica nada', async () => {
    await seedDatabase(defaultSeedData);
    const second = await seedDatabase(defaultSeedData);

    expect(await CompetenceModel.countDocuments()).toBe(9);
    expect(await QuestionModel.countDocuments()).toBe(defaultSeedData.questions.length);
    expect(await CompetenceQuestionModel.countDocuments()).toBe(totalLinks);
    expect(second.competences.created).toBe(0);
    expect(second.questions.created).toBe(0);
    expect(second.links.created).toBe(0);
  });

  it('atualiza pelo título uma questão que já existe', async () => {
    await seedDatabase(defaultSeedData);
    const [first] = defaultSeedData.questions;

    await seedDatabase({ ...defaultSeedData, questions: [{ ...first, response: 'Resposta revisada' }] });

    expect(await QuestionModel.countDocuments({ title: first.title })).toBe(1);
    expect(await QuestionModel.findOne({ title: first.title })).toMatchObject({ response: 'Resposta revisada' });
  });

  it('recusa questão ligada a competência desconhecida, sem gravar questões', async () => {
    const [first] = defaultSeedData.questions;
    const invalid = { ...defaultSeedData, questions: [{ ...first, competences: ['Competência inexistente'] }] };

    await expect(seedDatabase(invalid)).rejects.toThrow('Competência inexistente');
    expect(await QuestionModel.countDocuments()).toBe(0);
  });

  it('importa um export do mongoexport junto com os exemplos, sem duplicar', async () => {
    const [first] = defaultSeedData.questions;
    const exported = [
      { _id: { $oid: '65f374d89eacb37fa06091bb' }, title: first.title, statement: first.statement, type: first.type, font: first.font, response: first.response, __v: 0 },
      { _id: { $oid: '65f374d89eacb37fa06091bc' }, title: 'Questão exportada', statement: 'Enunciado exportado', type: 'mathematics', font: 'other', response: 'Resposta', __v: 0 },
    ].map(item => JSON.stringify(item)).join('\n');

    await seedDatabase(defaultSeedData);
    await seedDatabase({ competences: defaultSeedData.competences, questions: parseQuestionsFile(exported) });

    expect(await QuestionModel.countDocuments()).toBe(defaultSeedData.questions.length + 1);
    expect(await QuestionModel.findOne({ title: 'Questão exportada' })).not.toBeNull();
  });

  it('o que o seed grava é lido pela API como o frontend lê', async () => {
    await seedDatabase(defaultSeedData);
    const token = await registerAndLogin();
    const [first] = defaultSeedData.questions;

    const competences = await api().get('/api/competences');
    const questions = await api().get('/api/questions').set(authHeader(token));
    const saved = questions.body.find((question: { title: string }) => question.title === first.title);
    const links = await api().get(`/api/questions/${saved._id}/competences`).set(authHeader(token));

    expect(competences.body).toHaveLength(9);
    expect(questions.body).toHaveLength(defaultSeedData.questions.length);
    expect(links.body.competences.map(({ title }: { title: string }) => title).sort())
      .toEqual([...(first.competences ?? [])].sort());
  });
});
