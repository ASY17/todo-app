const SUPABASE_URL = 'https://mkhyoezimdtvermhnldd.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1raHlvZXppbWR0dmVybWhubGRkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQzNzU0NTEsImV4cCI6MjA4OTk1MTQ1MX0.3L73sd38DLQB8QLJTOSCQdQhGC5P1fdNjvwS4iSTLoY';
const API = `${SUPABASE_URL}/rest/v1/todos`;
const headers = {
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
};

const form = document.getElementById('todo-form');
const input = document.getElementById('todo-input');
const list = document.getElementById('todo-list');
const countEl = document.getElementById('todo-count');
const clearBtn = document.getElementById('clear-completed');
const filterBtns = document.querySelectorAll('.filter-btn');

let todos = [];
let currentFilter = 'all';

async function fetchTodos() {
    const res = await fetch(`${API}?select=*&order=created_at.asc`, { headers });
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
        headers,
        body: JSON.stringify({ text: text.trim(), completed: false })
    });
    const [newTodo] = await res.json();
    todos.push(newTodo);
    render();
}

async function toggleTodo(id, completed) {
    await fetch(`${API}?id=eq.${id}`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ completed })
    });
    const todo = todos.find(t => t.id === id);
    if (todo) todo.completed = completed;
    render();
}

async function deleteTodo(id) {
    await fetch(`${API}?id=eq.${id}`, {
        method: 'DELETE',
        headers
    });
    todos = todos.filter(t => t.id !== id);
    render();
}

async function updateTodoText(id, text) {
    await fetch(`${API}?id=eq.${id}`, {
        method: 'PATCH',
        headers,
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
        headers
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

fetchTodos();
