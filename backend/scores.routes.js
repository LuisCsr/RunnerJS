import { Router } from 'express';
import { readFile, writeFile, mkdir } from 'fs/promises';
import path from 'path';
import crypto from 'crypto';

const router = Router();
const DATA_DIR = path.resolve('./data');
const DATA_FILE = path.join(DATA_DIR, 'scores.json');

async function ensureFile() {
  await mkdir(DATA_DIR, { recursive: true });
  try { await readFile(DATA_FILE, 'utf-8'); }
  catch { await writeFile(DATA_FILE, '[]', 'utf-8'); }
}

router.get('/', async (req, res) => {
  try {
    await ensureFile();
    const raw = await readFile(DATA_FILE, 'utf-8');
    const list = JSON.parse(raw);
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit) || 10));
    const sorted = list.sort((a,b) => b.score - a.score).slice(0, limit);
    res.json(sorted);
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Cannot read scores' });
  }
});

router.post('/', async (req, res) => {
  try {
    await ensureFile();
    const { name, score, level } = req.body || {};
    const cleanName = String(name || 'Anónimo').slice(0,16);
    const cleanScore = Number.isFinite(score) ? Math.max(0, Math.floor(score)) : 0;
    const cleanLevel = Number.isFinite(level) ? Math.max(1, Math.floor(level)) : 1;

    const raw = await readFile(DATA_FILE, 'utf-8');
    const list = JSON.parse(raw);
    const item = {
      id: crypto.randomUUID ? crypto.randomUUID() : crypto.randomBytes(16).toString('hex'),
      name: cleanName,
      score: cleanScore,
      level: cleanLevel,
      date: new Date().toISOString()
    };
    list.push(item);
    await writeFile(DATA_FILE, JSON.stringify(list, null, 2), 'utf-8');
    res.status(201).json({ ok: true, id: item.id });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: 'Cannot write score' });
  }
});

export default router;
