// --- Admin JS (clean, DOM-ready) ---
let allPosts = [];
let editId = null;

// --- DOM elements (globals) ---
let titleInput, teaserInput, contentInput, categorySelect, tagsInput, pinnedCheckbox;
let imageInput, imagesInput, expirationInput, saveBtn, tbody, addBtn;

// --- Auth bootstrap ---
async function checkAuth() {
  try {
    const me = await fetch('/api/me').then(r => r.json());
    if (me.authenticated) {
      document.getElementById('login-panel').style.display = 'none';
      document.getElementById('admin-app').style.display = 'block';
      initAdmin(); // load posts/table/etc.
    } else {
      document.getElementById('admin-app').style.display = 'none';
      document.getElementById('login-panel').style.display = 'block';
    }
  } catch (e) {
    console.error(e);
    document.getElementById('admin-app').style.display = 'none';
    document.getElementById('login-panel').style.display = 'block';
  }
}

async function doLogin() {
  const username = document.getElementById('login-username').value.trim();
  const password = document.getElementById('login-password').value;
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type':'application/json' },
    body: JSON.stringify({ username, password })
  });
  if (res.ok) {
    document.getElementById('login-error').style.display = 'none';
    document.getElementById('login-panel').style.display = 'none';
    document.getElementById('admin-app').style.display = 'block';
    initAdmin();
  } else {
    document.getElementById('login-error').style.display = 'block';
  }
}

async function doLogout() {
  await fetch('/api/logout', { method: 'POST' });
  document.getElementById('admin-app').style.display = 'none';
  document.getElementById('login-panel').style.display = 'block';
}

// Hook up login & logout buttons once DOM is ready
window.addEventListener('DOMContentLoaded', () => {
  const lb = document.getElementById('login-btn');
  if (lb) lb.addEventListener('click', doLogin);

  const lob = document.getElementById('logout-btn');
  if (lob) lob.addEventListener('click', doLogout);

  checkAuth();
});

// --- initAdmin ---
function initAdmin() {

  // --- Assign DOM elements ---
  titleInput = document.getElementById('post-title');
  teaserInput = document.getElementById('post-teaser');
  contentInput = document.getElementById('post-content');
  categorySelect = document.getElementById('post-category');
  tagsInput = document.getElementById('post-tags');
  pinnedCheckbox = document.getElementById('post-pinned');
  imageInput = document.getElementById('post-image');
  imagesInput = document.getElementById('post-images');
  expirationInput = document.getElementById('post-expiration');
  saveBtn = document.getElementById('save-post');
  tbody = document.getElementById('posts-tbody');
  addBtn = document.getElementById('add-new-btn');

  // --- Fetch posts from server ---
  function loadPosts() {
    fetch('/posts')
      .then(res => res.json())
      .then(data => {
        allPosts = data;
        renderPostsTable();
      })
      .catch(err => console.error('Error loading posts:', err));
  }

  // --- Render posts table ---
  function renderPostsTable() {
    tbody.innerHTML = '';
    allPosts.forEach(post => {
      const tr = document.createElement('tr');
      tr.innerHTML = `
        <td>${post.title}</td>
        <td>${post.category || 'Uncategorized'}</td>
        <td>${post.teaser}</td>
        <td style="text-align:center;">
          <input type="checkbox" ${post.pinned ? 'checked' : ''} onclick="togglePin(${post.id})" title="Pin post">
          <button onclick="editPost(${post.id})">Edit</button>
          <button onclick="deletePost(${post.id})">Delete</button>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  // --- Save post (new or edit) ---
  saveBtn.addEventListener('click', () => {
    const imagesArray = imagesInput.value
      ? imagesInput.value.split(',').map(img => img.trim()).filter(Boolean)
      : [];

    if(editId !== null) {
      const existingPost = allPosts.find(p => p.id === editId);
      const updatedPost = {
        ...existingPost,
        title: titleInput.value,
        teaser: teaserInput.value,
        content: contentInput.value,
        category: categorySelect.value,
        tags: tagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean),
        pinned: pinnedCheckbox.checked,
        image: imageInput.value,
        images: imagesArray,
        expiration: expirationInput.value
      };
      allPosts = allPosts.map(p => p.id === editId ? updatedPost : p);
    } else {
      const maxId = allPosts.reduce((max,p)=>Math.max(max,p.id||0),0);
      const nextId = maxId + 1;
      const now = new Date().toISOString().split('T')[0];

      const newPost = {
        id: nextId,
        date: now,
        title: titleInput.value,
        teaser: teaserInput.value,
        content: contentInput.value,
        category: categorySelect.value,
        tags: tagsInput.value.split(',').map(tag => tag.trim()).filter(Boolean),
        pinned: pinnedCheckbox.checked,
        image: imageInput.value,
        images: imagesArray,
        expiration: expirationInput.value
      };
      allPosts.push(newPost);
    }

    savePosts();
    closeModal();
    clearForm();
    editId = null;
  });

  // --- Edit / Delete / TogglePin ---
  window.editPost = function(id) {
    editId = id;
    const post = allPosts.find(p => p.id === id);
    titleInput.value = post.title;
    teaserInput.value = post.teaser;
    contentInput.value = post.content;
    categorySelect.value = post.category;
    tagsInput.value = post.tags.join(', ');
    pinnedCheckbox.checked = post.pinned;
    imageInput.value = post.image;
    imagesInput.value = post.images ? post.images.join(', ') : '';
    expirationInput.value = post.expiration;
    openModal();
  };

  window.deletePost = function(id) {
    if(!confirm('Are you sure you want to delete this post?')) return;
    allPosts = allPosts.filter(p => p.id !== id);
    savePosts();
  };

  window.togglePin = function(id) {
    const post = allPosts.find(p => p.id === id);
    post.pinned = !post.pinned;
    savePosts();
  };

  // --- Save allPosts to server ---
  function savePosts() {
    fetch('/admin/posts', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(allPosts, null, 2)
    })
    .then(() => renderPostsTable())
    .catch(err => console.error('Error saving posts:', err));
  }

  // --- Modal helpers ---
  function openModal() { document.getElementById('edit-modal').style.display = 'block'; }
  function closeModal() { document.getElementById('edit-modal').style.display = 'none'; }
  function clearForm() {
    titleInput.value = '';
    teaserInput.value = '';
    contentInput.value = '';
    categorySelect.value = '';
    tagsInput.value = '';
    pinnedCheckbox.checked = false;
    imageInput.value = '';
    imagesInput.value = '';
    expirationInput.value = '';
  }

  // --- Add New button ---
  addBtn.addEventListener('click', () => {
    editId = null;
    clearForm();
    openModal();
  });

  // --- Initial load ---
  loadPosts();
}

function closeModal() {
	document.getElementById('edit-modal').style.display = 'none' ;
}