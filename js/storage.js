// storage.js — GL Personal Tools · Storage Inventory Log
// Supabase: rylapwjambqfppjktjra.supabase.co

const SUPABASE_URL = 'https://rylapwjambqfppjktjra.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5bGFwd2phbWJxZnBwamt0anJhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMxNjgxMjEsImV4cCI6MjA4ODc0NDEyMX0.SyTXZI2zv5EL9l7ie5uOSXvGj10G03E0yjXL0m0BgMY';
const STORAGE_BUCKET = 'container-photos';

const api = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
      ...opts.headers,
    },
    ...opts,
  });

const storageApi = (path, opts = {}) =>
  fetch(`${SUPABASE_URL}/storage/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      ...opts.headers,
    },
    ...opts,
  });

// State
let containers = [];
let binTypes = [];
let pendingPhotos = [];
let editingId = null;
let detailContainerId = null;

// Init
document.addEventListener('DOMContentLoaded', () => {
  loadBinTypes();
  loadContainers();
  bindUI();
});

// Data Loading
async function loadBinTypes() {
  const res = await api('storage_bin_types?select=id,name&order=name');
  if (res.ok) {
    binTypes = await res.json();
    populateBinTypeSelect();
  }
}

async function loadContainers() {
  const res = await api(
    'storage_containers?select=*,container_photos(id,url,label,sort_order)&order=code'
  );
  if (!res.ok) { console.error('Failed to load containers'); return; }
  containers = await res.json();
  renderGrid();
}

// Render
function renderGrid() {
  const q = (document.getElementById('search-input')?.value || '').toLowerCase();
  const grid = document.getElementById('container-grid');
  const empty = document.getElementById('empty-state');
  const countEl = document.getElementById('container-count');

  let filtered = containers;
  if (q) {
    filtered = containers.filter(c =>
      (c.code || '').toLowerCase().includes(q) ||
      (c.description || '').toLowerCase().includes(q) ||
      (c.location || '').toLowerCase().includes(q) ||
      (c.bin_type_key || '').toLowerCase().includes(q)
    );
  }

  if (countEl) countEl.textContent = filtered.length + ' container' + (filtered.length !== 1 ? 's' : '');

  if (!filtered.length) {
    grid.innerHTML = '';
    if (empty) empty.style.display = 'block';
    return;
  }
  if (empty) empty.style.display = 'none';

  grid.innerHTML = filtered.map(c => cardHTML(c)).join('');

  grid.querySelectorAll('.container-card').forEach(card => {
    card.addEventListener('click', (e) => {
      if (e.target.closest('.card-action-btn')) return;
      openDetail(card.dataset.id);
    });
  });
  grid.querySelectorAll('.card-edit-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      openEdit(btn.dataset.id);
    });
  });
}

function cardHTML(c) {
  const photos = (c.container_photos || []).sort((a, b) => a.sort_order - b.sort_order);
  const primaryPhoto = photos[0];
  const photoCount = photos.length;

  const thumb = primaryPhoto
    ? '<div class="card-thumb" style="background-image:url(\'' + primaryPhoto.url + '\')">' +
      (photoCount > 1 ? '<span class="photo-badge">' + photoCount + '</span>' : '') +
      '</div>'
    : '<div class="card-thumb card-thumb-empty"><span class="thumb-icon">&#9633;</span></div>';

  const value = c.estimated_value ? '$' + Number(c.estimated_value).toLocaleString() : '';

  return '<div class="container-card" data-id="' + c.id + '">' +
    thumb +
    '<div class="card-body">' +
      '<div class="card-top">' +
        '<span class="container-code">' + (c.code || '&mdash;') + '</span>' +
        '<button class="card-action-btn card-edit-btn" data-id="' + c.id + '" title="Edit">&#9998;</button>' +
      '</div>' +
      '<div class="container-type-label">' + (c.bin_type_key || '') + '</div>' +
      (c.description ? '<div class="card-desc">' + c.description + '</div>' : '') +
      '<div class="card-meta">' +
        (c.location ? '<span class="card-location">' + c.location + '</span>' : '') +
        (value ? '<span class="card-value">' + value + '</span>' : '') +
      '</div>' +
    '</div>' +
  '</div>';
}

// Detail Modal
function openDetail(id) {
  const c = containers.find(x => x.id === id);
  if (!c) return;
  detailContainerId = id;

  const photos = (c.container_photos || []).sort((a, b) => a.sort_order - b.sort_order);
  const modal = document.getElementById('detail-modal');

  document.getElementById('detail-code').textContent = c.code || '—';
  document.getElementById('detail-type').textContent = c.bin_type_key || '';
  document.getElementById('detail-desc').textContent = c.description || '';
  document.getElementById('detail-location').textContent = c.location || '—';
  document.getElementById('detail-value').textContent = c.estimated_value ? '$' + Number(c.estimated_value).toLocaleString() : '—';

  const linkEl = document.getElementById('detail-link');
  if (c.product_link) {
    linkEl.href = c.product_link;
    linkEl.textContent = 'View product \u2192';
    linkEl.style.display = 'inline';
  } else {
    linkEl.style.display = 'none';
  }

  const gallery = document.getElementById('detail-gallery');
  if (photos.length) {
    gallery.innerHTML = photos.map(p =>
      '<div class="gallery-item">' +
      '<img src="' + p.url + '" alt="' + p.label + '" loading="lazy" />' +
      '<span class="gallery-label">' + p.label + '</span>' +
      '</div>'
    ).join('');
  } else {
    gallery.innerHTML = '<p class="no-photos">No photos yet</p>';
  }

  modal.classList.add('open');
}

function closeDetail() {
  document.getElementById('detail-modal').classList.remove('open');
  detailContainerId = null;
}

// Add / Edit Modal
function openAdd() {
  editingId = null;
  pendingPhotos = [];
  resetForm();
  document.getElementById('modal-title').textContent = 'Add Container';
  document.getElementById('delete-btn').style.display = 'none';
  document.getElementById('add-modal').classList.add('open');
}

function openEdit(id) {
  const c = containers.find(x => x.id === id);
  if (!c) return;
  editingId = id;
  pendingPhotos = [];

  document.getElementById('modal-title').textContent = 'Edit Container';
  document.getElementById('delete-btn').style.display = 'inline-block';
  document.getElementById('f-code').value = c.code || '';
  document.getElementById('f-bin-type').value = c.bin_type_key || '';
  document.getElementById('f-description').value = c.description || '';
  document.getElementById('f-value').value = c.estimated_value || '';
  document.getElementById('f-product-link').value = c.product_link || '';
  document.getElementById('f-location').value = c.location || '';

  renderExistingPhotos(c.container_photos || []);
  renderPendingPhotos();

  document.getElementById('add-modal').classList.add('open');
}

function closeAddModal() {
  document.getElementById('add-modal').classList.remove('open');
  editingId = null;
  pendingPhotos = [];
}

function resetForm() {
  ['f-code','f-bin-type','f-description','f-value','f-product-link','f-location'].forEach(function(id) {
    var el = document.getElementById(id);
    if (el) el.value = '';
  });
  document.getElementById('existing-photos-list').innerHTML = '';
  renderPendingPhotos();
}

// Location hint buttons
function setLocation(val) {
  document.getElementById('f-location').value = val;
}

// Photo handling
function handlePhotoInput(e) {
  Array.from(e.target.files).forEach(function(file) {
    pendingPhotos.push({ file: file, label: 'exterior', previewUrl: URL.createObjectURL(file) });
  });
  e.target.value = '';
  renderPendingPhotos();
}

function renderPendingPhotos() {
  const container = document.getElementById('pending-photos');
  if (!pendingPhotos.length) { container.innerHTML = ''; return; }
  container.innerHTML = pendingPhotos.map(function(p, i) {
    return '<div class="pending-photo-row">' +
      '<img src="' + p.previewUrl + '" class="pending-thumb" alt="preview" />' +
      '<select class="pending-label-select" data-index="' + i + '" onchange="updatePendingLabel(' + i + ', this.value)">' +
        '<option value="exterior"' + (p.label==='exterior'?' selected':'') + '>exterior</option>' +
        '<option value="interior"' + (p.label==='interior'?' selected':'') + '>interior</option>' +
        '<option value="detail"'   + (p.label==='detail'?' selected':'')   + '>detail</option>' +
      '</select>' +
      '<button class="remove-pending-btn" onclick="removePending(' + i + ')" title="Remove">\u00d7</button>' +
    '</div>';
  }).join('');
}

function updatePendingLabel(index, val) {
  if (pendingPhotos[index]) pendingPhotos[index].label = val;
}

function removePending(index) {
  pendingPhotos.splice(index, 1);
  renderPendingPhotos();
}

function renderExistingPhotos(photos) {
  const list = document.getElementById('existing-photos-list');
  if (!photos.length) { list.innerHTML = ''; return; }
  list.innerHTML = photos
    .sort(function(a,b){ return a.sort_order - b.sort_order; })
    .map(function(p) {
      return '<div class="existing-photo-row" data-photo-id="' + p.id + '">' +
        '<img src="' + p.url + '" class="pending-thumb" alt="' + p.label + '" />' +
        '<select class="pending-label-select" onchange="updateExistingLabel(\'' + p.id + '\', this.value)">' +
          '<option value="exterior"' + (p.label==='exterior'?' selected':'') + '>exterior</option>' +
          '<option value="interior"' + (p.label==='interior'?' selected':'') + '>interior</option>' +
          '<option value="detail"'   + (p.label==='detail'?' selected':'')   + '>detail</option>' +
        '</select>' +
        '<button class="remove-pending-btn" onclick="deleteExistingPhoto(\'' + p.id + '\')" title="Delete">\u00d7</button>' +
      '</div>';
    }).join('');
}

async function updateExistingLabel(photoId, label) {
  await api('container_photos?id=eq.' + photoId, {
    method: 'PATCH',
    body: JSON.stringify({ label: label }),
  });
}

async function deleteExistingPhoto(photoId) {
  await api('container_photos?id=eq.' + photoId, { method: 'DELETE' });
  var row = document.querySelector('[data-photo-id="' + photoId + '"]');
  if (row) row.remove();
  if (editingId) {
    var c = containers.find(function(x){ return x.id === editingId; });
    if (c) c.container_photos = (c.container_photos || []).filter(function(p){ return p.id !== photoId; });
  }
}

async function uploadPhotos(containerId) {
  for (var i = 0; i < pendingPhotos.length; i++) {
    var p = pendingPhotos[i];
    var ext = p.file.name.split('.').pop();
    var path = containerId + '/' + Date.now() + '-' + i + '.' + ext;

    var uploadRes = await storageApi('object/' + STORAGE_BUCKET + '/' + path, {
      method: 'POST',
      headers: { 'Content-Type': p.file.type },
      body: p.file,
    });

    if (!uploadRes.ok) { console.error('Photo upload failed', await uploadRes.text()); continue; }

    var url = SUPABASE_URL + '/storage/v1/object/public/' + STORAGE_BUCKET + '/' + path;
    await api('container_photos', {
      method: 'POST',
      body: JSON.stringify({ container_id: containerId, url: url, label: p.label, sort_order: i }),
    });
  }
}

// Save
async function saveContainer() {
  var saveBtn = document.getElementById('save-btn');
  saveBtn.disabled = true;
  saveBtn.textContent = 'Saving\u2026';

  var data = {
    code: document.getElementById('f-code').value.trim().toUpperCase(),
    bin_type_key: document.getElementById('f-bin-type').value.trim(),
    description: document.getElementById('f-description').value.trim(),
    estimated_value: document.getElementById('f-value').value || null,
    product_link: document.getElementById('f-product-link').value.trim() || null,
    location: document.getElementById('f-location').value.trim(),
  };

  if (!data.code) {
    alert('Container code is required.');
    saveBtn.disabled = false;
    saveBtn.textContent = 'Save';
    return;
  }

  var containerId = editingId;

  if (editingId) {
    var res = await api('storage_containers?id=eq.' + editingId, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    if (!res.ok) { alert('Save failed.'); saveBtn.disabled = false; saveBtn.textContent = 'Save'; return; }
  } else {
    var res = await api('storage_containers', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    if (!res.ok) { alert('Save failed.'); saveBtn.disabled = false; saveBtn.textContent = 'Save'; return; }
    var created = await res.json();
    containerId = created[0].id;
  }

  if (pendingPhotos.length) {
    await uploadPhotos(containerId);
  }

  closeAddModal();
  await loadContainers();
  saveBtn.disabled = false;
  saveBtn.textContent = 'Save';
}

// Delete
async function deleteContainer() {
  if (!editingId) return;
  var c = containers.find(function(x){ return x.id === editingId; });
  if (!confirm('Delete container "' + (c ? c.code : '') + '"? This cannot be undone.')) return;
  await api('storage_containers?id=eq.' + editingId, { method: 'DELETE' });
  closeAddModal();
  await loadContainers();
}

// Bin Types Manager
function openBinTypes() {
  renderBinTypesList();
  document.getElementById('bin-types-modal').classList.add('open');
}

function closeBinTypes() {
  document.getElementById('bin-types-modal').classList.remove('open');
}

function renderBinTypesList() {
  var list = document.getElementById('bin-types-list');
  list.innerHTML = binTypes.map(function(bt) {
    return '<div class="bin-type-row">' +
      '<span>' + bt.name + '</span>' +
      '<button class="remove-pending-btn" onclick="deleteBinType(\'' + bt.id + '\')" title="Delete">\u00d7</button>' +
    '</div>';
  }).join('');
}

async function addBinType() {
  var input = document.getElementById('new-bin-type-input');
  var name = input.value.trim();
  if (!name) return;
  var res = await api('storage_bin_types', {
    method: 'POST',
    body: JSON.stringify({ name: name }),
  });
  if (res.ok) {
    input.value = '';
    await loadBinTypes();
    renderBinTypesList();
  }
}

async function deleteBinType(id) {
  await api('storage_bin_types?id=eq.' + id, { method: 'DELETE' });
  binTypes = binTypes.filter(function(bt){ return bt.id !== id; });
  renderBinTypesList();
  populateBinTypeSelect();
}

function populateBinTypeSelect() {
  var sel = document.getElementById('f-bin-type');
  if (!sel) return;
  var current = sel.value;
  sel.innerHTML = '<option value="">\u2014 select type \u2014</option>' +
    binTypes.map(function(bt){ return '<option value="' + bt.name + '">' + bt.name + '</option>'; }).join('');
  if (current) sel.value = current;
}

// Insurance Report
function openInsurance() {
  var tbody = document.getElementById('insurance-table-body');
  var total = 0;
  tbody.innerHTML = containers.map(function(c) {
    var val = Number(c.estimated_value) || 0;
    total += val;
    return '<tr>' +
      '<td><strong>' + (c.code || '&mdash;') + '</strong></td>' +
      '<td>' + (c.bin_type_key || '') + '</td>' +
      '<td>' + (c.description || '') + '</td>' +
      '<td>' + (c.location || '') + '</td>' +
      '<td style="text-align:right">' + (val ? '$' + val.toLocaleString() : '') + '</td>' +
    '</tr>';
  }).join('');
  document.getElementById('insurance-total').textContent = '$' + total.toLocaleString();
  document.getElementById('insurance-modal').classList.add('open');
}

function closeInsurance() {
  document.getElementById('insurance-modal').classList.remove('open');
}

function printInsurance() {
  window.print();
}

// UI Bindings
function bindUI() {
  document.getElementById('search-input')?.addEventListener('input', renderGrid);
  document.getElementById('add-btn')?.addEventListener('click', openAdd);
  document.getElementById('photo-input')?.addEventListener('change', handlePhotoInput);
  document.getElementById('save-btn')?.addEventListener('click', saveContainer);
  document.getElementById('delete-btn')?.addEventListener('click', deleteContainer);
  document.getElementById('close-add-modal')?.addEventListener('click', closeAddModal);
  document.getElementById('close-detail-modal')?.addEventListener('click', closeDetail);
  document.getElementById('detail-edit-btn')?.addEventListener('click', function() {
    closeDetail();
    if (detailContainerId) openEdit(detailContainerId);
  });
  document.getElementById('insurance-btn')?.addEventListener('click', openInsurance);
  document.getElementById('close-insurance-modal')?.addEventListener('click', closeInsurance);
  document.getElementById('print-insurance-btn')?.addEventListener('click', printInsurance);
  document.getElementById('bin-types-btn')?.addEventListener('click', openBinTypes);
  document.getElementById('close-bin-types-modal')?.addEventListener('click', closeBinTypes);
  document.getElementById('add-bin-type-btn')?.addEventListener('click', addBinType);
  document.getElementById('new-bin-type-input')?.addEventListener('keydown', function(e) {
    if (e.key === 'Enter') addBinType();
  });
  document.getElementById('add-modal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeAddModal();
  });
  document.getElementById('detail-modal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeDetail();
  });
  document.getElementById('insurance-modal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeInsurance();
  });
  document.getElementById('bin-types-modal')?.addEventListener('click', function(e) {
    if (e.target === e.currentTarget) closeBinTypes();
  });
}
