const usuarioModel = require('../models/usuarioModel');
const { criarPagamentoQR } = require('../services/mercadoPagoService');
const jogoModel = require('../models/jogoModel'); // Importa o jogoModel

const { v4: uuidv4 } = require('uuid');
require('dotenv').config();


// Função para renderizar a página do jogo específico
exports.resPlayer = async (req, res) => {
  const jogoId = req.params.id; // Captura o ID do jogo da URL
  const uuidUsuario = req.cookies.uuid || uuidv4(); // Gera ou usa UUID do usuário
  const ipUsuario = req.ip; // Pega o IP do usuário

  try {
    // 1. Configuração do usuário e cookies
    res.cookie('uuid', uuidUsuario, { maxAge: 900000, httpOnly: true });

    // 2. Verificação/atualização do usuário
    let usuario = await usuarioModel.verificarOuAtualizarUsuario(ipUsuario, uuidUsuario);
    usuario = await usuarioModel.verificarUsuario(uuidUsuario);

    // 3. Busca o jogo no banco de dados
    const jogo = await jogoModel.buscarJogoPorId(jogoId);
    
    if (!jogo) {
      return res.status(404).render('error/404', {
        pageTitle: 'Jogo não encontrado'
      });
    }

    // 4. Cálculo do tempo restante
    const tempoFim = new Date(usuario.tempo_fim);
    const tempoAgora = new Date();
    const tempoRestanteMs = tempoFim - tempoAgora;

    const minutosRestantes = Math.floor(tempoRestanteMs / 60000);
    const segundosRestantes = Math.floor((tempoRestanteMs % 60000) / 1000);

    let tempoRestanteFormatado = "Tempo expirado";
    if (tempoRestanteMs > 0) {
      tempoRestanteFormatado = `${minutosRestantes}m ${segundosRestantes}s`;
    }

    // 5. Lógica do QR Code
    let qrCodeBase64 = null;
    if (usuario.inserted) {
      const valorPagamento = process.env.VALOR_DONATE || 10.00;
      const { qrCodeBase64: novoQrCode, paymentId } = await criarPagamentoQR(uuidUsuario, valorPagamento);
      await usuarioModel.saveQRCode(uuidUsuario, paymentId, novoQrCode);
      qrCodeBase64 = novoQrCode;
    } else {
      const qrCodeResult = await usuarioModel.getQRCodeByUser(uuidUsuario);
      qrCodeBase64 = qrCodeResult?.payment_qr_code || null;
    }
  
    const resultado = await jogoModel.verificarCanais(jogo.transmissoes);
    console.log(resultado)
    const jogosaovivo = await jogoModel.buscarJogosAoVivo();
    
    // 6. Renderização com todos os dados
    res.render('home/player', {
      pageTitle: `Futplat.tv - ${jogo.timeCasa} vs ${jogo.timeVisitante}`,
      jogo: jogo,
      jogos: jogosaovivo,  // Passando os jogos para o template EJS
      urls:resultado,
      tempoRestante: tempoRestanteFormatado,
      tempoFim: usuario.tempo_fim,
      qrCodeBase64: qrCodeBase64
    });

  } catch (error) {
    console.error('Erro no player:', error);
    res.status(500).render('error/500', {
      pageTitle: 'Erro na Transmissão',
      errorMessage: error.message
    });
  }
};