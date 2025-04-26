import { StreamTimer } from './timer.js';

class StreamHandler {
    constructor() {
        this.init();
    }

    init() {
        this.elements = {
            iframe: document.getElementById('streamIframe'),
            qrcode: document.getElementById('qrcode-modal')
        };

        new StreamTimer({
            container: '.stream-container',
            timer: '#tempo-restante',
            qrcode: '#qrcode-modal'
        });

        this.addEventListeners();
    }

    addEventListeners() {
        window.addEventListener('load', () => {
            document.body.classList.remove('loading');
        });
    }
}

new StreamHandler();