const usuarioModel = require('../models/usuarioModel');
const { criarPagamentoQR } = require('../services/mercadoPagoService');
const jogoModel = require('../models/jogoModel');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();

exports.resPlayer = async (req, res) => {
  try {
    const jogoId = req.params.id;
    
    // 1. Configurar/identificar usuário
    const uuidUsuario = req.cookies.uuid || uuidv4();
    const ipUsuario = req.ip;
    
    res.cookie('uuid', uuidUsuario, { 
      maxAge: 900000, 
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict'
    });

    // 2. Verificar e atualizar dados do usuário
    const { inserted, updated } = await usuarioModel.verificarOuAtualizarUsuario(ipUsuario, uuidUsuario);
    const usuario = await usuarioModel.verificarUsuario(uuidUsuario);

    // 3. Buscar jogo específico
    const jogo = await jogoModel.buscarJogoPorId(jogoId);
    if (!jogo) {
      return res.status(404).render('error/404', {
        pageTitle: 'Jogo não encontrado'
      });
    }

    // 4. Gerenciar QR Code (MESMA função da Home)
    const qrCodeBase64 = await gerenciarQRCode(uuidUsuario, usuario, inserted);

    // 5. Calcular tempo restante
    const tempoRestante = calcularTempoRestante(usuario.tempo_fim);

    // 6. Buscar dados adicionais
    const resultado = await jogoModel.verificarCanais(jogo.transmissoes);
    const jogosAoVivo = await jogoModel.buscarJogosAoVivo();

    console.log(resultado)
    // 7. Renderizar página
    res.render('home/player', {
      pageTitle: `Futplat.tv - ${jogo.timeCasa} vs ${jogo.timeVisitante}`,
      jogo: jogo,
      jogos: jogosAoVivo,
      canais: resultado, // <- aqui muda de "urls" para "canais"
      tempoRestante: tempoRestante.texto,
      tempoExpirado: tempoRestante.expirado,
      tempoFim: usuario.tempo_fim,
      qrCodeBase64: qrCodeBase64 // Garantindo que está sendo passado
    });

  } catch (error) {
    console.error('Erro no controller resPlayer:', error);
    res.status(500).render('error/500', {
      pageTitle: 'Erro na Transmissão',
      errorMessage: 'Desculpe, ocorreu um erro ao carregar a transmissão.'
    });
  }
};


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
function precisaGerarQRCode(usuario) {
  if (!usuario) return true;
  
  const agora = new Date();
  const tempoExpirado = new Date(usuario.tempo_fim) < agora;
  
  return !usuario.idpayment || tempoExpirado;
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
      process.env.MINUTES_FREE || 10
    );
    
    return qrCodeBase64;

  } catch (error) {
    console.error('Erro no gerenciamento do QR Code:', error);
    return null;
  }
}