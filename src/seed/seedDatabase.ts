import { Types } from 'mongoose';
import CompetenceModel from '../models/competence.model';
import QuestionModel from '../models/question.model';
import CompetenceQuestionModel from '../models/competenceQuestion.model';

export interface CompetenceSeed {
  title: string;
  description: string;
}

// Mesmos campos do model Question; competences traz os títulos das competências ligadas.
export interface QuestionSeed {
  title: string;
  statement: string;
  image?: string;
  type: string;
  font: string;
  year?: number;
  alternatives?: string[];
  response: string;
  competences?: string[];
}

export interface SeedData {
  competences: CompetenceSeed[];
  questions: QuestionSeed[];
}

interface Count {
  total: number;
  created: number;
}

export interface SeedResult {
  competences: Count;
  questions: Count;
  links: Count;
}

// Idempotente: competências e questões são identificadas pelo título (único) e
// atualizadas se já existirem; vínculos só são criados se ainda não existirem.
export const seedDatabase = async ({ competences, questions }: SeedData): Promise<SeedResult> => {
  const competencesCount = await seedCompetences(competences);
  const competenceIds = await findCompetenceIds(questions);
  const { questionsCount, linksCount } = await seedQuestions(questions, competenceIds);

  return { competences: competencesCount, questions: questionsCount, links: linksCount };
};

const seedCompetences = async (competences: CompetenceSeed[]): Promise<Count> => {
  let created = 0;

  for (const { title, description } of competences) {
    const result = await CompetenceModel.updateOne({ title }, { $set: { description } }, { upsert: true });
    created += result.upsertedCount;
  }

  return { total: competences.length, created };
};

// Confere todos os títulos antes de gravar qualquer questão.
const findCompetenceIds = async (questions: QuestionSeed[]) => {
  const titles = [...new Set(questions.flatMap(question => question.competences ?? []))];
  const found = await CompetenceModel.find({ title: { $in: titles } });
  const ids = new Map<string, Types.ObjectId>(found.map(competence => [competence.title, competence._id]));
  const unknown = titles.filter(title => !ids.has(title));

  if (unknown.length > 0)
    throw new Error(`Competências não encontradas: ${unknown.join(', ')}. Use os títulos de src/seed/data/competences.json.`);

  return ids;
};

const seedQuestions = async (questions: QuestionSeed[], competenceIds: Map<string, Types.ObjectId>) => {
  const questionsCount: Count = { total: questions.length, created: 0 };
  const linksCount: Count = { total: 0, created: 0 };

  for (const { competences = [], ...fields } of questions) {
    const result = await QuestionModel.updateOne({ title: fields.title }, { $set: fields }, { upsert: true, runValidators: true });
    questionsCount.created += result.upsertedCount;

    const question = await QuestionModel.findOne({ title: fields.title }).select('_id').orFail();

    for (const title of competences) {
      const link = { competence: competenceIds.get(title), question: question._id };
      const linkResult = await CompetenceQuestionModel.updateOne(link, { $setOnInsert: link }, { upsert: true });

      linksCount.total += 1;
      linksCount.created += linkResult.upsertedCount;
    }
  }

  return { questionsCount, linksCount };
};
