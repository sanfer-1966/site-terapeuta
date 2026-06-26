const messagesList = document.getElementById('messagesList');
const messagesCount = document.getElementById('messagesCount');
const logoutBtn = document.getElementById('logoutBtn');
const searchInput = document.getElementById('searchInput');
const searchBtn = document.getElementById('searchBtn');
const pagination = document.getElementById('pagination');
const editModal = document.getElementById('editModal');
const editForm = document.getElementById('editForm');
const closeModal = document.getElementById('closeModal');
const cancelEdit = document.getElementById('cancelEdit');
const openSettings = document.getElementById('openSettings');
const settingsModal = document.getElementById('settingsModal');
const closeSettings = document.getElementById('closeSettings');
const cancelSettings = document.getElementById('cancelSettings');
const settingsForm = document.getElementById('settingsForm');
const settingsError = document.getElementById('settingsError');
const settingsSuccess = document.getElementById('settingsSuccess');

let currentPage = 1;
let currentSearch = '';
let allMessages = [];

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

async function loadMessages(page = 1, search = '') {
  try {
    const params = new URLSearchParams({ page, limit: 10, search });
    const response = await fetch(`/api/mensagens?${params}`, { credentials: 'same-origin' });
    
    if (response.status === 401) {
      window.location.href = 'login.html';
      return;
    }
    
    const data = await response.json();
    const { mensagens, pagination: pag } = data;
    allMessages = mensagens;
    
    if (mensagens.length === 0) {
      messagesList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">&#128231;</div>
          <p>${search ? 'Nenhuma mensagem encontrada.' : 'Nenhuma mensagem recebida ainda.'}</p>
        </div>
      `;
      messagesCount.textContent = '';
      pagination.innerHTML = '';
      return;
    }

    messagesCount.textContent = `${pag.total} mensagem${pag.total > 1 ? 's' : ''} encontrada${pag.total > 1 ? 's' : ''}`;
    
    messagesList.innerHTML = mensagens.map((msg, index) => `
      <article class="message-card" data-id="${msg.id}" data-index="${index}">
        <div class="message-header">
          <span class="message-name">${escapeHtml(msg.nome)}</span>
          <div style="display:flex;align-items:center;gap:0.5rem;">
            <span class="message-date">${formatDate(msg.data)}</span>
            <button class="btn-edit" data-action="edit" data-index="${index}" title="Editar mensagem">Editar</button>
            <button class="btn-delete" data-action="delete" data-id="${msg.id}" title="Excluir mensagem">Excluir</button>
          </div>
        </div>
        <div class="message-contact">
          <span>&#128231; <a href="mailto:${escapeHtml(msg.email)}">${escapeHtml(msg.email)}</a></span>
          ${msg.telefone ? `<span>&#128222; ${escapeHtml(msg.telefone)}</span>` : ''}
        </div>
        <div class="message-text">${escapeHtml(msg.mensagem)}</div>
      </article>
    `).join('');

    renderPagination(pag);
  } catch {
    messagesList.innerHTML = `
      <div class="empty-state">
        <p>Erro ao carregar mensagens.</p>
      </div>
    `;
  }
}

function renderPagination({ page, totalPages }) {
  if (totalPages <= 1) {
    pagination.innerHTML = '';
    return;
  }

  let html = '';
  html += `<button ${page === 1 ? 'disabled' : ''} data-page="${page - 1}">&#9664; Anterior</button>`;
  
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  
  if (start > 1) {
    html += `<button data-page="1">1</button>`;
    if (start > 2) html += `<span class="pagination-info">...</span>`;
  }
  
  for (let i = start; i <= end; i++) {
    html += `<button class="${i === page ? 'active' : ''}" data-page="${i}">${i}</button>`;
  }
  
  if (end < totalPages) {
    if (end < totalPages - 1) html += `<span class="pagination-info">...</span>`;
    html += `<button data-page="${totalPages}">${totalPages}</button>`;
  }
  
  html += `<button ${page === totalPages ? 'disabled' : ''} data-page="${page + 1}">Próxima &#9654;</button>`;
  
  pagination.innerHTML = html;
}

async function deleteMessage(id) {
  if (!confirm('Tem certeza que deseja excluir esta mensagem?')) return;
  
  try {
    const response = await fetch(`/api/mensagens/${id}`, {
      method: 'DELETE',
      credentials: 'same-origin'
    });
    
    if (response.ok) {
      const card = document.querySelector(`.message-card[data-id="${id}"]`);
      if (card) {
        card.style.opacity = '0';
        card.style.transform = 'translateX(-20px)';
        card.style.transition = 'all 0.3s ease';
        setTimeout(() => loadMessages(currentPage, currentSearch), 300);
      }
    } else {
      const result = await response.json();
      alert(result.error || 'Erro ao excluir mensagem.');
    }
  } catch {
    alert('Erro de conexão ao excluir mensagem.');
  }
}

function editMessage(msg) {
  document.getElementById('editId').value = msg.id;
  document.getElementById('editNome').value = msg.nome || '';
  document.getElementById('editEmail').value = msg.email || '';
  document.getElementById('editTelefone').value = msg.telefone || '';
  document.getElementById('editMensagem').value = msg.mensagem || '';
  editModal.classList.add('active');
}

function closeModalFn() {
  editModal.classList.remove('active');
  editForm.reset();
}

messagesList.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  
  const action = btn.dataset.action;
  
  if (action === 'delete') {
    const id = parseInt(btn.dataset.id);
    deleteMessage(id);
  } else if (action === 'edit') {
    const index = parseInt(btn.dataset.index);
    if (allMessages[index]) {
      editMessage(allMessages[index]);
    }
  }
});

pagination.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-page]');
  if (!btn || btn.disabled) return;
  
  currentPage = parseInt(btn.dataset.page);
  loadMessages(currentPage, currentSearch);
});

closeModal?.addEventListener('click', closeModalFn);
cancelEdit?.addEventListener('click', closeModalFn);
editModal?.addEventListener('click', (e) => {
  if (e.target === editModal) closeModalFn();
});

editForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const id = document.getElementById('editId').value;
  const data = {
    nome: document.getElementById('editNome').value,
    email: document.getElementById('editEmail').value,
    telefone: document.getElementById('editTelefone').value,
    mensagem: document.getElementById('editMensagem').value
  };
  
  try {
    const response = await fetch(`/api/mensagens/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
      credentials: 'same-origin'
    });
    
    if (response.ok) {
      closeModalFn();
      loadMessages(currentPage, currentSearch);
    } else {
      const result = await response.json();
      alert(result.error || 'Erro ao atualizar mensagem.');
    }
  } catch {
    alert('Erro de conexão ao atualizar mensagem.');
  }
});

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

function handleSearch() {
  currentSearch = searchInput.value.trim();
  currentPage = 1;
  loadMessages(currentPage, currentSearch);
}

searchBtn?.addEventListener('click', handleSearch);
searchInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleSearch();
});

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
    await loadUserProfile();
  }
})();

async function loadUserProfile() {
  try {
    const response = await fetch('/api/user/profile', { credentials: 'same-origin' });
    if (response.ok) {
      const data = await response.json();
      document.getElementById('currentEmail').value = data.user.email;
    }
  } catch {}
}

function openSettingsModal() {
  settingsError.style.display = 'none';
  settingsSuccess.style.display = 'none';
  settingsForm.reset();
  loadUserProfile();
  settingsModal.classList.add('active');
}

function closeSettingsModal() {
  settingsModal.classList.remove('active');
  settingsForm.reset();
  settingsError.style.display = 'none';
  settingsSuccess.style.display = 'none';
}

openSettings?.addEventListener('click', openSettingsModal);
closeSettings?.addEventListener('click', closeSettingsModal);
cancelSettings?.addEventListener('click', closeSettingsModal);
settingsModal?.addEventListener('click', (e) => {
  if (e.target === settingsModal) closeSettingsModal();
});

settingsForm?.addEventListener('submit', async (e) => {
  e.preventDefault();
  settingsError.style.display = 'none';
  settingsSuccess.style.display = 'none';

  const currentPassword = document.getElementById('currentPassword').value;
  const newEmail = document.getElementById('newEmail').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmNewPassword = document.getElementById('confirmNewPassword').value;

  if (!currentPassword) {
    settingsError.textContent = 'Senha atual é obrigatória.';
    settingsError.style.display = 'block';
    return;
  }

  if (newPassword && newPassword !== confirmNewPassword) {
    settingsError.textContent = 'As novas senhas não coincidem.';
    settingsError.style.display = 'block';
    return;
  }

  if (newPassword && newPassword.length < 6) {
    settingsError.textContent = 'A nova senha deve ter pelo menos 6 caracteres.';
    settingsError.style.display = 'block';
    return;
  }

  const btn = settingsForm.querySelector('.btn-save');
  const originalText = btn.textContent;
  btn.innerHTML = '<span class="spinner"></span> Salvando...';
  btn.disabled = true;

  try {
    const response = await fetch('/api/user/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newEmail: newEmail || undefined, newPassword: newPassword || undefined }),
      credentials: 'same-origin'
    });

    const result = await response.json();

    if (response.ok) {
      settingsSuccess.textContent = 'Perfil atualizado com sucesso!';
      settingsSuccess.style.display = 'block';
      document.getElementById('currentEmail').value = result.user.email;
      document.getElementById('newEmail').value = '';
      document.getElementById('currentPassword').value = '';
      document.getElementById('newPassword').value = '';
      document.getElementById('confirmNewPassword').value = '';
    } else {
      settingsError.textContent = result.error || 'Erro ao atualizar perfil.';
      settingsError.style.display = 'block';
    }
  } catch {
    settingsError.textContent = 'Erro de conexão. Tente novamente.';
    settingsError.style.display = 'block';
  }

  btn.textContent = originalText;
  btn.disabled = false;
});
