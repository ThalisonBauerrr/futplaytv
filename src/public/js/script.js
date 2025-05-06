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
