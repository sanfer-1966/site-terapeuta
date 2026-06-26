# Tasks: Solução Completa de Segurança

## Progresso

- [x] 1. Setup e Dependências
- [x] 2. Tabela de Usuários
- [x] 3. Middleware de Autenticação
- [x] 4. Rate Limiting
- [x] 5. Validação de Inputs
- [x] 6. Headers de Segurança
- [x] 7. CORS Restrito
- [x] 8. Sistema de Login
- [x] 9. Página de Login
- [x] 10. Painel Admin
- [x] 11. Proteção Anti-Bot
- [x] 12. Variáveis de Ambiente
- [x] 13. Testes e Verificação

---

## Task 1: Setup e Dependências
**Dependências:** Nenhuma
**Estimativa:** 10 min

### Descrição
Instalar todas as dependências necessárias para o sistema de segurança.

### Sub-tarefas
- [x] Instalar bcryptjs para hash de senhas
- [x] Instalar jsonwebtoken para JWT
- [x] Instalar helmet para headers
- [x] Instalar express-rate-limit para rate limiting
- [x] Instalar cookie-parser para cookies
- [x] Atualizar package.json

### Critérios de Aceite
- [x] `npm install` executa sem erros
- [x] Todas as dependências aparecem no package.json

---

## Task 2: Tabela de Usuários
**Dependências:** Task 1
**Estimativa:** 15 min

### Descrição
Criar tabela `usuarios` no banco SQLite e inserir usuário padrão.

### Sub-tarefas
- [x] Criar tabela `usuarios` na função initDB
- [x] Gerar hash bcrypt da senha padrão
- [x] Inserir usuário admin se não existir

### Critérios de Aceite
- [x] Tabela `usuarios` criada com sucesso
- [x] Usuário admin inserido com senha hasheada
- [x] Script funciona tanto com banco novo quanto existente

---

## Task 3: Middleware de Autenticação
**Dependências:** Task 1, Task 2
**Estimativa:** 20 min

### Descrição
Criar middleware para verificar JWT em rotas protegidas.

### Sub-tarefas
- [x] Criar função `authMiddleware`
- [x] Extrair token do cookie ou header Authorization
- [x] Verificar validade do token com jsonwebtoken
- [x] Retornar 401 se inválido
- [x] Adicionar dados do usuário ao request

### Critérios de Aceite
- [x] Rota com token válido retorna 200
- [x] Rota sem token retorna 401
- [x] Rota com token inválido retorna 401
- [x] Rota com token expirado retorna 401

---

## Task 4: Rate Limiting
**Dependências:** Task 1
**Estimativa:** 20 min

### Descrição
Configurar rate limiting para cada rota da API.

### Sub-tarefas
- [x] Configurar rate limiter para POST /api/send (5/min)
- [x] Configurar rate limiter para POST /api/login (5/min, bloqueio 15min)
- [x] Configurar rate limiter para GET /api/mensagens (10/min)
- [x] Mensagens de erro em português

### Critérios de Aceite
- [x] POST /api/send bloqueia após 5 req/min
- [x] POST /api/login bloqueia após 5 tentativas
- [x] Mensagens de erro amigáveis em português
- [x] Reset automático após janela de tempo

---

## Task 5: Validação de Inputs
**Dependências:** Nenhuma
**Estimativa:** 20 min

### Descrição
Implementar validação rigorosa para todos os campos do formulário.

### Sub-tarefas
- [x] Criar função `validateInput`
- [x] Validar name (obrigatório, max 100, apenas letras)
- [x] Validar email (obrigatório, formato válido, max 254)
- [x] Validar phone (opcional, max 15, apenas números)
- [x] Validar message (obrigatório, max 2000)
- [x] Sanitizar strings (trim, remover caracteres perigosos)

### Critérios de Aceite
- [x] Campos vazios retornam erro 400
- [x] Email inválido retorna erro 400
- [x] Campos muito longos retornam erro 400
- [x] Strings sanitizadas antes de salvar

---

## Task 6: Headers de Segurança
**Dependências:** Task 1
**Estimativa:** 5 min

### Descrição
Configurar Helmet para adicionar headers de segurança.

### Sub-tarefas
- [x] Importar helmet
- [x] Adicionar `app.use(helmet())`
- [x] Verificar headers nas respostas

### Critérios de Aceite
- [x] X-Content-Type-Options: nosniff presente
- [x] X-Frame-Options: DENY presente
- [x] X-XSS-Protection presente

---

## Task 7: CORS Restrito
**Dependências:** Nenhuma
**Estimativa:** 10 min

### Descrição
Configurar CORS para aceitar apenas a origem do site.

### Sub-tarefas
- [x] Ler variável ALLOWED_ORIGIN
- [x] Configurar cors com origin específico
- [x] Limitar métodos para GET e POST
- [x] Limitar headers para Content-Type e Authorization

### Critérios de Aceite
- [x] Requisições do domínio correto funcionam
- [x] Requisições de outros domínios são bloqueadas
- [x] Preflight requests funcionam corretamente

---

## Task 8: Sistema de Login
**Dependências:** Task 2, Task 3
**Estimativa:** 25 min

### Descrição
Implementar endpoints de login, logout e verificação de sessão.

### Sub-tarefas
- [x] Criar POST /api/login
- [x] Verificar credenciais com bcrypt
- [x] Criar JWT com dados do usuário
- [x] Configurar cookie httpOnly
- [x] Criar POST /api/logout
- [x] Criar GET /api/auth
- [x] Aplicar rate limit no login

### Critérios de Aceite
- [x] Login com credenciais válidas retorna 200 + cookie
- [x] Login com credenciais inválidas retorna 401
- [x] Logout limpa o cookie
- [x] GET /api/auth retorna status da sessão

---

## Task 9: Página de Login
**Dependências:** Task 8
**Estimativa:** 20 min

### Descrição
Criar página de login com formulário seguro.

### Sub-tarefas
- [x] Criar login.html
- [x] Criar formulário (username + password)
- [x] Adicionar estilos (compatível com tema dark)
- [x] Implementar JavaScript para enviar requisição
- [x] Redirecionar para admin.html após sucesso
- [x] Mostrar erros sem detalhes excessivos

### Critérios de Aceite
- [x] Formulário funciona em mobile e desktop
- [x] Erros são exibidos claramente
- [x] Redirecionamento funciona após login
- [x] Senha não aparece na URL

---

## Task 10: Painel Admin
**Dependências:** Task 3, Task 8
**Estimativa:** 30 min

### Descrição
Criar painel para visualizar mensagens recebidas.

### Sub-tarefas
- [x] Criar admin.html
- [x] Criar js/admin.js
- [x] Verificar autenticação ao carregar
- [x] Buscar mensagens via GET /api/mensagens
- [x] Exibir lista de mensagens
- [x] Adicionar botão de logout
- [x] Estilizar com tema dark

### Critérios de Aceite
- [x] Acesso sem login redireciona para login.html
- [x] Mensagens são exibidas corretamente
- [x] Logout funciona e redireciona para login
- [x] Layout responsivo

---

## Task 11: Proteção Anti-Bot
**Dependências:** Task 5
**Estimativa:** 15 min

### Descrição
Adicionar honeypot e timestamp no formulário do frontend.

### Sub-tarefas
- [x] Adicionar campo honeypot (display: none)
- [x] Adicionar campo timestamp hidden
- [x] Preencher timestamp ao carregar página
- [x] Verificar honeypot antes de enviar
- [x] Verificar elapsed time > 3 segundos
- [x] Enviar timestamp no body da requisição
- [x] Validar timestamp no backend

### Critérios de Aceite
- [x] Honeypot preenchido impede envio
- [x] Envio rápido (< 3s) é rejeitado
- [x] Campos são invisíveis para usuários normais

---

## Task 12: Variáveis de Ambiente
**Dependências:** Nenhuma
**Estimativa:** 10 min

### Descrição
Configurar variáveis de ambiente necessárias.

### Sub-tarefas
- [x] Adicionar ADMIN_USER ao .env
- [x] Adicionar ADMIN_PASS ao .env
- [x] Adicionar JWT_SECRET ao .env
- [x] Adicionar ALLOWED_ORIGIN ao .env
- [x] Atualizar server.js para ler variáveis

### Critérios de Aceite
- [x] Servidor inicia corretamente com variáveis
- [x] Credenciais não estão hardcoded no código
- [x] .env está no .gitignore

---

## Task 13: Testes e Verificação
**Dependências:** Todas as anteriores
**Estimativa:** 20 min

### Descrição
Testar todas as funcionalidades implementadas.

### Sub-tarefas
- [x] Testar POST /api/send com dados válidos
- [x] Testar POST /api/send com honeypot preenchido
- [x] Testar POST /api/send com timestamp inválido
- [x] Testar POST /api/login com credenciais corretas
- [x] Testar POST /api/login com credenciais incorretas
- [x] Testar rate limit em POST /api/send
- [x] Testar GET /api/mensagens sem token
- [x] Testar GET /api/mensagens com token
- [x] Testar POST /api/logout
- [x] Verificar headers de segurança

### Critérios de Aceite
- [x] Todos os testes passam
- [x] Nenhum erro no console
- [x] Funciona em browser real

---

## Summary

| Task | Estimativa | Dependências |
|------|------------|--------------|
| 1. Setup e Dependências | 10 min | Nenhuma |
| 2. Tabela de Usuários | 15 min | Task 1 |
| 3. Middleware de Autenticação | 20 min | Task 1, 2 |
| 4. Rate Limiting | 20 min | Task 1 |
| 5. Validação de Inputs | 20 min | Nenhuma |
| 6. Headers de Segurança | 5 min | Task 1 |
| 7. CORS Restrito | 10 min | Nenhuma |
| 8. Sistema de Login | 25 min | Task 2, 3 |
| 9. Página de Login | 20 min | Task 8 |
| 10. Painel Admin | 30 min | Task 3, 8 |
| 11. Proteção Anti-Bot | 15 min | Task 5 |
| 12. Variáveis de Ambiente | 10 min | Nenhuma |
| 13. Testes e Verificação | 20 min | Todas |

**Total Estimado:** ~3.5 horas
