require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const usuarioModel = require('../models/usuarioModel');
const { criarPagamentoQR, verificarStatusPagamento } = require('../services/mercadoPagoService');
const jogoModel = require('../models/jogoModel');

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
   const { paymentQrCode, paymentPixPayload } = await gerenciarQRCode(uuidUsuario, usuario, inserted);

    // 5. Calcular tempo restante
    const tempoRestante = calcularTempoRestante(usuario.tempo_fim);

    // 6. Buscar dados adicionais
      let resultado = await jogoModel.verificarCanais(jogo.transmissoes, jogoId);
      const jogosAoVivo = await jogoModel.buscarJogosAoVivo();

      if (tempoRestante.expirado === true) {
        resultado = "expirado";  // OK
      }

    // 7. Renderizar página
    res.render('home/player', {
      pageTitle: `Futplat.tv - ${jogo.time_casa} vs ${jogo.time_visitante}`,
      user: req.user || null,
      jogo: jogo,
      jogos: jogosAoVivo,
      canais: resultado, 
      tempoRestante: tempoRestante.texto,
      tempoExpirado: tempoRestante.expirado,
      tempoFim: usuario.tempo_fim,
      qrCodeBase64: paymentQrCode,
      paymentPixPayload: paymentPixPayload  // adiciona o payload do PIX aqui
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

// Função de gerenciamento do QR Code
async function gerenciarQRCode(uuidUsuario, usuario, inserted) {
  try {
    // Verifica o status de pagamento do usuário
    let statusPagamento = "num"; // Status padrão
    if (usuario.idpayment != null) {
      statusPagamento = await verificarStatusPagamento(usuario.idpayment);
    }

    const tempoFim = new Date(usuario.tempo_fim);
    const hoje = new Date();

    // Normaliza as duas datas, zerando hora, minuto e segundo
    const tempoFimDate = new Date(tempoFim.getFullYear(), tempoFim.getMonth(), tempoFim.getDate());
    const hojeDate = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());
    
    // Declare qrCodeBase64 e paymentId uma vez para evitar redeclaração
    let qrCodeBase64, paymentId, payloadPix;

    // 1. Se o tempo de fim for menor que hoje, adiciona tempo
    if (tempoFimDate < hojeDate) {
      console.log('O tempo_fim é menor que hoje. Adicionando tempo...');
      await usuarioModel.atualizarTempoAcesso(uuidUsuario, process.env.MINUTES_FREE);
      return {
          paymentQrCode: usuario.payment_qr_code,
          paymentPixPayload: usuario.payment_pix_payload
        };
    }

   

    // 2. Verificar o status de pagamento e realizar ações conforme o status
    switch (statusPagamento) {
      case 'num':
        // Se não houver pagamento, cria um novo QR Code
        ({ qrCodeBase64, paymentId, payloadPix } = await criarPagamentoQR(uuidUsuario, 1.50));

          await usuarioModel.atualizarDadosPagamento(
            uuidUsuario,
            paymentId,
            qrCodeBase64,
            payloadPix,
            process.env.MINUTES_FREE || 10
          );
        break;

      case 'approved':
        console.log('Pagamento aprovado');
        if (usuario.purchase === '0' && usuario.payment_status === 'approved') {
          // Atualiza status de pagamento para 'approved'
          const updatePaymentStatus = await usuarioModel.atualizarStatusPagamento(uuidUsuario, 'approved');
          console.log(updatePaymentStatus ? 'Status de pagamento atualizado para "approved".' : 'Erro ao atualizar o status de pagamento.');

          // Adiciona 2 horas no tempo_fim
          const adicionarTempo = await usuarioModel.atualizarTempoAcesso(uuidUsuario, 120); // 120 minutos = 2 horas
          console.log(adicionarTempo ? 'Tempo de acesso atualizado com 2 horas.' : 'Erro ao adicionar 2 horas ao tempo de acesso.');

          // Atualiza usuario.purchase para 1
          const updatePurchase = await usuarioModel.atualizarPurchase(uuidUsuario, 1);
          console.log(updatePurchase ? 'Pagamento foi marcado como entregue (purchase = 1).' : 'Erro ao atualizar a entrega do pagamento.');
        } else if (tempoFimDate < hojeDate && usuario.purchase === '1') {
          console.log('O tempo_fim é menor que o horário atual. Resetando o QR Code, status de pagamento e purchase.');

          const sucesso = await usuarioModel.resetarCamposUsuario(uuidUsuario);
          if (sucesso) {
            console.log(`[${uuidUsuario}] Campos resetados com sucesso: QR Code, status de pagamento e purchase.`);
            // Cria um novo QR Code
            ({ qrCodeBase64, paymentId, payloadPix } = await criarPagamentoQR(uuidUsuario, 1.50));

          await usuarioModel.atualizarDadosPagamento(
            uuidUsuario,
            paymentId,
            qrCodeBase64,
            payloadPix,
            process.env.MINUTES_FREE || 10
          );
          } else {
            console.log(`[${uuidUsuario}] Nenhum campo foi resetado. Verifique os dados.`);
          }
        }
        break;

      case 'pending':
        console.log('Pagamento pendente');
        if (tempoFimDate < hojeDate) {
          console.log('Já passou 24 horas do teste, adicionando + '+process.env.MINUTES_FREE+' minutos.');
          const sucesso = await usuarioModel.atualizarTempoAcesso(uuidUsuario, process.env.MINUTES_FREE);
          console.log(sucesso ? 'Tempo adicionado.' : `[${uuidUsuario}] Nenhum campo foi resetado. Verifique os dados.`);
          resultado = await usuarioModel.getDadosCompletos(uuidUsuario)
          qrCodeBase64 = resultado.payment_qr_code
          payloadPix = resultado.payment_pix_payload
          
        } else {
          console.log('Pagamento pendente, mas já ganhou os 12 minutos diários!');
          resultado = await usuarioModel.getDadosCompletos(uuidUsuario)
          qrCodeBase64 = resultado.payment_qr_code
          payloadPix = resultado.payment_pix_payload
        }
        break;

      case 'cancelled':
        console.log('Pagamento cancelado');
        ({ qrCodeBase64, paymentId, payloadPix } = await criarPagamentoQR(uuidUsuario, 1.50));
          await usuarioModel.atualizarDadosPagamento(
            uuidUsuario,
            paymentId,
            qrCodeBase64,
            payloadPix,
            process.env.MINUTES_FREE || 10
          );
        break;
      
      case 'in_process':
          console.log('Pagamento em processo');
          break;
      
      case 'rejected':
          console.log('Pagamento rejeitado');
          break;
      
      case 'refunded':
          console.log('Pagamento reembolsado');
          break;
      
      case 'charged_back':
          console.log('Pagamento com chargeback');
          break;
      
      default:
        console.log(`Status desconhecido do pagamento: ${statusPagamento}`);
    }

    return {
      paymentQrCode: qrCodeBase64,
      paymentPixPayload: payloadPix
    };

  } catch (error) {
    console.error('Erro no gerenciamento do QR Code:', error);
    return null;
  }
}

