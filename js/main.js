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

const contactForm = document.getElementById('contactForm');

contactForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  const btn = contactForm.querySelector('.btn');
  const originalText = btn.textContent;
  btn.textContent = 'Enviando...';
  btn.disabled = true;

  const data = {
    name: contactForm.querySelector('#name').value,
    email: contactForm.querySelector('#email').value,
    phone: contactForm.querySelector('#phone').value,
    message: contactForm.querySelector('#message').value,
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
    } else {
      btn.textContent = 'Erro ao enviar. Tente novamente.';
    }
  } catch {
    btn.textContent = 'Erro ao enviar. Tente novamente.';
  }

  setTimeout(() => {
    btn.textContent = originalText;
    btn.disabled = false;
  }, 3000);
});
