document.addEventListener('DOMContentLoaded', function() {
  // Elementos do menu
  const menuContainer = document.querySelector('.menu-container');
  const menuToggle = document.querySelector('.menu-toggle');
  const closeMenu = document.querySelector('.close-menu');
  const menuOverlay = document.querySelector('.menu-overlay');
  
  // Verifica se é mobile
  function isMobile() {
    return window.innerWidth < 1024;
  }
  
  // Verifica se todos os elementos existem
  function initMenu() {
    if (!menuContainer || !menuToggle || !closeMenu || !menuOverlay) {
      console.error('Elementos do menu não encontrados');
      return false;
    }
    return true;
  }
  
  
  // Funções do menu
  function openMenu() {
    if (isMobile()) {
      menuContainer.classList.add('menu-active');
      document.body.style.overflow = 'hidden';
    }
  }
  
  function closeMenuHandler() {
    if (isMobile()) {
      menuContainer.classList.remove('menu-active');
      document.body.style.overflow = '';
    }
  }
  
  // Inicialização
  if (initMenu()) {
    menuToggle.addEventListener('click', openMenu);
    closeMenu.addEventListener('click', closeMenuHandler);
    menuOverlay.addEventListener('click', closeMenuHandler);
    
    // Fechar com ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && menuContainer.classList.contains('menu-active')) {
        closeMenuHandler();
      }
    });
    
    // Fechar ao clicar em links
    document.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        if (isMobile()) {
          closeMenuHandler();
        }
      });
    });
  }
  
  // Inicializa o cronômetro se os elementos existirem
  initTimer();
  
  // Redimensionamento
  window.addEventListener('resize', () => {
    if (!isMobile()) {
      closeMenuHandler();
    }
  });
});