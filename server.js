require('dotenv').config();
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
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3000;
const DB_FILE = 'mensagens.db';
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

const forgotPasswordLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { error: 'Muitas requisições. Tente novamente em 15 minutos.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 3,
  message: { error: 'Muitas tentativas. Aguarde 1 hora.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const profileLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: 'Muitas tentativas. Tente novamente em 15 minutos.' },
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
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
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
  const page = Math.max(1, parseInt(req.query.page) || 1);
  const limit = Math.min(50, Math.max(1, parseInt(req.query.limit) || 10));
  const search = req.query.search || '';
  const offset = (page - 1) * limit;

  let whereClause = '';
  let params = [];

  if (search) {
    whereClause = 'WHERE nome LIKE ? OR email LIKE ? OR mensagem LIKE ?';
    const searchPattern = `%${search}%`;
    params = [searchPattern, searchPattern, searchPattern];
  }

  const countResult = db.exec(`SELECT COUNT(*) as total FROM mensagens ${whereClause}`, params);
  const total = countResult.length > 0 ? countResult[0].values[0][0] : 0;
  const totalPages = Math.ceil(total / limit);

  const stmt = db.prepare(`SELECT * FROM mensagens ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`);
  stmt.bind([...params, limit, offset]);

  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();

  res.json({
    mensagens: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages
    }
  });
});

app.delete('/api/mensagens/:id', mensagensLimiter, authMiddleware, (req, res) => {
  const { id } = req.params;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  const check = db.prepare('SELECT id FROM mensagens WHERE id = ?');
  check.bind([parseInt(id)]);
  const exists = check.step();
  check.free();

  if (!exists) {
    return res.status(404).json({ error: 'Mensagem não encontrada.' });
  }

  db.run('DELETE FROM mensagens WHERE id = ?', [parseInt(id)]);
  saveDB();

  res.json({ success: true });
});

app.put('/api/mensagens/:id', mensagensLimiter, authMiddleware, (req, res) => {
  const { id } = req.params;
  const { nome, email, telefone, mensagem } = req.body;

  if (!id || isNaN(id)) {
    return res.status(400).json({ error: 'ID inválido.' });
  }

  const check = db.prepare('SELECT id FROM mensagens WHERE id = ?');
  check.bind([parseInt(id)]);
  const exists = check.step();
  check.free();

  if (!exists) {
    return res.status(404).json({ error: 'Mensagem não encontrada.' });
  }

  if (!nome || !email || !mensagem) {
    return res.status(400).json({ error: 'Preencha nome, email e mensagem.' });
  }

  const cleanName = sanitizeString(nome);
  const cleanEmail = sanitizeString(email);
  const cleanPhone = telefone ? sanitizeString(telefone) : '';
  const cleanMessage = sanitizeString(mensagem);

  db.run(
    'UPDATE mensagens SET nome = ?, email = ?, telefone = ?, mensagem = ? WHERE id = ?',
    [cleanName, cleanEmail, cleanPhone, cleanMessage, parseInt(id)]
  );
  saveDB();

  res.json({ success: true });
});

const resetTokens = new Map();

function cleanupExpiredTokens() {
  const now = Date.now();
  for (const [token, data] of resetTokens) {
    if (data.expires < now) {
      resetTokens.delete(token);
    }
  }
}

setInterval(cleanupExpiredTokens, 15 * 60 * 1000);

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.sendgrid.net',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: 'apikey',
    pass: process.env.SENDGRID_API_KEY
  }
});

app.post('/api/forgot-password', forgotPasswordLimiter, (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ error: 'Digite seu email.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  let stmt = db.prepare('SELECT id, username FROM usuarios WHERE username = ?');
  stmt.bind([email]);
  let user = null;
  if (stmt.step()) {
    user = stmt.getAsObject();
  }
  stmt.free();

  let userId;
  let isNewUser = false;

  if (!user) {
    const tempPassword = crypto.randomBytes(16).toString('hex');
    const hash = bcrypt.hashSync(tempPassword, 10);
    db.run('INSERT INTO usuarios (username, password_hash) VALUES (?, ?)', [email, hash]);
    saveDB();

    const idResult = db.exec('SELECT last_insert_rowid() as id');
    userId = idResult[0].values[0][0];
    isNewUser = true;
  } else {
    userId = user.id;
  }

  const token = crypto.randomBytes(32).toString('hex');
  const expires = Date.now() + 3600000;
  resetTokens.set(token, { userId, expires });

  const resetUrl = `${ALLOWED_ORIGIN}/reset-password.html?token=${token}`;

  const mailOptions = {
    from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
    to: email,
    subject: isNewUser 
      ? 'Conta Criada - Defina sua Senha - Dra. Ana Souza'
      : 'Redefinição de Senha - Dra. Ana Souza',
    html: `
      <h2>${isNewUser ? 'Conta Criada com Sucesso!' : 'Redefinição de Senha'}</h2>
      <p>Olá,</p>
      ${isNewUser 
        ? '<p>Uma conta foi criada para este email. Clique no link abaixo para definir sua senha:</p>'
        : '<p>Você solicitou a redefinição da sua senha.</p>'}
      <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#6baa8e;color:white;text-decoration:none;border-radius:8px;">${isNewUser ? 'Definir Minha Senha' : 'Redefinir Senha'}</a></p>
      <p>Este link expira em 1 hora.</p>
      ${isNewUser ? '<p>Crie uma senha forte para proteger sua conta.</p>' : ''}
      <p>Atenciosamente,<br>Dra. Ana Souza</p>
    `
  };

  transporter.sendMail(mailOptions)
    .then(() => {
      res.json({ success: true, message: 'Email enviado com sucesso!' });
    })
    .catch((err) => {
      console.error('Erro ao enviar email:', err);
      if (process.env.NODE_ENV !== 'production') {
        res.json({ success: true, message: 'Email enviado (modo desenvolvimento)' });
      } else {
        res.status(500).json({ error: 'Erro ao enviar email. Tente novamente.' });
      }
    });
});

app.get('/api/verify-token', (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.json({ valid: false });
  }

  const resetData = resetTokens.get(token);

  if (!resetData || resetData.expires < Date.now()) {
    resetTokens.delete(token);
    return res.json({ valid: false });
  }

  res.json({ valid: true });
});

app.post('/api/reset-password', (req, res) => {
  const { token, password } = req.body;

  if (!token || !password) {
    return res.status(400).json({ error: 'Token e senha são obrigatórios.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  const resetData = resetTokens.get(token);

  if (!resetData || resetData.expires < Date.now()) {
    resetTokens.delete(token);
    return res.status(400).json({ error: 'Token inválido ou expirado.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, resetData.userId]);
  saveDB();

  resetTokens.delete(token);

  res.json({ success: true, message: 'Senha redefinida com sucesso!' });
});

app.get('/api/check-registration', (req, res) => {
  const result = db.exec('SELECT COUNT(*) as count FROM usuarios');
  const count = result.length > 0 ? result[0].values[0][0] : 0;
  res.json({ available: count === 0 });
});

app.post('/api/register', registerLimiter, (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Preencha email e senha.' });
  }

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(username)) {
    return res.status(400).json({ error: 'Email inválido.' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres.' });
  }

  const check = db.prepare('SELECT COUNT(*) as count FROM usuarios');
  check.step();
  const count = check.getAsObject().count;
  check.free();

  if (count > 0) {
    return res.status(403).json({ error: 'Já existe um administrador cadastrado.' });
  }

  const hash = bcrypt.hashSync(password, 10);
  db.run('INSERT INTO usuarios (username, password_hash) VALUES (?, ?)', [username, hash]);
  saveDB();

  res.json({ success: true, message: 'Administrador cadastrado com sucesso!' });
});

app.get('/api/user/profile', authMiddleware, (req, res) => {
  const stmt = db.prepare('SELECT id, username FROM usuarios WHERE id = ?');
  stmt.bind([req.user.userId]);
  let user = null;
  if (stmt.step()) {
    user = stmt.getAsObject();
  }
  stmt.free();

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  res.json({ user: { id: user.id, email: user.username } });
});

app.put('/api/user/profile', profileLimiter, authMiddleware, (req, res) => {
  const { currentPassword, newEmail, newPassword } = req.body;

  if (!currentPassword) {
    return res.status(400).json({ error: 'Senha atual é obrigatória.' });
  }

  const stmt = db.prepare('SELECT id, username, password_hash FROM usuarios WHERE id = ?');
  stmt.bind([req.user.userId]);
  let user = null;
  if (stmt.step()) {
    user = stmt.getAsObject();
  }
  stmt.free();

  if (!user) {
    return res.status(404).json({ error: 'Usuário não encontrado.' });
  }

  if (!bcrypt.compareSync(currentPassword, user.password_hash)) {
    return res.status(401).json({ error: 'Senha atual incorreta.' });
  }

  if (newEmail) {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail)) {
      return res.status(400).json({ error: 'Email inválido.' });
    }

    const existing = db.prepare('SELECT id FROM usuarios WHERE username = ? AND id != ?');
    existing.bind([newEmail, req.user.userId]);
    const exists = existing.step();
    existing.free();

    if (exists) {
      return res.status(400).json({ error: 'Este email já está em uso.' });
    }

    db.run('UPDATE usuarios SET username = ? WHERE id = ?', [newEmail, req.user.userId]);
  }

  if (newPassword) {
    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'A nova senha deve ter pelo menos 6 caracteres.' });
    }
    const hash = bcrypt.hashSync(newPassword, 10);
    db.run('UPDATE usuarios SET password_hash = ? WHERE id = ?', [hash, req.user.userId]);
  }

  saveDB();

  const updatedUser = db.prepare('SELECT username FROM usuarios WHERE id = ?');
  updatedUser.bind([req.user.userId]);
  updatedUser.step();
  const userData = updatedUser.getAsObject();
  updatedUser.free();

  const token = jwt.sign({ userId: req.user.userId, username: userData.username }, JWT_SECRET, { expiresIn: '24h' });

  res.cookie('token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: 86400000,
    path: '/'
  });

  res.json({ success: true, message: 'Perfil atualizado com sucesso!', user: { email: userData.username } });
});

app.use((req, res) => {
  res.status(404).sendFile(path.join(__dirname, '404.html'));
});

initDB().then(() => {
  app.listen(PORT, () => {
    console.log(`Servidor rodando em http://localhost:${PORT}`);
  });
});
