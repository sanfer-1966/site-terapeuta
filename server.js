const express = require('express');
const cors = require('cors');
const path = require('path');
const initSqlJs = require('sql.js');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = 'mensagens.db';

let db;

async function initDB() {
  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    const buffer = fs.readFileSync(DB_FILE);
    db = new SQL.Database(buffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS mensagens (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL,
      email TEXT NOT NULL,
      telefone TEXT,
      mensagem TEXT NOT NULL,
      data TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  saveDB();
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname), { charset: 'utf-8' }));

app.post('/api/send', (req, res) => {
  const { name, email, phone, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Preencha nome, email e mensagem.' });
  }

  db.run(
    'INSERT INTO mensagens (nome, email, telefone, mensagem) VALUES (?, ?, ?, ?)',
    [name, email, phone || '', message]
  );
  saveDB();

  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];

  res.json({ success: true, id });
});

app.get('/api/mensagens', (req, res) => {
  const result = db.exec('SELECT * FROM mensagens ORDER BY id DESC');
  if (result.length === 0) return res.json([]);

  const columns = result[0].columns;
  const rows = result[0].values.map(row => {
    const obj = {};
    columns.forEach((col, i) => obj[col] = row[i]);
    return obj;
  });

  res.json(rows);
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
});
