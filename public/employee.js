if (!localStorage.getItem('token')) window.location.href = '/index.html';

document.getElementById('greeting').textContent =
  `Welcome, ${localStorage.getItem('fullName')}`;

function logout() {
  localStorage.clear();
  window.location.href = '/index.html';
}

document.getElementById('logoutBtn').addEventListener('click', logout);
