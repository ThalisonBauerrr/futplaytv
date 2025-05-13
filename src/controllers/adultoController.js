require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const usuarioModel = require('../models/usuarioModel');
const { criarPagamentoQR } = require('../services/mercadoPagoService');
const jogoModel = require('../models/jogoModel');

exports.resAdulto = async (req, res) => {
  try {
    // 1. Buscar jogos do dia
    const jogosHoje = await jogoModel.buscarJogosDeHoje();
    
    // 2. Configurar/identificar usuário
    const uuidUsuario = req.cookies.uuid || uuidv4();
    const ipUsuario = req.ip;
    
    // Configurar cookie com UUID
    res.cookie('uuid', uuidUsuario, { 
      maxAge: 900000, 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    // 3. Verificar e atualizar dados do usuário
    const { inserted, updated } = await usuarioModel.verificarOuAtualizarUsuario(ipUsuario, uuidUsuario);
    const usuario = await usuarioModel.verificarUsuario(uuidUsuario);

    // 4. Calcular tempo restante de acesso
    const tempoRestante = calcularTempoRestante(usuario.tempo_fim);

    // 5. Gerenciar QR Code de pagamento
    const qrCodeBase64 = await gerenciarQRCode(uuidUsuario, usuario, inserted);

    // 6. Renderizar página com os dados
    res.render('home/conteudoAdulto', {
      pageTitle: 'Futplat.tv - Conteúdo 18+',
      user: req.user || null, // Adiciona isso
      jogos: jogosHoje,
      tempoRestante: tempoRestante.texto,
      tempoExpirado: tempoRestante.expirado,
      tempoFim: usuario.tempo_fim,
      qrCodeBase64: qrCodeBase64
    });

  } catch (error) {
    console.error('Erro no controller resAdulto:', {
      message: error.message,
      stack: error.stack
    });
    
    res.status(500).render('error/500', {
      pageTitle: 'Erro na Página Inicial',
      errorMessage: 'Desculpe, ocorreu um erro ao carregar a página. Por favor, recarregue ou tente novamente mais tarde.'
    });
  }
};

function precisaGerarQRCode(usuario) {
  if (!usuario) return true;
  
  const agora = new Date();
  const tempoExpirado = new Date(usuario.tempo_fim) < agora;
  
  return !usuario.idpayment || tempoExpirado;
}

function calcularTempoRestante(dataFim) {
  const agora = new Date();
  const fim = new Date(dataFim);
  const diffMs = fim - agora;
  
  if (diffMs <= 0) {
    return { texto: "Tempo expirado", expirado: true };
  }
  
  const minutos = Math.floor(diffMs / 60000);
  const segundos = Math.floor((diffMs % 60000) / 1000);
  
  return {
    texto: `${minutos}m ${segundos}s`,
    expirado: false
  };
}

async function gerenciarQRCode(uuidUsuario) {
  try {
    // 1. Busca dados do usuário
    const usuario = await usuarioModel.getDadosParaQRCode(uuidUsuario);
    
    // 2. Verifica se precisa gerar novo QR Code
    if (!precisaGerarQRCode(usuario)) {
      return usuario.payment_qr_code;
    }

    // 3. Gera novo QR Code se necessário
    console.log('🆕 Gerando novo QR Code...');
    const { qrCodeBase64, paymentId } = await criarPagamentoQR(uuidUsuario, 1.50);
    
    await usuarioModel.atualizarQRCodeETempo(
      uuidUsuario,
      paymentId,
      qrCodeBase64,
      0
    );
    
    return qrCodeBase64;

  } catch (error) {
    console.error('Erro no gerenciamento do QR Code:', error);
    return null;
  }
}