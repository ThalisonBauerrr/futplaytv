document.addEventListener('DOMContentLoaded', function() {
    // Menu mobile toggle
    const navToggle = document.querySelector('.nav-toggle');
    const mainNav = document.querySelector('.main-nav');
    
    navToggle.addEventListener('click', function() {
        mainNav.classList.toggle('active');
    });
    
    // Simular delay de carregamento dos cards
    const matchCards = document.querySelectorAll('.match-card');
    matchCards.forEach((card, index) => {
        card.style.setProperty('--order', index);
    });
    
    // Efeito de hover no QR code
    const qrCode = document.querySelector('.qrcode-wrapper');
    if (qrCode) {
        qrCode.addEventListener('click', function() {
            alert('Obrigado por apoiar o projeto!');
        });
    }
    
    // Carregar jogos (simulação)
    function loadMatches() {
        // Aqui você faria uma chamada AJAX para carregar os jogos reais
        console.log('Carregando jogos...');
        
        // Simular delay de carregamento
        setTimeout(() => {
            document.querySelector('.matches-container').classList.add('loaded');
        }, 500);
    }
    
    loadMatches();
});