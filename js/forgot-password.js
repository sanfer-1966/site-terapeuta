const forgotForm = document.getElementById('forgotForm');
const loginError = document.getElementById('loginError');
const loginSuccess = document.getElementById('loginSuccess');

forgotForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  loginError.classList.remove('show');
  loginSuccess.classList.remove('show');

  const btn = forgotForm.querySelector('.btn');
  const originalText = btn.textContent;
  btn.innerHTML = '<span class="spinner"></span> Enviando...';
  btn.disabled = true;

  const email = forgotForm.querySelector('#email').value;

  try {
    const response = await fetch('/api/forgot-password', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
      credentials: 'same-origin'
    });

    const result = await response.json();

    if (response.ok) {
      loginSuccess.textContent = 'Se o email estiver cadastrado, você receberá as instruções de redefinição.';
      loginSuccess.classList.add('show');
      forgotForm.reset();
    } else {
      loginError.textContent = result.error || 'Erro ao enviar instruções.';
      loginError.classList.add('show');
    }
  } catch {
    loginError.textContent = 'Erro de conexão. Tente novamente.';
    loginError.classList.add('show');
  }

  btn.textContent = originalText;
  btn.disabled = false;
});
