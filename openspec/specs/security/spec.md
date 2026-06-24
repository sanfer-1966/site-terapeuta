# Spec: Segurança

## Purpose

Proteção contra ataques e abuso do sistema.

## Requirements

### R1: Rate Limiting
- POST /api/send: máximo 5 req/min por IP
- POST /api/login: máximo 5 req/min por IP (bloqueio 15 min)
- GET /api/mensagens: máximo 10 req/min por IP

### R2: Validação de Inputs
- Campos obrigatórios: name, email, message
- Tamanhos máximos: name(100), email(254), phone(15), message(2000)
- Formato de email válido
- Apenas caracteres permitidos por campo

### R3: Proteção Anti-Bot
- Honeypot field (deve estar vazio)
- Timestamp mínimo de 3 segundos

### R4: Headers de Segurança
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security

### R5: CORS
- Aceitar apenas origem configurada em ALLOWED_ORIGIN
- Métodos permitidos: GET, POST
- Headers permitidos: Content-Type, Authorization

## Acceptance Criteria

- [ ] Rate limit retorna 429 quando excedido
- [ ] Honeypot preenchido rejeita requisição
- [ ] Timestamp < 3s rejeita requisição
- [ ] Campos inválidos retornam erro 400
- [ ] Headers de segurança presentes em todas as respostas
- [ ] CORS bloqueia origens não autorizadas

## Edge Cases

- Rate limit em memória perde estado ao reiniciar
- Proxy pode não repassar IP correto
- Honeypot pode ser preenchido por assistentes de preenchimento

## Notes

- Rate limiting em memória (Map) é adequado para 1 servidor
- Para múltiplos servidores, considerar Redis
