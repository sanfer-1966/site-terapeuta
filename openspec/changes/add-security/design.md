# Design: Segurança - Dra. Ana Souza

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                    ARQUITETURA SEGURA                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │                    FRONTEND                              │    │
│  │                                                          │    │
│  │   index.html ──── login.html ──── admin.html             │    │
│  │      │              │               │                    │    │
│  │      └──────────────┴───────────────┘                    │    │
│  │                     │                                    │    │
│  │              main.js + admin.js                          │    │
│  │              (Honeypot + Timestamp)                      │    │
│  └───────────────────────┬─────────────────────────────────┘    │
│                          │                                       │
│              ┌───────────┴───────────┐                          │
│              │      HTTP/HTTPS       │                          │
│              └───────────┬───────────┘                          │
│                          │                                       │
│  ┌───────────────────────▼─────────────────────────────────┐    │
│  │                 EXPRESS SERVER                           │    │
│  │                                                          │    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │    │
│  │  │   Helmet    │  │  Rate Limit │  │  CORS       │      │    │
│  │  │  (headers)  │  │  (per-route)│  │  (origin)   │      │    │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │    │
│  │                                                          │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │               MIDDLEWARE STACK                   │    │    │
│  │  │                                                  │    │    │
│  │  │  1. helmet()                                     │    │    │
│  │  │  2. cors({ origin: ALLOWED_ORIGIN })             │    │    │
│  │  │  3. express.json()                               │    │    │
│  │  │  4. cookieParser()                               │    │    │
│  │  │  5. rateLimiter                                  │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  │  ┌─────────────────────────────────────────────────┐    │    │
│  │  │                 ROTAS                            │    │    │
│  │  │                                                  │    │    │
│  │  │  POST /api/send      → validation + save        │    │    │
│  │  │  POST /api/login     → auth → JWT cookie        │    │    │
│  │  │  POST /api/logout    → clear cookie             │    │    │
│  │  │  GET  /api/mensagens → JWT auth → list          │    │    │
│  │  │  GET  /api/auth      → check session            │    │    │
│  │  └─────────────────────────────────────────────────┘    │    │
│  │                                                          │    │
│  └───────────────────────┬─────────────────────────────────┘    │
│                          │                                       │
│  ┌───────────────────────▼─────────────────────────────────┐    │
│  │                   SQLite                                 │    │
│  │                                                          │    │
│  │   ┌─────────────────┐      ┌─────────────────┐          │    │
│  │   │    usuarios     │      │    mensagens     │          │    │
│  │   │─────────────────│      │─────────────────│          │    │
│  │   │ id              │      │ id              │          │    │
│  │   │ username        │      │ nome            │          │    │
│  │   │ password_hash   │      │ email           │          │    │
│  │   │ created_at      │      │ telefone        │          │    │
│  │   └─────────────────┘      │ mensagem        │          │    │
│  │                            │ data            │          │    │
│  │                            └─────────────────┘          │    │
│  │                                                          │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

## Component Design

### 1. Authentication Module

```javascript
// Fluxo de autenticação
┌──────────┐    POST /api/login    ┌──────────────┐
│  Client  │ ────────────────────▶ │   Server     │
│          │ ◀──────────────────── │              │
└──────────┘   { token, success }  └──────┬───────┘
                                           │
                                           ▼
                                  ┌────────────────┐
                                  │  Verifica:     │
                                  │  1. Rate limit │
                                  │  2. Username   │
                                  │  3. Password   │
                                  │  (bcrypt)      │
                                  └────────────────┘
                                           │
                                           ▼
                                  ┌────────────────┐
                                  │  Cria JWT:     │
                                  │  { userId,     │
                                  │    username }  │
                                  │  Expira: 24h   │
                                  └────────────────┘
```

**JWT Payload:**
```json
{
  "userId": 1,
  "username": "admin",
  "iat": 1234567890,
  "exp": 1234654290
}
```

**Cookie Configuration:**
```javascript
res.cookie('token', token, {
  httpOnly: true,      // Não acessível via JavaScript
  secure: true,        // Apenas HTTPS
  sameSite: 'strict',  // Proteção CSRF
  maxAge: 86400000     // 24 horas
})
```

### 2. Rate Limiter Configuration

```javascript
// Configurações por rota
const rateConfigs = {
  '/api/send': {
    windowMs: 60 * 1000,    // 1 minuto
    max: 5,                  // 5 requisições
    message: 'Muitas mensagens. Tente novamente em 1 minuto.'
  },
  '/api/login': {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5,                    // 5 tentativas
    message: 'Conta bloqueada. Tente novamente em 15 minutos.'
  },
  '/api/mensagens': {
    windowMs: 60 * 1000,    // 1 minuto
    max: 10,                 // 10 requisições
    message: 'Muitas requisições. Aguarde.'
  }
}
```

### 3. Validation Schema

```javascript
// Validação de entrada
const validationRules = {
  name: {
    required: true,
    maxLength: 100,
    pattern: /^[a-zA-ZÀ-ÿ\s]+$/,  // Apenas letras
    sanitize: true
  },
  email: {
    required: true,
    maxLength: 254,
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    sanitize: true
  },
  phone: {
    required: false,
    maxLength: 15,
    pattern: /^[0-9\s\-\(\)]+$/,  // Apenas números
    sanitize: true
  },
  message: {
    required: true,
    maxLength: 2000,
    sanitize: true
  },
  honeypot: {
    mustBeEmpty: true  // Campo oculto para bots
  },
  timestamp: {
    minElapsed: 3000  // Mínimo 3 segundos
  }
}
```

### 4. Security Headers (Helmet)

```
Headers adicionados automaticamente:
─────────────────────────────────────
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
X-XSS-Protection: 1; mode=block
Strict-Transport-Security: max-age=31536000; includeSubDomains
X-DNS-Prefetch-Control: on
Referrer-Policy: strict-origin-when-cross-origin
```

## File Structure

```
teste/
├── server.js              # Modificado: auth + rate limit + validation
├── package.json           # Modificado: novas dependências
├── .env                   # Modificado: novas variáveis
├── login.html             # Novo: página de login
├── admin.html             # Novo: painel de mensagens
├── js/
│   ├── main.js            # Modificado: honeypot + timestamp
│   └── admin.js           # Novo: lógica do admin
├── css/
│   └── style.css          # Modificado: estilos login/admin
└── mensagens.db           # Modificado: nova tabela usuarios
```

## API Endpoints

### POST /api/send (Público)
```javascript
// Request
{
  "name": "João Silva",
  "email": "joao@email.com",
  "phone": "11999998888",
  "message": "Olá, gostaria de agendar...",
  "honeypot": "",           // Deve estar vazio
  "timestamp": 1234567890   // Timestamp do carregamento
}

// Response 200
{
  "success": true,
  "id": 1
}

// Response 429 (rate limit)
{
  "error": "Muitas mensagens. Tente novamente em 1 minuto."
}
```

### POST /api/login
```javascript
// Request
{
  "username": "admin",
  "password": "senha123"
}

// Response 200
{
  "success": true,
  "user": { "id": 1, "username": "admin" }
}
// Cookie: token=eyJhbG...; HttpOnly; Secure; SameSite=Strict

// Response 401
{
  "error": "Credenciais inválidas"
}

// Response 429
{
  "error": "Conta bloqueada temporariamente"
}
```

### GET /api/mensagens (Autenticado)
```javascript
// Headers
Authorization: Bearer <token>
// OU via cookie httpOnly

// Response 200
{
  "mensagens": [
    {
      "id": 1,
      "nome": "João Silva",
      "email": "joao@email.com",
      "telefone": "11999998888",
      "mensagem": "Olá...",
      "data": "2026-06-24 10:30:00"
    }
  ]
}

// Response 401
{
  "error": "Não autenticado"
}
```

### POST /api/logout
```javascript
// Response 200
{
  "success": true
}
// Cookie: token=; Max-Age=0
```

### GET /api/auth
```javascript
// Response 200 (autenticado)
{
  "authenticated": true,
  "user": { "id": 1, "username": "admin" }
}

// Response 200 (não autenticado)
{
  "authenticated": false
}
```

## Database Schema

### Tabela usuarios (Nova)
```sql
CREATE TABLE usuarios (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TEXT DEFAULT (datetime('now','localtime'))
);

-- Inserir usuário padrão (senha hasheada com bcrypt)
INSERT INTO usuarios (username, password_hash) 
VALUES ('admin', '$2a$10$...');
```

### Tabela mensagens (Existente - sem alteração)
```sql
CREATE TABLE IF NOT EXISTS mensagens (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  nome TEXT NOT NULL,
  email TEXT NOT NULL,
  telefone TEXT,
  mensagem TEXT NOT NULL,
  data TEXT DEFAULT (datetime('now','localtime'))
);
```

## Frontend Flow

### Fluxo do Formulário
```
┌─────────────────────────────────────────────────────────────┐
│                    FORMULÁRIO SEGURO                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Página carrega                                           │
│     └─▶ JavaScript grava timestamp em campo hidden          │
│                                                              │
│  2. Usuário preenche campos                                  │
│     └─▶ Validação em tempo real                              │
│                                                              │
│  3. Usuário clica "Enviar"                                   │
│     └─▶ Verifica honeypot (deve estar vazio)                │
│     └─▶ Verifica timestamp (> 3 segundos)                    │
│     └─▶ Verifica campos obrigatórios                         │
│                                                              │
│  4. Envia requisição                                         │
│     └─▶ POST /api/send                                       │
│                                                              │
│  5. Resposta                                                 │
│     └─▶ Sucesso: mostra mensagem de confirmação             │
│     └─▶ Erro: mostra mensagem de erro                       │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### Fluxo do Login
```
┌─────────────────────────────────────────────────────────────┐
│                    LOGIN SEGURO                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Usuário acessa /admin.html                               │
│     └─▶ Verifica se tem cookie válido (GET /api/auth)       │
│     └─▶ Se não, redireciona para /login.html                │
│                                                              │
│  2. Preenche formulário de login                             │
│     └─▶ Username + Password                                  │
│                                                              │
│  3. Envia requisição                                         │
│     └─▶ POST /api/login                                      │
│                                                              │
│  4. Resposta                                                 │
│     └─▶ Sucesso: redireciona para /admin.html               │
│     └─▶ Erro: mostra mensagem (sem detalhes)                │
│     └─▶ Rate limit: bloqueia temporariamente                │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

## Environment Variables

```bash
# .env (existente)
EMAIL_USER=smartstorealpha@gmail.com
EMAIL_PASS=smartstorealpha123
PORT=3000

# .env (adicionados)
ADMIN_USER=admin
ADMIN_PASS=senha_segura_aqui
JWT_SECRET=chave_secreta_aleatoria_aqui
ALLOWED_ORIGIN=https://dodgerblue-anteater-184264.hostingersite.com
```

## Dependencies

```json
{
  "dependencies": {
    "bcryptjs": "^2.4.3",
    "cookie-parser": "^1.4.6",
    "cors": "^2.8.5",
    "express": "^4.21.0",
    "express-rate-limit": "^7.1.5",
    "helmet": "^7.1.0",
    "jsonwebtoken": "^9.0.2",
    "sql.js": "^1.14.1"
  }
}
```

## Security Checklist

- [x] Senhas hasheadas com bcrypt
- [x] JWT em cookies httpOnly
- [x] Rate limiting por rota
- [x] CORS restrito ao domínio
- [x] Validação de inputs
- [x] Honeypot anti-bot
- [x] Timestamp mínimo
- [x] Headers de segurança (Helmet)
- [ ] reCAPTCHA v3 (opcional)
- [ ] Notificações por email
