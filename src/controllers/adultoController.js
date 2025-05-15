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
    let statusPagamento = "num"; // Inicializa com um status padrão
    const usuario = await usuarioModel.getDadosCompletos(uuidUsuario);

    // Se o usuário tem um ID de pagamento, verifica o status do pagamento
    if (usuario.idpayment != null) {
      statusPagamento = await verificarStatusPagamento(usuario.idpayment);
    }

    // Comparar as datas
    const tempoFim = new Date(usuario.tempo_fim);
    const hoje = new Date();

    // 2. Se o tempo de fim for menor que hoje, adiciona mais tempo
    if (usuario.tempo_fim) {
      // Normaliza as duas datas (zerando hora, minuto e segundo)
      const tempoFimDate = new Date(tempoFim.getFullYear(), tempoFim.getMonth(), tempoFim.getDate());
      const hojeDate = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate());

      // Se tempo_fim for menor que hoje, adiciona tempo
      if (tempoFimDate < hojeDate) {
        console.log('O tempo_fim é menor que hoje. Adicionando tempo...');

        // Adiciona tempo (por exemplo, 10 minutos)
        await usuarioModel.atualizarTempoAcesso(uuidUsuario, process.env.MINUTES_FREE);

        // Retorna o QR Code atual
        return usuario.payment_qr_code;
      }
    }

    // Declare qrCodeBase64 e paymentId fora do switch para evitar a duplicação de declarações
    let qrCodeBase64, paymentId;

    // 3. Verifica o status do pagamento e realiza as ações conforme o status
    switch (statusPagamento) {
      case 'num':
        // Se não houver pagamento, cria um novo QR Code
        const pagamento = await criarPagamentoQR(uuidUsuario, 1.50);
        qrCodeBase64 = pagamento.qrCodeBase64;
        paymentId = pagamento.paymentId;

        await usuarioModel.atualizarDadosPagamento(
          uuidUsuario,
          paymentId,
          qrCodeBase64,
          process.env.MINUTES_FREE || 10
        );
        break;

      case 'approved':
        console.log('Pagamento aprovado');

        // Verifica se usuario.purchase é 0 e usuario.payment_status é 'approved'
        if (usuario.purchase === '0' && usuario.payment_status === 'approved') {
          // Atualiza status de pagamento para 'approved'
          const updatePaymentStatus = await usuarioModel.atualizarStatusPagamento(uuidUsuario, 'approved');
          if (updatePaymentStatus) {
            console.log('Status de pagamento atualizado para "approved".');
          } else {
            console.log('Erro ao atualizar o status de pagamento.');
          }

          // Adiciona 2 horas no tempo_fim
          const adicionarTempo = await usuarioModel.atualizarTempoAcesso(uuidUsuario, 120); // 120 minutos = 2 horas
          if (adicionarTempo) {
            console.log('Tempo de acesso atualizado com 2 horas.');
          } else {
            console.log('Erro ao adicionar 2 horas ao tempo de acesso.');
          }

          // Atualiza usuario.purchase para 1
          const updatePurchase = await usuarioModel.atualizarPurchase(uuidUsuario, 1);
          if (updatePurchase) {
            console.log('Pagamento foi marcado como entregue (purchase = 1).');
          } else {
            console.log('Erro ao atualizar a entrega do pagamento.');
          }
        } else if (usuario.tempo_fim < hoje && usuario.purchase === '1') {
          console.log('O tempo_fim é menor que o horário atual. Resetando o QR Code, status de pagamento e purchase.');

          const sucesso = await usuarioModel.resetarCamposUsuario(uuidUsuario);

          if (sucesso) {
            console.log(`[${uuidUsuario}] Campos resetados com sucesso: QR Code, status de pagamento e purchase.`);
            // Cria um novo QR Code
            const pagamentoNovo = await criarPagamentoQR(uuidUsuario, 1.50);
            qrCodeBase64 = pagamentoNovo.qrCodeBase64;
            paymentId = pagamentoNovo.paymentId;

            // Atualiza o QR Code e tempo
            await usuarioModel.atualizarDadosPagamento(
              uuidUsuario,
              paymentId,
              qrCodeBase64,
              process.env.MINUTES_FREE || 10
            );
          } else {
            console.log(`[${uuidUsuario}] Nenhum campo foi resetado. Verifique os dados.`);
          }
        } else {
          console.log('Condição não atendida: usuario.purchase não é 0 ou usuario.payment_status não é "approved".');
        }
        break;

      case 'pending':
        console.log('Pagamento pendente');
        if (usuario.tempo_fim < hoje) {
          console.log('Já passou 24 horas do teste, adicionando +10 minutos.');
          const sucesso = await usuarioModel.atualizarTempoAcesso(uuidUsuario, process.env.MINUTES_FREE);
          console.log(sucesso);
          if (sucesso) {
            console.log('Tempo adicionado para: ' + uuidUsuario);
          } else {
            console.log(`[${uuidUsuario}] Nenhum campo foi resetado. Verifique os dados.`);
          }
        } else {
          console.log('Pagamento pendente, mas já ganhou os 12 minutos diários!');
        }
        break;

      case 'cancelled':
        console.log('Pagamento cancelado');
        const pagamentoCancelado = await criarPagamentoQR(uuidUsuario, 1.50);
        qrCodeBase64 = pagamentoCancelado.qrCodeBase64;
        paymentId = pagamentoCancelado.paymentId;

        // Atualiza o QR Code e tempo
        await usuarioModel.atualizarDadosPagamento(
          uuidUsuario,
          paymentId,
          qrCodeBase64,
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
        console.log('Pagamento ' + statusPagamento);
        if (usuario.tempo_fim < hoje) {
          console.log('Já passou 24 horas do teste, adicionando +12 min.');
          const sucesso = await usuarioModel.atualizarTempoAcesso(uuidUsuario, process.env.MINUTES_FREE);
          console.log(sucesso);
          if (sucesso) {
            console.log('Tempo adicionado para: ' + uuidUsuario);
          } else {
            console.log(`[${uuidUsuario}] Nenhum campo foi resetado. Verifique os dados.`);
          }
        } else {
          console.log('Pagamento ' + statusPagamento + ', mas já ganhou os 12 minutos diários!');
        }
    }

    // Se nenhuma condição acima for atendida, retorna o QR Code atual
    console.log('Nenhuma atualização necessária. Retornando QR Code atual...');
    return usuario.payment_qr_code;

  } catch (error) {
    console.error('Erro no gerenciamento do QR Code:', error);
    return null;
  }
}
