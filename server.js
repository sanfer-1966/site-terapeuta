const express = require('express');
const cors = require('cors');
const path = require('path');
const initSqlJs = require('sql.js');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = 'mensagens.db';
const ADMIN_USER = process.env.ADMIN_USER || 'admin';
const ADMIN_PASS = process.env.ADMIN_PASS || 'admin123';
const JWT_SECRET = process.env.JWT_SECRET || 'sua_chave_secreta_mude_em_producao';
const ALLOWED_ORIGIN = process.env.ALLOWED_ORIGIN || 'http://localhost:3000';

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

  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now','localtime'))
    )
  `);

  const stmtCheck = db.prepare('SELECT id FROM usuarios WHERE username = ?');
  stmtCheck.bind([ADMIN_USER]);
  const hasUser = stmtCheck.step();
  stmtCheck.free();
  
  if (!hasUser) {
    const hash = bcrypt.hashSync(ADMIN_PASS, 10);
    db.run('INSERT INTO usuarios (username, password_hash) VALUES (?, ?)', [ADMIN_USER, hash]);
  }

  saveDB();
}

function saveDB() {
  const data = db.export();
  const buffer = Buffer.from(data);
  fs.writeFileSync(DB_FILE, buffer);
}

function authMiddleware(req, res, next) {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Não autenticado' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Token inválido ou expirado' });
  }
}

function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str.trim().replace(/[<>]/g, '');
}

function validateInput(data) {
  const { name, email, phone, message, honeypot, timestamp } = data;

  if (honeypot) {
    return { valid: false, error: 'Rejeitado' };
  }

  if (timestamp) {
    const elapsed = Date.now() - parseInt(timestamp);
    if (elapsed < 3000) {
      return { valid: false, error: 'Muito rápido. Tente novamente.' };
    }
  }

  if (!name || !email || !message) {
    return { valid: false, error: 'Preencha nome, email e mensagem.' };
  }

  const cleanName = sanitizeString(name);
  if (cleanName.length > 100 || !/^[a-zA-ZÀ-ÿ\s]+$/.test(cleanName)) {
    return { valid: false, error: 'Nome inválido.' };
  }

  const cleanEmail = sanitizeString(email);
  if (cleanEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(cleanEmail)) {
    return { valid: false, error: 'Email inválido.' };
  }

  if (phone) {
    const cleanPhone = sanitizeString(phone);
    if (cleanPhone.length > 15 || !/^[0-9\s\-\(\)]+$/.test(cleanPhone)) {
      return { valid: false, error: 'Telefone inválido.' };
    }
  }

  const cleanMessage = sanitizeString(message);
  if (cleanMessage.length > 2000) {
    return { valid: false, error: 'Mensagem muito longa (máximo 2000 caracteres).' };
  }

  return {
    valid: true,
    data: {
      name: cleanName,
      email: cleanEmail,
      phone: phone ? sanitizeString(phone) : '',
      message: cleanMessage
    }
  };
}

app.use(helmet());
app.use(cookieParser());
app.use(cors({
  origin: ALLOWED_ORIGIN,
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true
}));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(express.static(path.join(__dirname), { charset: 'utf-8' }));

const sendLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  message: { error: 'Muitas mensagens. Tente novamente em 1 minuto.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Conta bloqueada. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const mensagensLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  message: { error: 'Muitas requisições. Aguarde.' },
  standardHeaders: true,
  legacyHeaders: false,
});

app.post('/api/send', sendLimiter, (req, res) => {
  const validation = validateInput(req.body);
  
  if (!validation.valid) {
    return res.status(400).json({ error: validation.error });
  }

  const { name, email, phone, message } = validation.data;

  db.run(
    'INSERT INTO mensagens (nome, email, telefone, mensagem) VALUES (?, ?, ?, ?)',
    [name, email, phone, message]
  );
  saveDB();

  const result = db.exec('SELECT last_insert_rowid() as id');
  const id = result[0].values[0][0];

  res.json({ success: true, id });
});

app.post('/api/login', loginLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Preencha usuário e senha.' });
  }

  const stmt = db.prepare('SELECT id, username, password_hash FROM usuarios WHERE username = ?');
  stmt.bind([username]);
  
  let userRow = null;
  if (stmt.step()) {
    userRow = stmt.getAsObject();
  }
  stmt.free();
  
  if (!userRow) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const { id, username: user, password_hash: hash } = userRow;
  
  if (!bcrypt.compareSync(password, hash)) {
    return res.status(401).json({ error: 'Credenciais inválidas.' });
  }

  const token = jwt.sign({ userId: id, username: user }, JWT_SECRET, { expiresIn: '24h' });

  res.cookie('token', token, {
    httpOnly: false,
    secure: false,
    sameSite: false,
    maxAge: 86400000,
    path: '/'
  });

  res.json({ success: true, user: { id, username: user } });
});

app.post('/api/logout', (req, res) => {
  res.clearCookie('token');
  res.json({ success: true });
});

app.get('/api/auth', (req, res) => {
  const token = req.cookies?.token || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.json({ authenticated: false });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    res.json({ authenticated: true, user: { id: decoded.userId, username: decoded.username } });
  } catch (err) {
    res.json({ authenticated: false });
  }
});

app.get('/api/mensagens', mensagensLimiter, authMiddleware, (req, res) => {
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
