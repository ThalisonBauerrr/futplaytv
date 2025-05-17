document.addEventListener('DOMContentLoaded', function() {
    const copyButton = document.getElementById('copy-pix-btn');
    const pixKeyElement = document.getElementById('pix-key');
    const modal = document.getElementById('pix-modal');

    if (!copyButton || !pixKeyElement || !modal) return;

    copyButton.addEventListener('click', async function() {
        try {
            await navigator.clipboard.writeText(pixKeyElement.textContent);
            
            // Mostrar modal com estilos garantidos
            Object.assign(modal.style, {
                position: 'fixed',
                bottom: '30px',
                left: '50%',
                transform: 'translateX(-50%)',
                backgroundColor: '#00e676',
                color: '#000',
                padding: '12px 24px',
                borderRadius: '30px',
                fontWeight: 'bold',
                zIndex: '2147483647', // Máximo valor possível
                boxShadow: '0 4px 15px rgba(0, 0, 0, 0.2)',
                display: 'block',
                opacity: '1',
                transition: 'opacity 0.3s ease'
            });
            
            // Esconder após 2 segundos
            setTimeout(() => {
                modal.style.opacity = '0';
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }, 2000);
            
        } catch (error) {
            // Fallback para navegadores antigos
            const textarea = document.createElement('textarea');
            textarea.value = pixKeyElement.textContent;
            document.body.appendChild(textarea);
            textarea.select();
            document.execCommand('copy');
            document.body.removeChild(textarea);
            
            // Mostrar feedback mesmo com fallback
            Object.assign(modal.style, {
                /* mesmos estilos acima */
            });
            setTimeout(() => {
                modal.style.opacity = '0';
                setTimeout(() => {
                    modal.style.display = 'none';
                }, 300);
            }, 2000);
        }
    });
});