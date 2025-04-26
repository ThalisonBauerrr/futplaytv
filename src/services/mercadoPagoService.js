require('dotenv').config();
const mercadopago = require('mercadopago');
const db = require('../../config/database');
// Configuração do Mercado Pago com seu Access Token
mercadopago.configurations.setAccessToken(process.env.MERCADO_PAGO_ACCESS_TOKEN);

// Função para criar pagamento e gerar QR Code
async function criarPagamentoQR(uuidUsuario, valor) {
    const payment_data = {
      transaction_amount: Number(valor),
      description: "Acesso à transmissão ao vivo",
      payment_method_id: "pix", // Usando PIX como forma de pagamento
      payer: {
        first_name: "Cliente", // Nome fictício
        last_name: "Futebol",  // Sobrenome fictício
        email: "cliente@dominio.com" // E-mail fictício para evitar o erro
      }
    };
  
    try {
      // Cria o pagamento no Mercado Pago
      const pagamento = await mercadopago.payment.create(payment_data);
      console.log('Pagamento criado:', pagamento.response.id);
  
      // Recupera o QR Code e o payment_id
      const qrCodeBase64 = pagamento.response.point_of_interaction.transaction_data.qr_code_base64;
      const paymentId = pagamento.response.id;
      const status = pagamento.response.status;
        
      // Salva o QR Code e o payment_id no banco de dados
      const updateQuery = 'UPDATE usuarios SET idpayment = ?, payment_qr_code = ? WHERE uuid = ?';
      await db.run(updateQuery, [paymentId, qrCodeBase64, uuidUsuario]);

      return { qrCodeBase64, paymentId, status}; // Retorna o QR Code em base64 e o ID do pagamento
    } catch (error) {
      console.error('Erro ao criar pagamento:', error);
      throw error; // Retorna o erro para ser tratado
    }
}

// Função para verificar se um pagamento foi aprovado
async function verificarStatusPagamento(paymentId) {
    try {
        const pagamento = await mercadopago.payment.get(paymentId);
        const status = pagamento.response.status;

        console.log(status)
      if (pagamento.status === 404) {
        throw new Error('Pagamento não encontrado');
      }
  

      console.log('Status do pagamento:', status);
  
      if (status === 'approved') {
        return { aprovado: true, pagamento: pagamento.response };
      } else {
        return { aprovado: false, status: status };
      }
  
    } catch (error) {
      console.error('Erro ao consultar o pagamento:', error);
      throw new Error('Erro ao verificar status do pagamento');
    }
}

async function verificarStatusPagamentoPorSessao(uuidUsuario) {
    try {
      // Primeiro, recupere o paymentId da tabela 'sessions' para a sessionId fornecida
      const query = 'SELECT idpayment FROM sessions WHERE uuid = ?';
      const row = await db.get(query, [uuidUsuario]);
      
      if (!row || !row.idpayment) {
        throw new Error('Pagamento não encontrado para esta sessão');
      }
  
      const paymentId = row.idpayment;
  
      // Agora, use a função 'verificarStatusPagamento' para consultar o status do pagamento
      const resultado = await verificarStatusPagamento(paymentId);
  
      // Atualiza o status do pagamento no banco de dados
      const status = resultado.aprovado ? 'aprovado' : resultado.status;
      const updateQuery = 'UPDATE sessions SET payment_status = ? WHERE uuid = ?';
      
      // Atualiza o banco de dados com o novo status
      await db.run(updateQuery, [status, uuidUsuario]);
  
      console.log('Status do pagamento atualizado para:', status);
  
      return resultado;
    } catch (error) {
      console.error('Erro ao verificar e atualizar o status do pagamento:', error);
      throw error;
    }
}

module.exports = { criarPagamentoQR, verificarStatusPagamento }