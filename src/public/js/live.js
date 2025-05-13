// Funções premium para o site
document.addEventListener('DOMContentLoaded', function() {
  // Efeito de digitação no título
  const pageTitle = document.querySelector('.page-title');
  if (pageTitle) {
    const originalText = pageTitle.textContent;
    pageTitle.textContent = '';
    
    let i = 0;
    const typingEffect = setInterval(() => {
      if (i < originalText.length) {
        pageTitle.textContent += originalText.charAt(i);
        i++;
      } else {
        clearInterval(typingEffect);
      }
    }, 50);
  }
  
  // Animar cards de jogo ao aparecer na tela
  const gameCards = document.querySelectorAll('.game-card');
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, { threshold: 0.1 });
  
  gameCards.forEach((card, index) => {
    card.style.opacity = '0';
    card.style.transform = 'translateY(20px)';
    card.style.transition = `opacity 0.5s ease ${index * 0.1}s, transform 0.5s ease ${index * 0.1}s`;
    observer.observe(card);
  });
  
  // Tooltips para ícones
  const initTooltips = () => {
    const tooltipElements = document.querySelectorAll('[data-tooltip]');
    
    tooltipElements.forEach(el => {
      const tooltip = document.createElement('div');
      tooltip.className = 'tooltip';
      tooltip.textContent = el.getAttribute('data-tooltip');
      document.body.appendChild(tooltip);
      
      el.addEventListener('mouseenter', (e) => {
        const rect = el.getBoundingClientRect();
        tooltip.style.left = `${rect.left + rect.width / 2}px`;
        tooltip.style.top = `${rect.top - 40}px`;
        tooltip.style.opacity = '1';
      });
      
      el.addEventListener('mouseleave', () => {
        tooltip.style.opacity = '0';
      });
    });
  };
  
  initTooltips();
  
  // Modal de doação
  const donationModal = () => {
    const qrCodeBase64 = document.getElementById('qr-code-data')?.dataset.qrcode;
    
    if (!qrCodeBase64) {
      console.error('QR Code não encontrado');
      return;
    }

    const modal = document.createElement('div');
    modal.id = 'donation-modal';
    modal.style.position = 'fixed';
    modal.style.top = '0';
    modal.style.left = '0';
    modal.style.width = '100%';
    modal.style.height = '100%';
    modal.style.backgroundColor = 'rgba(0, 0, 0, 0.9)';
    modal.style.display = 'flex';
    modal.style.alignItems = 'center';
    modal.style.justifyContent = 'center';
    modal.style.zIndex = '1000';
    modal.style.opacity = '0';
    modal.style.pointerEvents = 'none';
    modal.style.transition = 'opacity 0.3s ease';
    modal.style.backdropFilter = 'blur(10px)';
    
    modal.innerHTML = `
      <div style="margin:30px; background: var(--bg-darker); padding: 2rem; border-radius: 12px; max-width: 400px; text-align: center; border: 1px solid var(--accent-primary); transform: scale(0.9); transition: transform 0.3s ease;">
        <button id="close-modal" style="position: absolute; top: 1rem; right: 1rem; background: none; border: none; color: var(--text-secondary); font-size: 1.5rem; cursor: pointer;">×</button>
        <h2 style="color: var(--accent-primary); margin-bottom: 1rem; font-size: 1.5rem;">Apoie o SportStream</h2>
        <p style="margin-bottom: 1.5rem;">Faça uma doação para ajudar a manter o site no ar e continuar assistindo todos os jogos sem interrupções.</p>
        <img src="data:image/png;base64,${qrCodeBase64}" alt="QR Code para doação" style="width: 200px; margin: 0 auto 1.5rem; border-radius: 8px; border: 1px solid rgba(0, 255, 136, 0.3);">
        <p style="margin-bottom: 1.5rem; font-size: 0.9rem; color: var(--text-secondary);">Escaneie o QR Code para doar via PIX</p>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Mostrar modal após 30 segundos
    setTimeout(() => {
      modal.style.opacity = '1';
      modal.style.pointerEvents = 'auto';
      modal.querySelector('div').style.transform = 'scale(1)';
    }, 30000);
    
    // Fechar modal
    document.getElementById('close-modal').addEventListener('click', () => {
      modal.style.opacity = '0';
      modal.style.pointerEvents = 'none';
      modal.querySelector('div').style.transform = 'scale(0.9)';
    });
  };
  
  if (document.getElementById('qr-code-data')) {
    donationModal();
  }
  
  // Efeito de hover nos botões de controle do player
  const controlBtns = document.querySelectorAll('.control-btn');
  controlBtns.forEach(btn => {
    btn.addEventListener('mouseenter', () => {
      btn.style.transform = 'scale(1.1)';
    });
    
    btn.addEventListener('mouseleave', () => {
      btn.style.transform = 'scale(1)';
    });
  });
  
  // Simular notificações
  const notificationBell = document.querySelector('.notification-bell');
  if (notificationBell) {
    notificationBell.addEventListener('click', () => {
      const notificationCount = document.querySelector('.notification-badge');
      notificationCount.textContent = '0';
      notificationCount.style.backgroundColor = 'transparent';
      
      // Mostrar dropdown de notificações
      const dropdown = document.createElement('div');
      dropdown.className = 'notification-dropdown';
      dropdown.innerHTML = `
        <div class="notification-item">
          <i class="fas fa-bell"></i>
          <div>
            <div class="notification-title">Novos jogos disponíveis</div>
            <div class="notification-time">2 minutos atrás</div>
          </div>
        </div>
        <div class="notification-item">
          <i class="fas fa-heart"></i>
          <div>
            <div class="notification-title">Seu time favorito joga hoje</div>
            <div class="notification-time">1 hora atrás</div>
          </div>
        </div>
        <div class="notification-item">
          <i class="fas fa-exclamation-triangle"></i>
          <div>
            <div class="notification-title">Seu tempo de acesso está acabando</div>
            <div class="notification-time">Ontem</div>
          </div>
        </div>
      `;
      
      document.body.appendChild(dropdown);
      
      // Posicionar dropdown
      const rect = notificationBell.getBoundingClientRect();
      dropdown.style.top = `${rect.bottom + 5}px`;
      dropdown.style.right = `${window.innerWidth - rect.right}px`;
      
      // Fechar dropdown ao clicar fora
      document.addEventListener('click', (e) => {
        if (!notificationBell.contains(e.target) && !dropdown.contains(e.target)) {
          dropdown.remove();
        }
      }, { once: true });
    });
  }

  // =============================================
  // FUNÇÃO DE TROCA DE CANAIS (NOVO)
  // =============================================
  const initChannelSwitcher = () => {
    const iframe = document.querySelector('.stream-container iframe');
    const channelButtons = document.querySelectorAll('.channel-btn');
    
    if (!iframe || channelButtons.length === 0) return;
    
    channelButtons.forEach(btn => {
      btn.addEventListener('click', function() {
        // Evitar múltiplos cliques
        if (this.classList.contains('loading')) return;
        
        // Estado de loading
        const originalContent = this.innerHTML;
        this.classList.add('loading');
        this.innerHTML = `<i class="fas fa-spinner fa-spin"></i> ${this.textContent.trim()}`;
        
        // Atualiza o iframe
        const newSrc = this.dataset.channel;
        iframe.src = newSrc;
        
        // Atualiza estado dos botões
        channelButtons.forEach(b => {
          b.classList.remove('active', 'loading');
          const icon = b.querySelector('i');
          if (icon) {
            icon.className = b === this ? 'fas fa-satellite-dish' : 'fas fa-satellite';
          }
        });
        this.classList.add('active');
        
        // Restaurar conteúdo original após 2 segundos
        setTimeout(() => {
          this.innerHTML = originalContent;
        }, 2000);
        
        // Tratamento de erro
        iframe.onerror = () => {
          this.innerHTML = `<i class="fas fa-exclamation-triangle"></i> Erro ao carregar`;
          setTimeout(() => {
            this.innerHTML = originalContent;
          }, 2000);
        };
      });
    });
  };
  
  // Inicializar seletor de canais
  initChannelSwitcher();
});