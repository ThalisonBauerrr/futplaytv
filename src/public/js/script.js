
const userIsLoggedIn = false; // Altere para true quando usuário logar

document.addEventListener('DOMContentLoaded', function() {
  const loginTrigger = document.getElementById('loginTrigger');
  const loginModal = document.getElementById('loginModal');
  const closeModal = document.querySelector('.close-modal');

  // Abre modal
  if (loginTrigger) {
    loginTrigger.addEventListener('click', function(e) {
      e.preventDefault();
      loginModal.style.display = 'flex';
      document.body.style.overflow = 'hidden';
    });
  }

  // Fecha modal
  function closeLoginModal() {
    loginModal.style.display = 'none';
    document.body.style.overflow = '';
  }

  if (closeModal) {
    closeModal.addEventListener('click', closeLoginModal);
  }

  // Fecha ao clicar em qualquer área fora do modal
  loginModal.addEventListener('click', function(e) {
    if (e.target === loginModal) {
      closeLoginModal();
    }
  });

  // Fecha com ESC
  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && loginModal.style.display === 'flex') {
      closeLoginModal();
    }
  });
});
document.addEventListener('DOMContentLoaded', () => {
  // Elementos do Menu
  const menuToggle = document.querySelector('.menu-toggle');
  const menuIcon = document.getElementById('menu-icon');
  const mainNav = document.querySelector('.main-nav');
  const body = document.body;

  const menuCloseBtn = document.getElementById('menu-close-btn');
  const menuOverlay = document.querySelector('.menu-overlay');

  // Função para abrir/fechar menu
  function toggleMenu() {
    const isActive = mainNav.classList.toggle('active');
    menuToggle.classList.toggle('active');
    body.style.overflow = isActive ? 'hidden' : '';

    // Alterna ícone do botão principal
    menuIcon.classList.toggle('fa-bars', !isActive);
    menuIcon.classList.toggle('fa-times', isActive);
  }

  // Função para fechar o menu
  function closeMenu() {
    mainNav.classList.remove('active');
    menuToggle.classList.remove('active');
    menuIcon.classList.remove('fa-times');
    menuIcon.classList.add('fa-bars');
    body.style.overflow = '';
  }

  // Clique no botão do menu
  menuToggle.addEventListener('click', toggleMenu);

  // Clique no botão de fechar dentro do menu
  if (menuCloseBtn) {
    menuCloseBtn.addEventListener('click', closeMenu);
  }

  // Clique na overlay fecha o menu
  if (menuOverlay) {
    menuOverlay.addEventListener('click', closeMenu);
  }

  // Fechar menu ao clicar em qualquer link
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', closeMenu);
  });
});