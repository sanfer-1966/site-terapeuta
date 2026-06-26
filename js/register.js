const registerForm = document.getElementById('registerForm');
const loginError = document.getElementById('loginError');
const loginSuccess = document.getElementById('loginSuccess');
const registerFormContainer = document.getElementById('registerFormContainer');
const unavailableMessage = document.getElementById('unavailableMessage');

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

async function checkRegistrationAvailable() {
  try {
    const response = await fetch('/api/check-registration', { credentials: 'same-origin' });
    const data = await response.json();
    
    if (!data.available) {
      registerFormContainer.style.display = 'none';
      unavailableMessage.style.display = 'block';
    }
  } catch {
    registerFormContainer.style.display = 'none';
    unavailableMessage.style.display = 'block';
  }
}

registerForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('show');
  loginSuccess.classList.remove('show');

  const email = document.getElementById('email').value;
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

  const btn = registerForm.querySelector('.btn');
  const originalText = btn.textContent;
  btn.innerHTML = '<span class="spinner"></span> Cadastrando...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: email, password }),
      credentials: 'same-origin'
    });

    const result = await response.json();

    if (response.ok) {
      loginSuccess.textContent = 'Cadastro realizado com sucesso! Redirecionando para o login...';
      loginSuccess.classList.add('show');
      registerForm.reset();
      setTimeout(() => {
        window.location.href = 'login.html';
      }, 2000);
    } else {
      loginError.textContent = result.error || 'Erro ao cadastrar.';
      loginError.classList.add('show');
    }
  } catch {
    loginError.textContent = 'Erro de conexão. Tente novamente.';
    loginError.classList.add('show');
  }

  btn.textContent = originalText;
  btn.disabled = false;
});

checkRegistrationAvailable();
