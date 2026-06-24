const menuToggle = document.querySelector('.menu-toggle');
const navLinks = document.querySelector('.nav-links');

menuToggle?.addEventListener('click', () => {
  navLinks.classList.toggle('active');
  menuToggle.classList.toggle('active');
});

document.querySelectorAll('.nav-links a').forEach(link => {
  link.addEventListener('click', () => {
    navLinks.classList.remove('active');
    menuToggle.classList.remove('active');
  });
});

const formTimestamp = document.getElementById('formTimestamp');
if (formTimestamp) {
  formTimestamp.value = Date.now().toString();
}

const contactForm = document.getElementById('contactForm');

contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = contactForm.querySelector('.btn');
  const originalText = btn.textContent;
  btn.textContent = 'Enviando...';
  btn.disabled = true;

  const honeypot = contactForm.querySelector('#website')?.value || '';

  const data = {
    name: contactForm.querySelector('#name').value,
    email: contactForm.querySelector('#email').value,
    phone: contactForm.querySelector('#phone').value,
    message: contactForm.querySelector('#message').value,
    honeypot: honeypot,
    timestamp: contactForm.querySelector('#formTimestamp')?.value || '',
  };

  try {
    const response = await fetch('/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (response.ok) {
      btn.textContent = 'Mensagem enviada!';
      contactForm.reset();
      if (formTimestamp) {
        formTimestamp.value = Date.now().toString();
      }
    } else {
      const result = await response.json();
      btn.textContent = result.error || 'Erro ao enviar. Tente novamente.';
    }
  } catch {
    btn.textContent = 'Erro ao enviar. Tente novamente.';
  }

  setTimeout(() => {
    btn.textContent = originalText;
    btn.disabled = false;
  }, 3000);
});
