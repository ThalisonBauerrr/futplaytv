document.addEventListener("DOMContentLoaded", function () {
    const tempoFimElement = document.getElementById('tempo-restante');
    const qrcodeContainer = document.getElementById('qrcode-container');
    const tempoTitulo = document.getElementById('tempo-titulo');
    const iframe = document.querySelector('iframe');

    if (!tempoFimElement || !qrcodeContainer || !tempoTitulo || !iframe) {
        console.error("Elemento não encontrado.");
        return;
    }

    const tempoFim = new Date(tempoFimElement.dataset.tempoFim);

    function formatarTempo(ms) {
        const minutos = Math.floor(ms / 60000);
        const segundos = Math.floor((ms % 60000) / 1000);
        return `${minutos}m ${segundos}s`;
    }

    function atualizarTempoRestante() {
        const tempoAgora = new Date();
        const tempoRestanteMs = tempoFim - tempoAgora;

        if (tempoRestanteMs > 0) {
            tempoFimElement.innerText = `Restante: ${formatarTempo(tempoRestanteMs)}`;
        } else {
            tempoFimElement.innerText = "";
            tempoTitulo.style.display = "none"; 
            exibirQRCode();
            adicionarImagemFundoIframe();
        }
    }

    function exibirQRCode() {
        qrcodeContainer.style.display = 'flex';
        qrcodeContainer.classList.add('fade-in');
    }

    function adicionarImagemFundoIframe() {
        iframe.setAttribute('src', '');  
        iframe.style.transition = 'background-image 1s ease-in-out'; 
        iframe.style.backgroundImage = 'url("/img/fundoiframe.jpg")'; 
        iframe.style.backgroundSize = 'cover';
        iframe.style.backgroundPosition = 'center';
    }

    atualizarTempoRestante();

    if (tempoFim - new Date() > 0) {
        setInterval(atualizarTempoRestante, 1000);
    }
});
