document.addEventListener('DOMContentLoaded', function() {
  // Estado da aplicação
  const userToken = localStorage.getItem('userToken');
  const userIsLoggedIn = userToken !== null;
  
  // Lista de rotas protegidas
  const protectedRoutes = ['/adulto', '/outra-rota-protegida'];

  // Função utilitária para ler cookies
  function getCookie(name) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    return parts.length === 2 ? parts.pop().split(';').shift() : null;
  }

  // ========== GERENCIAMENTO DE UI DE LOGIN ==========  
  function updateUIForLoginState(isLoggedIn) {
    const userArea = document.querySelector('.user-area');
    if (!userArea) return;

    if (isLoggedIn) {
      // Esconde elementos de login/cadastro
      const loginTrigger = document.getElementById('loginTrigger');
      const registerText = document.querySelector('.register-text');
      if (loginTrigger) loginTrigger.style.display = 'none';
      if (registerText) registerText.style.display = 'none';
      
      // Mostra dropdown de perfil (cria se não existir)
      const profileDropdown = document.querySelector('.profile-dropdown');
      if (!profileDropdown) {
        createProfileDropdown();
      } else {
        profileDropdown.style.display = 'block';
      }
    } else {
      // Mostra elementos de login/cadastro
      const loginTrigger = document.getElementById('loginTrigger');
      const registerText = document.querySelector('.register-text');
      if (loginTrigger) loginTrigger.style.display = 'flex';
      if (registerText) registerText.style.display = 'inline';
      
      // Esconde dropdown de perfil
      const profileDropdown = document.querySelector('.profile-dropdown');
      if (profileDropdown) profileDropdown.style.display = 'none';
    }
  }

  function createProfileDropdown() {
    const userArea = document.querySelector('.user-area');
    if (!userArea) return;

    const dropdownHTML = `
      <div class="profile-dropdown">
        <button class="profile-btn">
          <i class="fas fa-user-circle profile-icon"></i>
          <span class="profile-text">Minha Conta</span>
          <i class="fas fa-caret-down"></i>
        </button>
        <div class="dropdown-content">
          <a href="/perfil" class="dropdown-item">
            <i class="fas fa-user"></i> Perfil
          </a>
          <a href="/configuracoes" class="dropdown-item">
            <i class="fas fa-cog"></i> Configurações
          </a>
          <div class="dropdown-divider"></div>
          <a href="#" class="dropdown-item logout-btn">
            <i class="fas fa-sign-out-alt"></i> Sair
          </a>
        </div>
      </div>
    `;
    
    userArea.insertAdjacentHTML('beforeend', dropdownHTML);
    setupDropdownEvents();
  }

  function setupDropdownEvents() {
    const dropdownBtn = document.querySelector('.profile-btn');
    const dropdownContent = document.querySelector('.dropdown-content');
    const logoutBtn = document.querySelector('.logout-btn');

    if (dropdownBtn && dropdownContent) {
      dropdownBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        dropdownContent.style.display = dropdownContent.style.display === 'block' ? 'none' : 'block';
      });
    }

    if (logoutBtn) {
      logoutBtn.addEventListener('click', async (e) => {
        e.preventDefault();
        await handleLogout();
      });
    }

    // Fechar dropdown ao clicar fora
    document.addEventListener('click', (e) => {
      if (dropdownContent && !e.target.closest('.profile-dropdown')) {
        dropdownContent.style.display = 'none';
      }
    });
  }

  async function handleLogout() {
    try {
      const token = localStorage.getItem('userToken');
      
      if (!token) {
        console.log('Nenhum usuário logado');
        return;
      }
  
      const response = await fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
  
      const data = await response.json();
  
      if (!response.ok) {
        throw new Error(data.message || 'Falha ao fazer logout');
      }
  
      // Limpa os dados do frontend
      localStorage.removeItem('userToken');
      window.location.href = '/'; // Redireciona para a página inicial
      
    } catch (error) {
      console.error('Erro no logout:', error);
      // Mostra mensagem amigável para o usuário
      alert('Ocorreu um erro ao sair. Por favor, tente novamente.');
    }
  }
  
  // Vincule o evento corretamente
  document.querySelectorAll('.logout-btn').forEach(btn => {
    btn.addEventListener('click', async (e) => {
      e.preventDefault();
      await handleLogout();
    });
  });

  // Atualiza a UI inicialmente
  updateUIForLoginState(userIsLoggedIn);

  // ========== GERENCIAMENTO DE MODAIS ==========  
  const modalManager = (function() {
    // Elementos
    const elements = {
      loginTrigger: document.getElementById('loginTrigger'),
      registerText: document.querySelector('.register-text'),
      loginModal: document.getElementById('loginModal'),
      registerModal: document.getElementById('registerModal'),
      closeButtons: document.querySelectorAll('.close-modal'),
      switchToLogin: document.querySelector('.switch-to-login'),
      switchToRegister: document.querySelector('.switch-to-register'),
      uuidInput: document.getElementById('uuidInput'),
      loginForm: document.querySelector('.login-form'),
      registerForm: document.querySelector('.register-form'),
      registerEmail: document.getElementById('registerEmail'),
      registerPassword: document.getElementById('registerPassword'),
      confirmPassword: document.getElementById('confirmPassword')
    };
  
    // Controle de redirecionamento
    let shouldRedirectToHome = false;
    let isProcessing = false;
  
    // Verificação inicial para garantir que os modais estão fechados
    function ensureModalsClosed() {
      if (elements.loginModal) elements.loginModal.style.display = 'none';
      if (elements.registerModal) elements.registerModal.style.display = 'none';
      document.body.style.overflow = '';
      document.body.classList.remove('modal-open');
    }
  
    // Funções
    async function fillUUID() {
      if (!elements.uuidInput) return;
      
      try {
        const response = await fetch('/api/get-uuid');
        if (response.ok) {
          const { uuid } = await response.json();
          if (uuid) {
            elements.uuidInput.value = uuid;
            elements.uuidInput.placeholder = uuid; 
            elements.uuidInput.readOnly = true;
            elements.uuidInput.style.userSelect = 'none';
            elements.uuidInput.onfocus = () => elements.uuidInput.blur();
            elements.uuidInput.style.cursor = 'default';
            elements.uuidInput.style.color = '#777';
          }
        }
      } catch (error) {
        console.error('Erro ao obter UUID:', error);
        const uuid = getCookie('uuid');
        if (uuid) {
          elements.uuidInput.value = uuid;
          elements.uuidInput.placeholder = uuid;
          elements.uuidInput.readOnly = true;
          elements.uuidInput.style.userSelect = 'none';
          elements.uuidInput.onfocus = () => elements.uuidInput.blur();
        }
      }
    }
  
    function openModal(modal) {
      if (modal) {
        ensureModalsClosed();
        modal.style.display = 'flex';
        document.body.style.overflow = 'hidden';
        document.body.classList.add('modal-open');
        
        if (modal === elements.registerModal) {
          fillUUID();
          if (window.location.pathname === '/adulto') {
            shouldRedirectToHome = true;
          }
        }
      }
    }
  
    function closeModal(modal) {
      if (modal) {
        modal.style.display = 'none';
        document.body.style.overflow = '';
        document.body.classList.remove('modal-open');
        
        if (shouldRedirectToHome && modal === elements.loginModal) {
          setTimeout(() => {
            window.location.href = '/';
          }, 300);
        }
      }
    }
  
    function closeAllModals() {
      closeModal(elements.loginModal);
      closeModal(elements.registerModal);
    }
  
    async function handleLogin() {
      if (isProcessing) return;
      isProcessing = true;
      
      const username = elements.loginForm?.querySelector('input[type="text"]')?.value;
      const password = elements.loginForm?.querySelector('input[type="password"]')?.value;
      
      try {
        if (!username || !password) {
          throw new Error('Por favor, preencha todos os campos!');
        }
  
        const response = await fetch('/api/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            email: username,
            password: password
          })
        });
  
        const data = await response.json();
  
        if (!response.ok) {
          throw new Error(data.error || 'Erro no login');
        }
  
        // Armazena o token e atualiza a UI
        localStorage.setItem('userToken', data.token);
        updateUIForLoginState(true);
        closeAllModals();
        
        // Recarrega a página para garantir que todos os componentes reconheçam o novo estado
        window.location.reload();
  
      } catch (error) {
        console.error('Erro no login:', error);
        alert(error.message);
      } finally {
        isProcessing = false;
      }
    }
  
    async function handleRegister() {
      if (isProcessing) return;
      isProcessing = true;
    
      try {
        const formData = {
          uuid: elements.uuidInput.value,
          email: elements.registerEmail.value,
          password: elements.registerPassword.value
        };
    
        const response = await fetch('/api/auth/registrar', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(formData)
        });
    
        const data = await response.json();
    
        if (!response.ok) {
          throw new Error(data.error || 'Erro no cadastro');
        }
    
        alert('Cadastro realizado! Faça login para continuar.');
        closeModal(elements.registerModal);
        openModal(elements.loginModal);
    
      } catch (error) {
        console.error('Erro no cadastro:', error);
        alert(error.message);
      } finally {
        isProcessing = false;
      }
    }
  
    function checkAuthAndOpenModal() {
      if (userIsLoggedIn) return;
      
      const currentRoute = window.location.pathname;
      if (protectedRoutes.includes(currentRoute)) {
        openModal(elements.loginModal);
      }
    }
  
    // Event Listeners
    function setupEventListeners() {
      ensureModalsClosed();
  // Inicialização - garante que todos os modals estão fechados
      document.addEventListener('DOMContentLoaded', () => {
        document.querySelectorAll('.login-modal, .register-modal').forEach(modal => {
          modal.style.display = 'none';
        });
      });
      // Abrir modais
      if (elements.loginTrigger) {
        elements.loginTrigger.addEventListener('click', (e) => {
          e.preventDefault();
          openModal(elements.loginModal);
        });
      }
  
      if (elements.registerText) {
        elements.registerText.addEventListener('click', (e) => {
          e.preventDefault();
          openModal(elements.registerModal);
        });
      }
  
      // Fechar modais
      elements.closeButtons.forEach(button => {
        button.addEventListener('click', closeAllModals);
      });
  
      // Alternar entre modais
      if (elements.switchToLogin) {
        elements.switchToLogin.addEventListener('click', (e) => {
          e.preventDefault();
          closeModal(elements.registerModal);
          openModal(elements.loginModal);
        });
      }
  
      if (elements.switchToRegister) {
        elements.switchToRegister.addEventListener('click', (e) => {
          e.preventDefault();
          closeModal(elements.loginModal);
          openModal(elements.registerModal);
        });
      }
  
      // Fechar ao clicar fora
      window.addEventListener('click', (e) => {
        if (e.target === elements.loginModal) closeModal(elements.loginModal);
        if (e.target === elements.registerModal) closeModal(elements.registerModal);
      });
  
      // Fechar com ESC
      document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') closeAllModals();
      });
  
      // Formulário de login
      if (elements.loginForm) {
        elements.loginForm.addEventListener('submit', (e) => {
          e.preventDefault();
          handleLogin();
        });
      }
  
      // Formulário de cadastro
      if (elements.registerForm) {
        elements.registerForm.addEventListener('submit', (e) => {
          e.preventDefault();
          handleRegister();
        });
      }
  
      // Verificação de hash na URL
      if (window.location.hash === '#register') {
        openModal(elements.registerModal);
        history.replaceState(null, null, ' '); // Limpa o hash
      } else if (window.location.hash === '#login') {
        openModal(elements.loginModal);
        history.replaceState(null, null, ' '); // Limpa o hash
      }
    }
  
    return {
      init: setupEventListeners,
      checkAuth: checkAuthAndOpenModal,
      handleLogin: handleLogin,
      handleRegister: handleRegister
    };
  })();

  // ========== GERENCIAMENTO DO MENU MOBILE ==========  
  const menuManager = (function() {
    const elements = {
      menuToggle: document.querySelector('.menu-toggle'),
      menuIcon: document.querySelector('.menu-toggle svg'),
      mainNav: document.querySelector('.main-nav'),
      menuOverlay: document.querySelector('.menu-overlay'),
      navLinks: document.querySelectorAll('.nav-link'),
      menuCloseBtn: document.querySelector('.menu-close-btn') // Adicionando o botão de fechar
    };
  
    function toggleMenu() {
      const isActive = elements.mainNav.classList.toggle('active');
      elements.menuToggle.classList.toggle('active');
      document.body.style.overflow = isActive ? 'hidden' : '';
      document.body.classList.toggle('menu-open', isActive);
  
      if (elements.menuIcon) {
        elements.menuIcon.classList.toggle('fa-bars', !isActive);
        elements.menuIcon.classList.toggle('fa-times', isActive);
      }
    }
  
    // Função para fechar o menu
    function closeMenu() {
      elements.mainNav.classList.remove('active');
      elements.menuToggle.classList.remove('active');
      document.body.style.overflow = '';
      document.body.classList.remove('menu-open');
  
      if (elements.menuIcon) {
        elements.menuIcon.classList.remove('fa-times');
        elements.menuIcon.classList.add('fa-bars');
      }
    }
  
    // Adicionando o evento de clique no botão de fechar
    function setupEventListeners() {
      if (elements.menuToggle) elements.menuToggle.addEventListener('click', toggleMenu);
      if (elements.menuOverlay) elements.menuOverlay.addEventListener('click', closeMenu);
      
      // Evento para o botão de fechar o menu
      if (elements.menuCloseBtn) {
        elements.menuCloseBtn.addEventListener('click', closeMenu);
      }
  
      elements.navLinks.forEach(link => {
        link.addEventListener('click', closeMenu);
      });
    }
  
    return {
      init: setupEventListeners
    };
  })();

  // ========== INICIALIZAÇÃO ==========  
  modalManager.init();
  menuManager.init();
  modalManager.checkAuth();
});
