const messagesList = document.getElementById('messagesList');
const messagesCount = document.getElementById('messagesCount');
const logoutBtn = document.getElementById('logoutBtn');

async function checkAuth() {
  try {
    const response = await fetch('/api/auth', { credentials: 'same-origin' });
    const data = await response.json();
    
    if (!data.authenticated) {
      window.location.href = 'login.html';
      return false;
    }
    return true;
  } catch {
    window.location.href = 'login.html';
    return false;
  }
}

async function loadMessages() {
  try {
    const response = await fetch('/api/mensagens', { credentials: 'same-origin' });
    
    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    
    const messages = await response.json();
    
    if (messages.length === 0) {
      messagesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">&#128231;</div>
          <p>Nenhuma mensagem recebida ainda.</p>
        </div>
      `;
      messagesCount.textContent = '';
      return;
    }

    messagesCount.textContent = `${messages.length} mensagem${messages.length > 1 ? 's' : ''} recebida${messages.length > 1 ? 's' : ''}`;
    
    messagesList.innerHTML = messages.map(msg => `
      <article class="message-card">
        <div class="message-header">
          <span class="message-name">${escapeHtml(msg.nome)}</span>
          <span class="message-date">${formatDate(msg.data)}</span>
        </div>
        <div class="message-contact">
          <span>&#128231; <a href="mailto:${escapeHtml(msg.email)}">${escapeHtml(msg.email)}</a></span>
          ${msg.telefone ? `<span>&#128222; ${escapeHtml(msg.telefone)}</span>` : ''}
        </div>
        <div class="message-text">${escapeHtml(msg.mensagem)}</div>
      </article>
    `).join('');
  } catch {
    messagesList.innerHTML = `
      <div class="empty-state">
        <p>Erro ao carregar mensagens.</p>
      </div>
    `;
  }
}

function escapeHtml(text) {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

logoutBtn?.addEventListener('click', async () => {
  try {
    await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
  } finally {
    window.location.href = 'login.html';
  }
});

(async () => {
  const isAuthenticated = await checkAuth();
  if (isAuthenticated) {
    await loadMessages();
  }
})();
