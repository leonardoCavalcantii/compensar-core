import { getQuestionsFilePath, parseQuestionsFile } from '../seed/questionsFile';

const question = {
  title: 'Questão de área do retângulo',
  statement: 'Um retângulo tem lados 5 e 3. Qual é a sua área?',
  type: 'mathematics',
  font: 'enem',
  year: 2012,
  alternatives: ['8', '15', '16'],
  response: '15',
};

describe('Seed - parseQuestionsFile', () => {
  it('lê um array JSON de questões', () => {
    expect(parseQuestionsFile(JSON.stringify([question]))).toEqual([question]);
  });

  it('lê o JSON Lines do mongoexport, removendo _id e __v e convertendo os tipos', () => {
    const exported = [
      JSON.stringify({ _id: { $oid: '65f374d89eacb37fa06091bb' }, ...question, year: { $numberInt: '2012' }, __v: { $numberInt: '0' } }),
      '',
      JSON.stringify({ _id: { $oid: '65f374d89eacb37fa06091bc' }, ...question, title: 'Outra questão', statement: 'Outro enunciado', __v: 0 }),
    ].join('\r\n');

    expect(parseQuestionsFile(exported)).toEqual([
      question,
      { ...question, title: 'Outra questão', statement: 'Outro enunciado' },
    ]);
  });

  it('lê o array do mongoexport --jsonArray', () => {
    const exported = JSON.stringify([{ _id: { $oid: '65f374d89eacb37fa06091bb' }, ...question, __v: 0 }]);

    expect(parseQuestionsFile(exported)).toEqual([question]);
  });

  it('mantém a lista de competências (títulos) quando ela vem no arquivo', () => {
    const withCompetences = { ...question, competences: ['Abstração'] };

    expect(parseQuestionsFile(JSON.stringify([withCompetences]))).toEqual([withCompetences]);
  });

  it('recusa arquivo vazio', () => {
    expect(() => parseQuestionsFile('  \n ')).toThrow('nenhuma questão');
  });

  it('recusa JSON inválido dizendo a linha', () => {
    expect(() => parseQuestionsFile(`${JSON.stringify(question)}\n{ quebrado`)).toThrow('linha 2');
  });

  it('recusa questão sem campo obrigatório dizendo qual é', () => {
    const { statement, ...withoutStatement } = question;

    expect(statement).toBeDefined();
    expect(() => parseQuestionsFile(JSON.stringify([question, withoutStatement]))).toThrow(/questão 2.*statement/);
  });

  it('recusa competences que não seja uma lista de títulos', () => {
    expect(() => parseQuestionsFile(JSON.stringify([{ ...question, competences: 'Abstração' }]))).toThrow('competences');
  });
});

describe('Seed - getQuestionsFilePath', () => {
  it('não usa arquivo quando nada é informado', () => {
    expect(getQuestionsFilePath([], {})).toBeUndefined();
  });

  it('lê o caminho de --questions <arquivo> e de --questions=<arquivo>', () => {
    expect(getQuestionsFilePath(['--questions', 'export.json'], {})).toBe('export.json');
    expect(getQuestionsFilePath(['--questions=export.json'], {})).toBe('export.json');
  });

  it('usa SEED_QUESTIONS_FILE quando não há argumento', () => {
    expect(getQuestionsFilePath([], { SEED_QUESTIONS_FILE: 'export.json' })).toBe('export.json');
  });

  it('o argumento tem prioridade sobre a variável', () => {
    expect(getQuestionsFilePath(['--questions', 'arg.json'], { SEED_QUESTIONS_FILE: 'env.json' })).toBe('arg.json');
  });

  it('recusa --questions sem caminho', () => {
    expect(() => getQuestionsFilePath(['--questions'], {})).toThrow('--questions');
  });
});
