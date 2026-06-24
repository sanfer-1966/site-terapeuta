# Proposal: Solução Completa de Segurança

## Problem

O site da Dra. Ana Souza possui múltiplas vulnerabilidades de segurança que precisam ser corrigidas antes de ir para produção:

1. **API pública** - `GET /api/mensagens` expõe dados pessoais de clientes
2. **Sem autenticação** - Qualquer pessoa pode acessar o painel de mensagens
3. **CORS aberto** - Aceita requisições de qualquer origem
4. **Sem rate limiting** - Vulnerável a ataques de força bruta e spam
5. **Credenciais expostas** - `.env` com senhas em texto plano
6. **Sem validação robusta** - Inputs não sanitizados adequadamente
7. **Sem proteção anti-bots** - Formulário vulnerável a automação

## Solution

Implementar segurança em 4 camadas:

### Camada 1: Autenticação
- Sistema de login com usuário/senha
- Senhas hasheadas com bcrypt
- Tokens JWT em cookies httpOnly
- Tabela `usuarios` no SQLite

### Camada 2: Rate Limiting
- 5 req/min para `/api/send`
- 5 req/min para `/api/login` (bloqueio após 5 falhas)
- 10 req/min para `/api/mensagens`
- Armazenamento em memória (Map)

### Camada 3: Validação e Sanitização
- Validação rigorosa de todos os campos
- Limites de tamanho por campo
- Sanitização contra XSS
- Headers de segurança (Helmet)

### Camada 4: Proteção Anti-Bot
- Honeypot field invisível
- Timestamp mínimo (3 segundos)
- reCAPTCHA v3 opcional

## Scope

### Incluído
- [ ] Tabela `usuarios` com hash bcrypt
- [ ] Sistema de login/logout
- [ ] Proteção de `GET /api/mensagens` com JWT
- [ ] Rate limiting em todas as rotas
- [ ] CORS restrito ao domínio
- [ ] Validação de inputs no backend
- [ ] Honeypot + timestamp no frontend
- [ ] Headers de segurança (Helmet)
- [ ] Página de login (`login.html`)
- [ ] Painel admin (`admin.html`)
- [ ] Variáveis de ambiente para credenciais

### Não incluído
- reCAPTCHA v3 (requer cadastro no Google)
- Notificações por email
- Dois fatores (2FA)
- Auditoria de logs avançada

## Consequences

### Positivos
- Proteção contra acesso não autorizado
- Redução de spam e ataques
- Conformidade com boas práticas de segurança
- Dados dos clientes protegidos

### Negativos
- Usuário precisa fazer login para ver mensagens
- Complexidade adicional no deployment
- Dependências extras (bcryptjs, jsonwebtoken, helmet)

### Riscos
- Senha padrão precisa ser alterada após deploy
- Rate limiting em memória perde estado ao reiniciar
- Cookies httpOnly podem causar issues em alguns proxies

## Alternatives Considered

1. **Basic Auth** - Mais simples, mas menos seguro e sem tokens
2. **API Key** - Adequado para APIs públicas, mas não para painel admin
3. **OAuth** - Externo, mas complexo demais para este caso de uso

## Decision

Solução completa com JWT + rate limiting + validação + anti-bot.

## Notes

- Credenciais iniciais configuradas via variáveis de ambiente
- Usuário padrão: `admin` (senha definida em `.env`)
- Deploy requer configuração de variáveis de ambiente no Hostinger
