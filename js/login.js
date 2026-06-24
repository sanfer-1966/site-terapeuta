const loginForm = document.getElementById('loginForm');
const loginError = document.getElementById('loginError');
const togglePassword = document.getElementById('togglePassword');
const passwordInput = document.getElementById('password');

togglePassword?.addEventListener('click', () => {
  const isPassword = passwordInput.type === 'password';
  passwordInput.type = isPassword ? 'text' : 'password';
  togglePassword.innerHTML = isPassword ? '&#128064;' : '&#128065;';
});

loginForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('show');

  const btn = loginForm.querySelector('.btn');
  const originalText = btn.textContent;
  btn.textContent = 'Entrando...';
  btn.disabled = true;

  const data = {
    username: loginForm.querySelector('#username').value,
    password: loginForm.querySelector('#password').value,
  };

  try {
    const response = await fetch('/api/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'same-origin'
    });

    const result = await response.json();

    if (response.ok && result.success) {
      window.location.href = 'admin.html';
    } else {
      loginError.textContent = result.error || 'Erro ao fazer login.';
      loginError.classList.add('show');
    }
  } catch {
    loginError.textContent = 'Erro de conexão. Tente novamente.';
    loginError.classList.add('show');
  }

  btn.textContent = originalText;
  btn.disabled = false;
});
