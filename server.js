const express = require('express');
const cors = require('cors');
const path = require('path');
const Database = require('better-sqlite3');

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database('mensagens.db');
db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS mensagens (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nome TEXT NOT NULL,
    email TEXT NOT NULL,
    telefone TEXT,
    mensagem TEXT NOT NULL,
    data TEXT DEFAULT (datetime('now','localtime'))
  )
`);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname)));

app.post('/api/send', (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Preencha nome, email e mensagem.' });
  }

  const stmt = db.prepare('INSERT INTO mensagens (nome, email, telefone, mensagem) VALUES (?, ?, ?, ?)');
  const result = stmt.run(name, email, phone || '', message);

  res.json({ success: true, id: result.lastInsertRowid });
});

app.get('/api/mensagens', (req, res) => {
  const rows = db.prepare('SELECT * FROM mensagens ORDER BY id DESC').all();
  res.json(rows);
});

app.listen(PORT, () => {
  console.log(`Servidor rodando em http://localhost:${PORT}`);
});
