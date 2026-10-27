import type { Response } from 'superagent';
import QuestionModel from '../../models/question.model';
import { api, authHeader, createQuestion, questionPayload, registerAndLogin } from './helpers';

// Junta o corpo binário da resposta, que o supertest não guarda para application/pdf.
const binaryParser = (res: Response, callback: (err: Error | null, body: Buffer) => void) => {
  const chunks: Buffer[] = [];
  res.on('data', (chunk: Buffer) => chunks.push(chunk));
  res.on('end', () => callback(null, Buffer.concat(chunks)));
};

describe('Integração - POST /api/pdf', () => {
  let token: string;

  beforeEach(async () => {
    token = await registerAndLogin();
    await createQuestion(token);
    await createQuestion(token, questionPayload({
      title: 'Questão de perímetro',
      statement: 'Qual o perímetro de um quadrado de lado 2?',
      alternatives: ['4', '8'],
      response: '8',
    }));
  });

  it('gera o PDF da lista montada com as questões do banco, sem alterar o banco', async () => {
    // Como o frontend: busca as questões e envia { title, questions } para /api/pdf.
    const questions = await api().get('/api/questions').set(authHeader(token));
    expect(questions.status).toBe(200);
    const before = await QuestionModel.find().lean();

    const response = await api()
      .post('/api/pdf')
      .send({ title: 'Lista 1', questions: questions.body })
      .buffer(true)
      .parse(binaryParser);

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toBe('application/pdf');
    expect(response.headers['content-disposition']).toBe('attachment; filename=Lista 1.pdf');

    const pdf = response.body as Buffer;
    expect(pdf.subarray(0, 5).toString()).toBe('%PDF-');
    expect(pdf.subarray(-6).toString()).toContain('%%EOF');

    expect(await QuestionModel.find().lean()).toEqual(before);
  });
});
