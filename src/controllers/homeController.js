require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const usuarioModel = require('../models/usuarioModel');
const { criarPagamentoQR } = require('../services/mercadoPagoService');
const jogoModel = require('../models/jogoModel'); // Importa o jogoModel

exports.resHome = async (req, res) => {
  try {
    // Parte da função original resHome (jogos de hoje)
    const jogosHoje = await jogoModel.buscarJogosDeHoje();
    
    // Parte da função showStream (usuário e tempo de acesso)
    const uuidUsuario = req.cookies.uuid || uuidv4();
    const ipUsuario = req.ip;

    res.cookie('uuid', uuidUsuario, { maxAge: 900000, httpOnly: true });

    let usuario = await usuarioModel.verificarOuAtualizarUsuario(ipUsuario, uuidUsuario);
    usuario = await usuarioModel.verificarUsuario(uuidUsuario);

    // Calcula tempo restante
    const tempoInicio = new Date(usuario.tempo_inicio);
    const tempoFim = new Date(usuario.tempo_fim);
    const tempoAgora = new Date();
    const tempoRestanteMs = tempoFim - tempoAgora;

    const minutosRestantes = Math.floor(tempoRestanteMs / 60000);
    const segundosRestantes = Math.floor((tempoRestanteMs % 60000) / 1000);

    let tempoRestanteFormatado = "Tempo expirado";
    if (tempoRestanteMs > 0) {
      tempoRestanteFormatado = `${minutosRestantes}m ${segundosRestantes}s`;
    }

    // Lógica do QR Code
    let qrCodeBase64 = null;
    if (usuario.inserted) {
      const valorPagamento = process.env.VALOR_DONATE || 10.00;
      const { qrCodeBase64: novoQrCode, paymentId, status } = await criarPagamentoQR(uuidUsuario, valorPagamento);
      await usuarioModel.saveQRCode(uuidUsuario, paymentId, novoQrCode);
      qrCodeBase64 = novoQrCode;
    } else {
      const qrCodeResult = await usuarioModel.getQRCodeByUser(uuidUsuario);
      qrCodeBase64 = qrCodeResult ? qrCodeResult.payment_qr_code : null;
    }

    // Renderiza a página com todos os dados combinados
    res.render('home/home', {
      pageTitle: `Futplat.tv - HOME`,
      jogos: jogosHoje,
      tempoRestante: tempoRestanteFormatado,
      tempoFim: usuario.tempo_fim,
      qrCodeBase64: qrCodeBase64
    });

  } catch (error) {
    console.error('Erro ao carregar página inicial:', error);
    res.status(500).render('error/500', {
      pageTitle: 'Erro na Página Inicial',
      errorMessage: error.message,
    });
  }
};