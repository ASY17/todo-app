const SUPABASE_URL = 'https://mkhyoezimdtvermhnldd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raHlvZXppbWR0dmVybWhubGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzU0NTEsImV4cCI6MjA4OTk1MTQ1MX0.3L73sd38DLQB8QLJTOSCQdQhGC5P1fdNjvwS4iSTLoY';
const API = `${SUPABASE_URL}/rest/v1/todos`;
const AUTH = `${SUPABASE_URL}/auth/v1`;

let accessToken = null;
let currentUser = null;
let todos = [];
let currentFilter = 'all';

function authHeaders() {
    return {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
    };
}

// ===== AUTH =====
const authContainer = document.getElementById('auth-container');
const todoContainer = document.getElementById('todo-container');
const authForm = document.getElementById('auth-form');
const authEmail = document.getElementById('auth-email');
const authPassword = document.getElementById('auth-password');
const authSubmitBtn = document.getElementById('auth-submit-btn');
const authToggleText = document.getElementById('auth-toggle-text');
const authToggleLink = document.getElementById('auth-toggle-link');
const authMessage = document.getElementById('auth-message');
const userEmailEl = document.getElementById('user-email');
const logoutBtn = document.getElementById('logout-btn');

let isLoginMode = true;

function showMessage(text, type) {
    authMessage.textContent = text;
    authMessage.className = 'auth-message ' + type;
    authMessage.style.display = 'block';
}

function hideMessage() {
    authMessage.style.display = 'none';
}

const authTitle = document.getElementById('auth-title');
const authSubtitle = document.getElementById('auth-subtitle');
const authBtnText = document.getElementById('auth-btn-text');

authToggleLink.addEventListener('click', e => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    hideMessage();
    if (isLoginMode) {
        authTitle.textContent = 'Hos Geldiniz';
        authSubtitle.textContent = 'Devam etmek icin giris yapın';
        authBtnText.textContent = 'Giris Yap';
        authToggleText.textContent = 'Hesabınız yok mu?';
        authToggleLink.textContent = 'Kayıt Ol';
    } else {
        authTitle.textContent = 'Hesap Olustur';
        authSubtitle.textContent = 'Hemen ucretsiz kayıt olun';
        authBtnText.textContent = 'Kayıt Ol';
        authToggleText.textContent = 'Zaten hesabınız var mı?';
        authToggleLink.textContent = 'Giris Yap';
    }
});

authForm.addEventListener('submit', async e => {
    e.preventDefault();
    hideMessage();
    const email = authEmail.value.trim();
    const password = authPassword.value;

    if (isLoginMode) {
        await login(email, password);
    } else {
        await signup(email, password);
    }
});

async function signup(email, password) {
    const res = await fetch(`${AUTH}/signup`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            email,
            password,
            data: {},
            gotrue_meta_security: {},
            code_challenge: null,
            code_challenge_method: null
        })
    });
    const data = await res.json();

    if (res.ok) {
        showMessage('Kayıt başarılı! Lütfen e-postanızı kontrol edin ve onay linkine tıklayın.', 'success');
        authForm.reset();
    } else {
        showMessage(data.error_description || data.msg || 'Kayıt başarısız.', 'error');
    }
}

async function login(email, password) {
    const res = await fetch(`${AUTH}/token?grant_type=password`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();

    if (res.ok) {
        setSession(data);
    } else {
        showMessage(data.error_description || data.msg || 'Giriş başarısız.', 'error');
    }
}

function setSession(data) {
    accessToken = data.access_token;
    currentUser = data.user;
    localStorage.setItem('sb_access_token', data.access_token);
    localStorage.setItem('sb_refresh_token', data.refresh_token);
    showApp();
}

async function refreshSession() {
    const refreshToken = localStorage.getItem('sb_refresh_token');
    if (!refreshToken) return false;

    const res = await fetch(`${AUTH}/token?grant_type=refresh_token`, {
        method: 'POST',
        headers: { 'apikey': SUPABASE_KEY, 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken })
    });

    if (res.ok) {
        const data = await res.json();
        setSession(data);
        return true;
    }
    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('sb_refresh_token');
    return false;
}

function logout() {
    accessToken = null;
    currentUser = null;
    localStorage.removeItem('sb_access_token');
    localStorage.removeItem('sb_refresh_token');
    todoContainer.style.display = 'none';
    authContainer.style.display = '';
    hideMessage();
    authForm.reset();
}

logoutBtn.addEventListener('click', logout);

function showApp() {
    authContainer.style.display = 'none';
    todoContainer.style.display = '';
    userEmailEl.textContent = currentUser.email;
    fetchTodos();
}

// ===== Onay linki token yakalama =====
async function handleAuthCallback() {
    const hash = window.location.hash;
    if (!hash) return false;

    const params = new URLSearchParams(hash.substring(1));
    const token = params.get('access_token');
    const refreshToken = params.get('refresh_token');
    const type = params.get('type');

    if (token && refreshToken) {
        // Token ile kullanıcı bilgisini al
        const res = await fetch(`${AUTH}/user`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const user = await res.json();
            accessToken = token;
            currentUser = user;
            localStorage.setItem('sb_access_token', token);
            localStorage.setItem('sb_refresh_token', refreshToken);
            // URL'den hash'i temizle
            history.replaceState(null, '', window.location.pathname);
            if (type === 'signup') {
                showApp();
            } else {
                showApp();
            }
            return true;
        }
    }
    return false;
}

// ===== TODO =====
const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const countEl = document.getElementById('todo-count');
const clearBtn = document.getElementById('clear-completed');
const filterBtns = document.querySelectorAll('.filter-btn');

async function fetchTodos() {
    const res = await fetch(`${API}?select=*&order=created_at.asc`, { headers: authHeaders() });
    todos = await res.json();
    render();
}

function render() {
    list.innerHTML = '';

    const filtered = todos.filter(t => {
        if (currentFilter === 'active') return !t.completed;
        if (currentFilter === 'completed') return t.completed;
        return true;
    });

    filtered.forEach(todo => {
        const li = document.createElement('li');
        li.className = 'todo-item' + (todo.completed ? ' completed' : '');

        const checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = todo.completed;
        checkbox.addEventListener('change', () => toggleTodo(todo.id, !todo.completed));

        const span = document.createElement('span');
        span.textContent = todo.text;
        span.addEventListener('dblclick', () => startEdit(li, todo));

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = '\u00D7';
        deleteBtn.addEventListener('click', () => deleteTodo(todo.id));

        li.append(checkbox, span, deleteBtn);
        list.appendChild(li);
    });

    const activeCount = todos.filter(t => !t.completed).length;
    countEl.textContent = `${activeCount} görev kaldı`;
}

async function addTodo(text) {
    const res = await fetch(API, {
        method: 'POST',
        headers: authHeaders(),
        body: JSON.stringify({ text: text.trim(), completed: false, user_id: currentUser.id })
    });
    const [newTodo] = await res.json();
    todos.push(newTodo);
    render();
}

async function toggleTodo(id, completed) {
    await fetch(`${API}?id=eq.${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ completed })
    });
    const todo = todos.find(t => t.id === id);
    if (todo) todo.completed = completed;
    render();
}

async function deleteTodo(id) {
    await fetch(`${API}?id=eq.${id}`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    todos = todos.filter(t => t.id !== id);
    render();
}

async function updateTodoText(id, text) {
    await fetch(`${API}?id=eq.${id}`, {
        method: 'PATCH',
        headers: authHeaders(),
        body: JSON.stringify({ text })
    });
    const todo = todos.find(t => t.id === id);
    if (todo) todo.text = text;
    render();
}

function startEdit(li, todo) {
    const span = li.querySelector('span');
    const editInput = document.createElement('input');
    editInput.type = 'text';
    editInput.className = 'edit-input';
    editInput.value = todo.text;

    span.replaceWith(editInput);
    editInput.focus();

    function finishEdit() {
        const newText = editInput.value.trim();
        if (newText && newText !== todo.text) {
            updateTodoText(todo.id, newText);
        } else {
            render();
        }
    }

    editInput.addEventListener('blur', finishEdit);
    editInput.addEventListener('keydown', e => {
        if (e.key === 'Enter') finishEdit();
        if (e.key === 'Escape') render();
    });
}

async function clearCompleted() {
    const completedIds = todos.filter(t => t.completed).map(t => t.id);
    if (completedIds.length === 0) return;
    await fetch(`${API}?id=in.(${completedIds.join(',')})`, {
        method: 'DELETE',
        headers: authHeaders()
    });
    todos = todos.filter(t => !t.completed);
    render();
}

form.addEventListener('submit', e => {
    e.preventDefault();
    if (input.value.trim()) {
        addTodo(input.value);
        input.value = '';
    }
});

filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
        filterBtns.forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        currentFilter = btn.dataset.filter;
        render();
    });
});

clearBtn.addEventListener('click', clearCompleted);

// ===== INIT =====
(async () => {
    // Önce onay linkinden gelen token var mı kontrol et
    const handled = await handleAuthCallback();
    if (handled) return;

    // Mevcut oturum var mı kontrol et
    const token = localStorage.getItem('sb_access_token');
    if (token) {
        // Token geçerli mi kontrol et
        const res = await fetch(`${AUTH}/user`, {
            headers: { 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            accessToken = token;
            currentUser = await res.json();
            showApp();
        } else {
            // Token süresi dolmuş, refresh dene
            await refreshSession();
        }
    }
})();
