import express from 'express';
import cors from 'cors';
import morgan from 'morgan';
import scoresRouter from './scores.routes.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(morgan('tiny'));

app.get('/', (_req, res) => res.json({ ok: true, service: 'RunnerJS API' }));
app.use('/api/scores', scoresRouter);

app.use((_req, res) => res.status(404).json({ error: 'Not found' }));
app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal error' });
});

app.listen(PORT, () => console.log('RunnerJS API escuchando en puerto', PORT));
