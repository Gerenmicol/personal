// ── State ──────────────────────────────────────────────
let allTasks = [];

const CATEGORY_ICONS = {
  storage:    `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8"/></svg>`,
  mobile_kit: `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>`,
  sell:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path stroke-linecap="round" stroke-linejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z"/></svg>`,
  trash:      `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6"/></svg>`,
  gift:       `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="20 12 20 22 4 22 4 12"/><rect x="2" y="7" width="20" height="5"/><line x1="12" y1="22" x2="12" y2="7"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7z"/><path stroke-linecap="round" stroke-linejoin="round" d="M12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z"/></svg>`,
};

// ── Load Tasks ─────────────────────────────────────────
async function loadTasks() {
  const { data, error } = await db
    .from('moving_tasks')
    .select('*')
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error loading tasks:', error);
    document.getElementById('task-list').innerHTML =
      `<div class="empty-state"><p>Error loading tasks. Check console.</p></div>`;
    return;
  }

  allTasks = data || [];
  updateStats();
  updateCategoryBreakdown();
  renderTasks();
}

// ── Stats ──────────────────────────────────────────────
function updateStats() {
  const total     = allTasks.length;
  const completed = allTasks.filter(t => t.stage === 'completed').length;
  const inProg    = allTasks.filter(t => t.stage === 'in_progress').length;
  const notStart  = allTasks.filter(t => t.stage === 'not_started').length;
  const pct       = total > 0 ? Math.round((completed / total) * 100) : 0;

  document.getElementById('count-completed').textContent   = completed;
  document.getElementById('count-in-progress').textContent = inProg;
  document.getElementById('count-not-started').textContent = notStart;
  document.getElementById('progress-pct').textContent      = pct + '%';
  document.getElementById('progress-bar').style.width      = pct + '%';
}

// ── Category Breakdown ─────────────────────────────────
function updateCategoryBreakdown() {
  const cats = ['storage', 'mobile_kit', 'sell', 'trash', 'gift'];
  const counts = {};
  cats.forEach(c => counts[c] = 0);
  allTasks.forEach(t => { if (counts[t.category] !== undefined) counts[t.category]++; });

  const grid = document.getElementById('category-grid');
  grid.innerHTML = cats.map(cat => `
    <div class="cat-chip">
      <div class="cat-icon">${CATEGORY_ICONS[cat] || ''}</div>
      <div class="cat-count">${counts[cat]}</div>
      <div class="cat-label">${cat.replace('_', ' ')}</div>
    </div>
  `).join('');
}

// ── Filter & Sort ──────────────────────────────────────
function getFilteredTasks() {
  const search   = document.getElementById('search-input').value.toLowerCase().trim();
  const category = document.getElementById('filter-category').value;
  const stage    = document.getElementById('filter-stage').value;
  const room     = document.getElementById('filter-room').value;
  const sort     = document.getElementById('sort-select').value;

  let tasks = [...allTasks];

  if (search)   tasks = tasks.filter(t =>
    t.subject?.toLowerCase().includes(search) ||
    t.description?.toLowerCase().includes(search)
  );
  if (category) tasks = tasks.filter(t => t.category === category);
  if (stage)    tasks = tasks.filter(t => t.stage === stage);
  if (room)     tasks = tasks.filter(t => t.room_location === room);

  const stageOrder = { not_started: 0, in_progress: 1, completed: 2 };
  const priorityOrder = { critical: 0, necessary: 1 };

  tasks.sort((a, b) => {
    if (sort === 'date')     return new Date(a.target_date) - new Date(b.target_date);
    if (sort === 'priority') return (priorityOrder[a.priority] ?? 1) - (priorityOrder[b.priority] ?? 1);
    if (sort === 'category') return (a.category || '').localeCompare(b.category || '');
    if (sort === 'stage')    return (stageOrder[a.stage] ?? 0) - (stageOrder[b.stage] ?? 0);
    return 0;
  });

  return tasks;
}

// ── Render Tasks ───────────────────────────────────────
function renderTasks() {
  const tasks = getFilteredTasks();
  const list  = document.getElementById('task-list');
  const count = document.getElementById('task-count');

  count.textContent = `Showing ${tasks.length} of ${allTasks.length} task${allTasks.length !== 1 ? 's' : ''}`;

  if (tasks.length === 0) {
    list.innerHTML = `
      <div class="empty-state">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path stroke-linecap="round" stroke-linejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/></svg>
        <h3>No tasks found</h3>
        <p>Try adjusting your filters or add a new task.</p>
      </div>`;
    return;
  }

  list.innerHTML = tasks.map(task => `
    <div class="task-card ${task.stage === 'completed' ? 'completed' : ''}">
      <div class="task-header">
        <div style="display:flex;gap:8px;align-items:flex-start;flex:1;">
          <div class="stage-dot ${task.stage}"></div>
          <div style="flex:1;">
            <div class="task-title">${escapeHtml(task.subject || '')}</div>
            <span class="badge badge-${task.category}" style="margin-top:4px;">
              ${(task.category || '').replace('_', ' ')}
            </span>
          </div>
        </div>
        <div class="task-actions">
          <button class="btn btn-ghost" onclick="editTask('${task.id}')" title="Edit">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"/></svg>
          </button>
          <button class="btn btn-ghost" onclick="duplicateTask('${task.id}')" title="Duplicate">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><rect x="9" y="9" width="13" height="13" rx="2"/><path stroke-linecap="round" stroke-linejoin="round" d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1"/></svg>
          </button>
          <button class="btn btn-danger" onclick="deleteTask('${task.id}')" title="Delete">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="16" height="16"><polyline points="3 6 5 6 21 6"/><path stroke-linecap="round" stroke-linejoin="round" d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m5 0V4h4v2"/></svg>
          </button>
        </div>
      </div>
      ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
      <div class="task-meta">
        <span class="task-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><circle cx="12" cy="11" r="3"/></svg>
          ${capitalize(task.room_location || 'other')}
        </span>
        <span class="task-meta-item">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="12" height="12"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>
          ${formatDate(task.target_date)}
        </span>
        <span class="task-meta-item ${task.priority === 'critical' ? 'priority-critical' : 'priority-necessary'}">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" width="12" height="12"><path stroke-linecap="round" stroke-linejoin="round" d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7"/></svg>
          ${capitalize(task.priority || 'necessary')}
        </span>
      </div>
    </div>
  `).join('');
}

// ── Save Task (Add or Edit) ────────────────────────────
async function saveTask() {
  const id          = document.getElementById('edit-task-id').value;
  const subject     = document.getElementById('task-subject').value.trim();
  const description = document.getElementById('task-description').value.trim();
  const category    = document.getElementById('task-category').value;
  const room        = document.getElementById('task-room').value;
  const date        = document.getElementById('task-date').value;
  const stage       = document.getElementById('task-stage').value;
  const priority    = document.getElementById('task-priority').value;

  if (!subject) { showToast('Subject is required'); return; }
  if (!date)    { showToast('Target date is required'); return; }

  const btn = document.getElementById('save-task-btn');
  btn.disabled = true;
  btn.textContent = 'Saving…';

  const payload = { subject, description, category, room_location: room,
                    target_date: date, stage, priority };

  let error;
  if (id) {
    ({ error } = await db.from('moving_tasks').update(payload).eq('id', id));
  } else {
    ({ error } = await db.from('moving_tasks').insert(payload));
  }

  btn.disabled = false;
  btn.textContent = id ? 'Save Changes' : 'Add Task';

  if (error) { showToast('Error saving task'); console.error(error); return; }

  closeModal('add-task-modal');
  showToast(id ? 'Task updated ✓' : 'Task added ✓');
  await loadTasks();
}

// ── Edit Task ──────────────────────────────────────────
function editTask(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;

  document.getElementById('modal-title').textContent    = 'Edit Task';
  document.getElementById('save-task-btn').textContent  = 'Save Changes';
  document.getElementById('edit-task-id').value         = task.id;
  document.getElementById('task-subject').value         = task.subject || '';
  document.getElementById('task-description').value     = task.description || '';
  document.getElementById('task-category').value        = task.category || 'storage';
  document.getElementById('task-room').value            = task.room_location || 'other';
  document.getElementById('task-date').value            = task.target_date || '';
  document.getElementById('task-stage').value           = task.stage || 'not_started';
  document.getElementById('task-priority').value        = task.priority || 'necessary';

  openModal('add-task-modal');
}

// ── Duplicate Task ─────────────────────────────────────
async function duplicateTask(id) {
  const task = allTasks.find(t => t.id === id);
  if (!task) return;

  const { id: _, created_at, ...rest } = task;
  rest.subject = rest.subject + ' (copy)';

  const { error } = await db.from('moving_tasks').insert(rest);
  if (error) { showToast('Error duplicating task'); return; }

  showToast('Task duplicated ✓');
  await loadTasks();
}

// ── Delete Task ────────────────────────────────────────
async function deleteTask(id) {
  if (!confirm('Delete this task? This cannot be undone.')) return;

  const { error } = await db.from('moving_tasks').delete().eq('id', id);
  if (error) { showToast('Error deleting task'); return; }

  showToast('Task deleted');
  await loadTasks();
}

// ── Reset modal on open ────────────────────────────────
document.getElementById('add-task-modal')?.addEventListener('click', () => {});

const origOpenModal = window.openModal;
window.openModal = function(id) {
  if (id === 'add-task-modal') {
    const editId = document.getElementById('edit-task-id').value;
    if (!editId) {
      // Fresh add — reset form
      document.getElementById('modal-title').textContent   = 'Add New Task';
      document.getElementById('save-task-btn').textContent = 'Add Task';
      document.getElementById('edit-task-id').value        = '';
      document.getElementById('task-subject').value        = '';
      document.getElementById('task-description').value    = '';
      document.getElementById('task-category').value       = 'storage';
      document.getElementById('task-room').value           = 'other';
      document.getElementById('task-date').value           = new Date().toISOString().split('T')[0];
      document.getElementById('task-stage').value          = 'not_started';
      document.getElementById('task-priority').value       = 'necessary';
    }
  }
  origOpenModal(id);
};

// ── Helpers ────────────────────────────────────────────
function escapeHtml(str) {
  return str.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')
            .replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

// ── Init ───────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', loadTasks);
