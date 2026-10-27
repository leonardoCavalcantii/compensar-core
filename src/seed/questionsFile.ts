import { mongo } from 'mongoose';
import { QuestionSeed } from './seedDatabase';

type Env = Record<string, string | undefined>;

const QUESTIONS_FLAG = '--questions';
const REQUIRED_FIELDS = ['title', 'statement', 'type', 'font', 'response'];
// Campos do Mongo que não fazem sentido em outro banco.
const IGNORED_FIELDS = ['_id', '__v'];

const { EJSON } = mongo.BSON;

// Caminho do arquivo de questões: --questions <arquivo>, --questions=<arquivo> ou SEED_QUESTIONS_FILE.
export const getQuestionsFilePath = (argv: string[], env: Env): string | undefined => {
  const index = argv.findIndex(arg => arg === QUESTIONS_FLAG || arg.startsWith(`${QUESTIONS_FLAG}=`));

  if (index === -1)
    return env.SEED_QUESTIONS_FILE?.trim() || undefined;

  const path = argv[index] === QUESTIONS_FLAG ? argv[index + 1] : argv[index].slice(QUESTIONS_FLAG.length + 1);

  if (!path || path.startsWith('--'))
    throw new Error(`Informe o caminho do arquivo depois de ${QUESTIONS_FLAG}.`);

  return path;
};

// Aceita um array JSON ou JSON Lines, inclusive o Extended JSON do mongoexport ($oid, $numberInt...).
export const parseQuestionsFile = (content: string): QuestionSeed[] => {
  const documents = parseDocuments(content);

  if (documents.length === 0)
    throw new Error('O arquivo não tem nenhuma questão.');

  return documents.map((document, index) => toQuestion(document, index + 1));
};

const parseJson = (text: string, where: string): unknown => {
  try {
    return EJSON.parse(text, { relaxed: true });
  } catch (err) {
    throw new Error(`JSON inválido ${where}: ${err.message}`);
  }
};

const parseDocuments = (content: string): unknown[] => {
  const text = content.trim();

  if (text.startsWith('[')) {
    const documents = parseJson(text, 'no arquivo');
    return Array.isArray(documents) ? documents : [documents];
  }

  return content
    .split(/\r?\n/)
    .map((line, index) => ({ line: line.trim(), number: index + 1 }))
    .filter(({ line }) => line !== '')
    .map(({ line, number }) => parseJson(line, `na linha ${number}`));
};

const isFilledString = (value: unknown) => typeof value === 'string' && value.trim() !== '';

const toQuestion = (document: unknown, position: number): QuestionSeed => {
  if (!document || typeof document !== 'object' || Array.isArray(document))
    throw new Error(`A questão ${position} do arquivo não é um objeto JSON.`);

  const fields: Record<string, unknown> = Object.fromEntries(
    Object.entries(document).filter(([name]) => !IGNORED_FIELDS.includes(name))
  );

  const missing = REQUIRED_FIELDS.filter(name => !isFilledString(fields[name]));
  if (missing.length > 0)
    throw new Error(`A questão ${position} do arquivo não tem os campos obrigatórios: ${missing.join(', ')}.`);

  const { competences } = fields;
  if (competences !== undefined && (!Array.isArray(competences) || !competences.every(isFilledString)))
    throw new Error(`A questão ${position} do arquivo tem competences inválido: use uma lista de títulos.`);

  return fields as unknown as QuestionSeed;
};
