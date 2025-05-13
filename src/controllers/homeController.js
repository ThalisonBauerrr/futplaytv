require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const usuarioModel = require('../models/usuarioModel');
const { criarPagamentoQR,verificarStatusPagamento } = require('../services/mercadoPagoService');
const jogoModel = require('../models/jogoModel');

exports.resHome = async (req, res) => {
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
    res.render('home/home', {
      pageTitle: 'Futplat.tv - HOME',
      user: req.user || null, // Adiciona isso
      jogos: jogosHoje,
      tempoRestante: tempoRestante.texto,
      tempoExpirado: tempoRestante.expirado,
      tempoFim: usuario.tempo_fim,
      qrCodeBase64: qrCodeBase64
    });

  } catch (error) {
    console.error('Erro no controller resHome:', {
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
    const usuario = await usuarioModel.getDadosCompletos(uuidUsuario);
    const statusPagamento = await verificarStatusPagamento(usuario.idpayment);
    const tempoFim = new Date(usuario.tempo_fim);
    const hoje = new Date();

    if (usuario.tempo_fim) {
      // Normaliza as duas datas, zerando horas, minutos e segundos
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
    switch (statusPagamento) {
      case 'approved':
        console.log('Pagamento aprovado');
        
        // 1. Verificar se usuario.purchase é 0 e usuario.payment_status é 'approved'
        if (usuario.purchase === '0' && usuario.payment_status === 'approved') {
          
          // 2. Atualizar status de pagamento para 'approved' na tabela usuario
          const updatePaymentStatus = await usuarioModel.atualizarStatusPagamento(uuidUsuario, 'approved');
          if (updatePaymentStatus) {
            console.log('Status de pagamento atualizado para "approved".');
          } else {
            console.log('Erro ao atualizar o status de pagamento.');
          }
    
          // 3. Adicionar 2 horas no tempo_fim da tabela usuario
          const adicionarTempo = await usuarioModel.atualizarTempoAcesso(uuidUsuario, 120); // 120 minutos = 2 horas
          if (adicionarTempo) {
            console.log('Tempo de acesso atualizado com 2 horas.');
          } else {
            console.log('Erro ao adicionar 2 horas ao tempo de acesso.');
          }
    
          // 4. Atualizar usuario.purchase para 1, indicando que o pagamento foi entregue
          const updatePurchase = await usuarioModel.atualizarPurchase(uuidUsuario, 1);
          if (updatePurchase) {
            console.log('Pagamento foi marcado como entregue (purchase = 1).');
          } else {
            console.log('Erro ao atualizar a entrega do pagamento.');
          }
        }else if (usuario.tempo_fim < hoje && usuario.purchase === '1') {
            console.log('O tempo_fim é menor que o horário atual. Resetando o QR Code, status de pagamento e purchase.');

              const sucesso = await usuarioModel.resetarCamposUsuario(uuidUsuario);

          if (sucesso) {
              console.log(`[${uuidUsuario}] Campos resetados com sucesso: QR Code, status de pagamento e purchase.`);
              const { qrCodeBase64, paymentId } = await criarPagamentoQR(uuidUsuario, 1.50);
      
              // Atualiza o QR Code e tempo
              await usuarioModel.atualizarQRCodeETempo(
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
          break;
        case 'in_process':
          console.log('Pagamento em processo');
          break;
        case 'rejected':
          console.log('Pagamento rejeitado');
          break;
        case 'cancelled':
          console.log('Pagamento cancelado');
              const { qrCodeBase64, paymentId } = await criarPagamentoQR(uuidUsuario, 1.50);
      
              // Atualiza o QR Code e tempo
              await usuarioModel.atualizarQRCodeETempo(
                uuidUsuario,
                paymentId,
                qrCodeBase64,
                process.env.MINUTES_FREE || 10
              );
  
          break;
        case 'refunded':
          console.log('Pagamento reembolsado');
          break;
        case 'charged_back':
          console.log('Pagamento com chargeback');
          break;
        default:
          console.log('Status desconhecido');
      }

    // Se nenhuma condição acima for atendida, retorna o QR Code atual
    console.log('Nenhuma atualização necessária. Retornando QR Code atual...');
    return usuario.payment_qr_code;

  } catch (error) {
    console.error('Erro no gerenciamento do QR Code:', error);
    return null;
  }
}
