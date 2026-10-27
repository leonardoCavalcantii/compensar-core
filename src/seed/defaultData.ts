import competences from './data/competences.json';
import questions from './data/questions.json';
import { SeedData } from './seedDatabase';

// Competências atuais da produção e questões de exemplo, versionadas no repositório.
export const defaultSeedData: SeedData = { competences, questions };
