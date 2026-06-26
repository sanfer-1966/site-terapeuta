const resetForm = document.getElementById('resetForm');
const loginError = document.getElementById('loginError');
const loginSuccess = document.getElementById('loginSuccess');
const validTokenForm = document.getElementById('validTokenForm');
const invalidTokenMessage = document.getElementById('invalidTokenMessage');

const urlParams = new URLSearchParams(window.location.search);
const token = urlParams.get('token');

function togglePasswordVisibility(inputId, toggleId) {
  const input = document.getElementById(inputId);
  const toggle = document.getElementById(toggleId);
  
  toggle?.addEventListener('click', () => {
    const isPassword = input.type === 'password';
    input.type = isPassword ? 'text' : 'password';
    toggle.innerHTML = isPassword ? '&#128064;' : '&#128065;';
  });
}

togglePasswordVisibility('password', 'togglePassword');
togglePasswordVisibility('confirmPassword', 'toggleConfirmPassword');

if (!token) {
  validTokenForm.style.display = 'none';
  invalidTokenMessage.style.display = 'block';
} else {
  document.getElementById('token').value = token;
  
  fetch(`/api/verify-token?token=${token}`, { credentials: 'same-origin' })
    .then(res => res.json())
    .then(data => {
      if (!data.valid) {
        validTokenForm.style.display = 'none';
        invalidTokenMessage.style.display = 'block';
      }
    })
    .catch(() => {
      validTokenForm.style.display = 'none';
      invalidTokenMessage.style.display = 'block';
    });
}

resetForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('show');
  loginSuccess.classList.remove('show');

  const password = document.getElementById('password').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (password !== confirmPassword) {
    loginError.textContent = 'As senhas não coincidem.';
    loginError.classList.add('show');
    return;
  }

  if (password.length < 6) {
    loginError.textContent = 'A senha deve ter pelo menos 6 caracteres.';
    loginError.classList.add('show');
    return;
  }

  const btn = resetForm.querySelector('.btn');
  const originalText = btn.textContent;
  btn.innerHTML = '<span class="spinner"></span> Redefinindo...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/reset-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, password }),
      credentials: 'same-origin'
    });

    const result = await response.json();

    if (response.ok) {
      loginSuccess.textContent = 'Senha redefinida com sucesso! Redirecionando para o login...';
      loginSuccess.classList.add('show');
      validTokenForm.style.display = 'none';
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      loginError.textContent = result.error || 'Erro ao redefinir senha.';
      loginError.classList.add('show');
    }
  } catch {
    loginError.textContent = 'Erro de conexão. Tente novamente.';
    loginError.classList.add('show');
  }

  btn.textContent = originalText;
  btn.disabled = false;
});
