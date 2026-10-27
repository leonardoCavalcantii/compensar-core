import express, { Application } from 'express';
import bodyParser from 'body-parser';
import competenceRoutes from './routes/competence.routes';
import questionRoutes from './routes/question.routes';
import userRoutes from './routes/user.routes';
import loginRoutes from './routes/login.routes';
import competenceQuestionRoutes from './routes/competenceQuestion.routes';
import pdfRoutes from './routes/pdf.routes';

import authenticateToken from './middlewares/authenticator';

const app: Application = express();

app.use(bodyParser.json());

app.use('/api', loginRoutes);
app.use('/api', competenceRoutes);
app.use('/api', pdfRoutes);

app.use('/api', userRoutes);
app.use('/api', authenticateToken, questionRoutes);
app.use('/api', authenticateToken, competenceQuestionRoutes);

export default app;
