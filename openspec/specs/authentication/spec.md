# Spec: Autenticação

## Purpose

Sistema de autenticação para proteger o acesso às mensagens de clientes.

## Requirements

### R1: Login
- Sistema deve aceitar username e senha
- Senhas devem ser armazenadas com hash bcrypt
- Após autenticação, criar JWT token com expiração de 24h

### R2: Sessão
- Token deve ser armazenado em cookie httpOnly
- Cookie deve ser Secure (apenas HTTPS)
- Cookie deve ter SameSite=Strict

### R3: Logout
- Endpoint para limpar cookie
- Token deve ser invalidado no cliente

### R4: Verificação
- Endpoint GET /api/auth para verificar se está autenticado
- Rotas protegidas devem verificar token

## Acceptance Criteria

- [ ] Login com credenciais válidas retorna JWT
- [ ] Login com credenciais inválidas retorna erro genérico
- [ ] Token expira após 24 horas
- [ ] Cookie httpOnly não é acessível via JavaScript
- [ ] Logout limpa o cookie
- [ ] Acesso a rota sem token retorna 401

## Edge Cases

- Usuário tenta login após bloqueio → retorna 429
- Token expirado → redireciona para login
- Cookie corrompido → limpa e redireciona

## Notes

- Usuário padrão: admin (senha via variável de ambiente)
- Não implementar recuperação de senha (fora do escopo)
