document.addEventListener('DOMContentLoaded', () => {
  let iframe = document.getElementById('stream-iframe'); // variável atualizada depois da troca
  const buttons = document.querySelectorAll('.channel-btn:not(.dropdown-toggle)');
  const dropdownItems = document.querySelectorAll('.dropdown-item');
  const dropdownToggles = document.querySelectorAll('.dropdown-toggle');

  // Função para criar um novo iframe com sandbox conforme index
  function criarIframe(url, index) {
    const container = iframe.parentElement;
    if (!container) return null;

    // Remove iframe antigo
    container.removeChild(iframe);

    // Cria novo iframe
    const novoIframe = document.createElement('iframe');
    novoIframe.id = 'stream-iframe';
    novoIframe.src = url;
    novoIframe.allowFullscreen = true;
    novoIframe.frameBorder = 0;
    novoIframe.referrerPolicy = 'strict-origin-when-cross-origin';
    novoIframe.allow = 'encrypted-media;autoplay';

    if (index <= 3) {
      novoIframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    }

    container.appendChild(novoIframe);
    return novoIframe;
  }

  // Função para checar se algum stream tem index entre 4 e 6 (publicidade)
  function hasAdImage(streams) {
    return streams.some(stream => stream.index >= 4 && stream.index <= 6);
  }

  // Inicializa imagem nos dropdown toggles
  dropdownToggles.forEach(toggle => {
    const dropdown = toggle.parentElement;
    if (!dropdown) return;

    const menu = dropdown.querySelector('.dropdown-menu');
    if (!menu) return;

    // Pegamos todos os botões do dropdown para verificar indexes
    const streamsIndexes = Array.from(menu.querySelectorAll('button.dropdown-item')).map(btn => ({
      url: btn.getAttribute('data-channel'),
      index: parseInt(btn.getAttribute('data-index-original'), 10)
    }));

    if (hasAdImage(streamsIndexes)) {
      // Cria a imagem do anúncio
      const img = document.createElement('img');
      img.src = '/assets/ads40.png';
      img.alt = 'Publicidade';
      img.style.width = '24px';
      img.style.height = '24px';
      img.style.marginLeft = '5px';
      img.style.verticalAlign = 'middle';

      // Evita duplicar a imagem se já tiver
      if (!toggle.querySelector('img.ad-image')) {
        toggle.appendChild(img);
      }
    }
  });

  // Clique nos botões principais
  buttons.forEach(button => {
    button.addEventListener('click', () => {
      const newUrl = button.getAttribute('data-channel');
      const index = parseInt(button.getAttribute('data-index-original'), 10);

      if (iframe && newUrl) {
        iframe = criarIframe(newUrl, index);
      }

      buttons.forEach(btn => btn.classList.remove('active'));
      dropdownItems.forEach(it => it.classList.remove('active'));
      button.classList.add('active');

      // Fecha todos dropdowns ao clicar botão normal
      document.querySelectorAll('.dropdown-menu').forEach(menu => {
        menu.style.display = 'none';
      });
    });
  });

  // Clique nos itens do dropdown
  dropdownItems.forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation(); // Impede fechar imediatamente o dropdown

      const newUrl = item.getAttribute('data-channel');
      const index = parseInt(item.getAttribute('data-index-original'), 10);
      const varName = item.textContent.trim();

      if (iframe && newUrl) {
        iframe = criarIframe(newUrl, index);
      }

      buttons.forEach(btn => btn.classList.remove('active'));
      dropdownItems.forEach(it => it.classList.remove('active'));
      item.classList.add('active');

      // Fecha o menu após selecionar
      const dropdownMenu = item.closest('.dropdown-menu');
      if (dropdownMenu) dropdownMenu.style.display = 'none';

      // Atualizar texto do botão dropdown para o nome da variação escolhida
      const dropdownToggle = dropdownMenu.previousElementSibling; // botão dropdown-toggle

      if (dropdownToggle) {
        // Remove a imagem antiga se existir
        const oldImg = dropdownToggle.querySelector('img.ad-image');
        if (oldImg) oldImg.remove();

        // Atualiza texto
        dropdownToggle.innerHTML = `<i class="fas fa-satellite-dish"></i> ${varName} <i class="fas fa-caret-down"></i>`;

        // Se o stream selecionado tem índice entre 4 e 6, adiciona imagem
        if (index >= 4 && index <= 6) {
          const img = document.createElement('img');
          img.src = '/assets/ads40.png';
          img.alt = 'Publicidade';
          img.classList.add('ad-image');
          img.style.width = '20px';
          img.style.height = '20px';
          img.style.marginLeft = '10px';
          img.style.verticalAlign = 'middle';
          dropdownToggle.appendChild(img);
        }
      }
    });
  });

  // Toggle do dropdown ao clicar no botão dropdown-toggle
  dropdownToggles.forEach(toggle => {
    toggle.addEventListener('click', (e) => {
      e.stopPropagation();

      const dropdown = toggle.parentElement;
      if (!dropdown) return;

      const menu = dropdown.querySelector('.dropdown-menu');
      if (!menu) return;

      // Fecha todos os outros menus
      document.querySelectorAll('.dropdown-menu').forEach(m => {
        if (m !== menu) m.style.display = 'none';
      });

      // Alterna visibilidade do menu atual
      menu.style.display = (menu.style.display === 'block') ? 'none' : 'block';
    });
  });

  // Fecha qualquer dropdown aberto ao clicar fora
  document.addEventListener('click', () => {
    document.querySelectorAll('.dropdown-menu').forEach(menu => {
      menu.style.display = 'none';
    });
  });

  // Ao carregar a página, atualizar sandbox e texto do dropdown conforme canal ativo inicial
  const activeButton = document.querySelector('.channel-btn.active');
  const activeDropdownItem = document.querySelector('.dropdown-item.active');
  if (activeButton) {
    const idx = parseInt(activeButton.getAttribute('data-index-original'), 10);
    // Só precisa recriar o iframe se quiser garantir sandbox no início,
    // mas já está criado no HTML, então só garantir sandbox:
    if (iframe) {
      if (idx <= 3) {
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      } else {
        iframe.removeAttribute('sandbox');
      }
    }
  } else if (activeDropdownItem) {
    const idx = parseInt(activeDropdownItem.getAttribute('data-index-original'), 10);
    if (iframe) {
      if (idx <= 3) {
        iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
      } else {
        iframe.removeAttribute('sandbox');
      }
    }

    // Atualiza o texto e imagem do botão dropdown para o item ativo
    const dropdownToggle = activeDropdownItem.closest('.dropdown-menu')?.previousElementSibling;
    if (dropdownToggle) {
      dropdownToggle.innerHTML = `<i class="fas fa-satellite-dish"></i> ${activeDropdownItem.textContent.trim()} <i class="fas fa-caret-down"></i>`;

      if (idx >= 4 && idx <= 6) {
        const img = document.createElement('img');
        img.src = '/assets/ads40.png';
        img.alt = 'Publicidade';
        img.classList.add('ad-image');
        img.style.width = '20px';
        img.style.height = '20px';
        img.style.marginLeft = '10px';
        img.style.verticalAlign = 'middle';
        dropdownToggle.appendChild(img);
      }
    }
  }
});
