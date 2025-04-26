const mercadopago = require('mercadopago');
const db = new sqlite3.Database('./futplay.db');
const {verificarEAdicionarTempo} = require('../services/databaseService');

// Função para verificar o status do pagamento no Mercado Pago
async function verificarStatusPagamento(paymentId) {
  try {
    const pagamento = await mercadopago.payment.get(paymentId);
    const status = pagamento.response.status;
    console.log('Status do pagamento no Mercado Pago:', status);

    return status; // Retorna o status do pagamento
  } catch (error) {
    console.error('Erro ao consultar o pagamento:', error);
    throw new Error('Erro ao verificar status do pagamento');
  }
}

// Função para atualizar o status do pagamento no banco de dados
async function atualizarStatusPagamentoBanco(idpayment, paymentStatus) {
  const query = 'UPDATE sessions SET payment_status = ? WHERE idpayment = ?';
  try {
    await db.runQuery(query, [paymentStatus, idpayment]);
    console.log(`Status do pagamento ${idpayment} atualizado para ${paymentStatus}`);
    if(paymentStatus === 'approved'){

    }
  } catch (error) {
    console.error('Erro ao atualizar status do pagamento no banco:', error);
    throw new Error('Erro ao atualizar status do pagamento no banco');
  }
}

// Função para verificar e atualizar o status do pagamento
async function atualizarStatusPagamento(idpayment) {
  // Consulta o status atual do pagamento no banco de dados
  const query = 'SELECT payment_status FROM sessions WHERE idpayment = ?';
  const row = await db.getQuery(query, [idpayment]);

  if (!row) {
    console.log('Pagamento não encontrado no banco de dados');
    return;
  }

  const paymentStatus = row.payment_status;

  // Se o status no banco de dados for "pending", verificamos no Mercado Pago
  if (paymentStatus === 'pending') {
    const mercadoPagoStatus = await verificarStatusPagamento(idpayment);

    // Se o status no Mercado Pago for "approved", atualizamos o banco de dados
    if (mercadoPagoStatus === 'approved') {
      await atualizarStatusPagamentoBanco(idpayment, 'approved');
      // Se o pagamento foi aprovado, podemos adicionar tempo à sessão
      await verificarEAdicionarTempo(idpayment);
    }else if (mercadoPagoStatus === 'cancelled') {
        try {
          // Deletar do banco de dados
          const query = 'DELETE FROM sessions WHERE idpayment = ?';
          
          // Aqui, substitua "idpayment" pelo ID do pagamento que você deseja excluir
          await db.runQuery(query, [idpayment]);
          console.log(`Sessão com ID de pagamento ${idpayment} foi cancelada e deletada do banco.`);
        } catch (error) {
          console.error('Erro ao deletar a sessão do banco:', error);
        }
      }
  } else {
    console.log('Pagamento não está pendente no banco de dados');
  }

  return paymentStatus;
}

module.exports = {
  verificarStatusPagamento,
  atualizarStatusPagamento
};
