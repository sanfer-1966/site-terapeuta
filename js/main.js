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
  
  btn.innerHTML = '<span class="spinner"></span> Enviando...';
  btn.disabled = true;
  btn.classList.add('loading');

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
      btn.innerHTML = '&#10003; Mensagem enviada!';
      btn.classList.remove('loading');
      btn.classList.add('success');
      contactForm.reset();
      if (formTimestamp) {
        formTimestamp.value = Date.now().toString();
      }
    } else {
      const result = await response.json();
      btn.innerHTML = '&#10007; ' + (result.error || 'Erro ao enviar.');
      btn.classList.remove('loading');
      btn.classList.add('error');
    }
  } catch {
    btn.innerHTML = '&#10007; Erro de conexão.';
    btn.classList.remove('loading');
    btn.classList.add('error');
  }

  setTimeout(() => {
    btn.textContent = originalText;
    btn.disabled = false;
    btn.classList.remove('success', 'error');
  }, 3000);
});

const observerOptions = {
  threshold: 0.1,
  rootMargin: '0px 0px -50px 0px'
};

const observer = new IntersectionObserver((entries) => {
  entries.forEach(entry => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
    }
  });
}, observerOptions);

document.querySelectorAll('.card, .about-content, .hero-content, .contact-grid').forEach(el => {
  el.classList.add('animate-on-scroll');
  observer.observe(el);
});
