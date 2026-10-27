import dotenv from 'dotenv';
dotenv.config();

import { readFileSync } from 'fs';
import mongoose from 'mongoose';
import { getMongoUri } from '../config';
import { defaultSeedData } from './defaultData';
import { getQuestionsFilePath, parseQuestionsFile } from './questionsFile';
import { seedDatabase } from './seedDatabase';

// npm run seed                              -> competências + questões de exemplo
// npm run seed -- --questions export.json   -> competências + questões do arquivo (ex.: export da produção)
const run = async () => {
  const questionsFile = getQuestionsFilePath(process.argv.slice(2), process.env);
  const questions = questionsFile
    ? parseQuestionsFile(readFileSync(questionsFile, 'utf8'))
    : defaultSeedData.questions;

  await mongoose.connect(getMongoUri());

  try {
    const { competences, questions: questionsCount, links } = await seedDatabase({
      competences: defaultSeedData.competences,
      questions,
    });

    console.log(`Seed concluído (questões ${questionsFile ? `de ${questionsFile}` : 'de exemplo'}).`);
    console.log(`Competências: ${competences.total} (${competences.created} novas)`);
    console.log(`Questões: ${questionsCount.total} (${questionsCount.created} novas)`);
    console.log(`Vínculos questão-competência: ${links.total} (${links.created} novos)`);
  } finally {
    await mongoose.disconnect();
  }
};

run().catch(err => {
  console.error('Erro no seed:', err.message);
  process.exit(1);
});
