require('dotenv').config();
const mercadopago = require('mercadopago');
const db = require('../../config/database'); // Usando MySQL com mysql2/promise

// Configuração do Mercado Pago com seu Access Token
mercadopago.configurations.setAccessToken(process.env.MERCADO_PAGO_ACCESS_TOKEN);

// Função para criar pagamento e gerar QR Code
async function criarPagamentoQR(uuidUsuario, valor) {
    let connection;
    try {
        connection = await db.getConnection();
        
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

        // Cria o pagamento no Mercado Pago
        const pagamento = await mercadopago.payment.create(payment_data);
        console.log('Pagamento criado:', pagamento.response.id);

        // Recupera o QR Code e o payment_id
        const qrCodeBase64 = pagamento.response.point_of_interaction.transaction_data.qr_code_base64;
        const paymentId = pagamento.response.id;
        const status = pagamento.response.status;
            
        // Salva o QR Code e o payment_id no banco de dados usando MySQL
        const updateQuery = 'UPDATE usuarios SET idpayment = ?, payment_qr_code = ? WHERE uuid = ?';
        const [result] = await connection.query(updateQuery, [paymentId, qrCodeBase64, uuidUsuario]);

        if (result.affectedRows === 0) {
            throw new Error('Nenhum usuário foi atualizado - UUID não encontrado');
        }

        return { qrCodeBase64, paymentId, status }; // Retorna o QR Code em base64 e o ID do pagamento
    } catch (error) {
        console.error('Erro ao criar pagamento:', error);
        throw error; // Retorna o erro para ser tratado
    } finally {
        if (connection) connection.release();
    }
}

// Função para verificar e atualizar o status dos pagamentos
async function atualizarStatusPagamentos() {
  let connection;
  try {
    connection = await db.getConnection();
    
    // 1. Buscar todos os pagamentos não finalizados ou com status não confirmado
    const [pagamentos] = await connection.query(`
      SELECT id, idpayment, payment_status
      FROM usuarios 
    `);

    let atualizados = 0;

    // 2. Verificar cada pagamento
    for (const pagamento of pagamentos) {
      try {
        // Exibir o ID do pagamento que está sendo verificado
        //console.log(`Verificando pagamento com ID: ${pagamento.id}`);
        
        if (!pagamento.idpayment) {
          console.log(`[${pagamento.id}] Sem ID de pagamento, ignorando...`);
          continue;
        }

        // Consulta o Mercado Pago para obter o status atual
        const  status = await verificarStatusPagamento(pagamento.idpayment);
  
        // Se o status já é o mesmo, ignora
        if (pagamento.payment_status === status) {
          //console.log(`[${pagamento.id}] Status já atualizado (${status}), ignorando...`);
          continue;
        }

        // Atualiza o status do pagamento no banco de dados
        const [result] = await connection.query(`
          UPDATE usuarios 
          SET payment_status = ?, 
              updated_at = NOW() 
          WHERE id = ?
        `, [status, pagamento.id]);

        if (result.affectedRows > 0) {
          console.log(`[${pagamento.id}] Status atualizado: ${pagamento.payment_status} → ${status}`);
          atualizados++;
        }

      } catch (error) {
        console.error(`[${pagamento.id}] Erro ao processar:`, error.message);
      }
    }

    return { 
      total: pagamentos.length, 
      atualizados 
    };
    
  } finally {
    if (connection) connection.release();
  }
}


// Mantenha sua função existente para verificar um pagamento individual
async function verificarStatusPagamento(paymentId) {
  try {
    // Consulta o status do pagamento via Mercado Pago
    const pagamento = await mercadopago.payment.get(paymentId);
    const status = pagamento.response.status;

    if (!status) {
      throw new Error('Status do pagamento não encontrado');
    }

    // Log do status para depuração
    //console.log(`[MP] Status do pagamento (${paymentId}): ${status}`);

    return status;  // Retorna o status do pagamento
  } catch (error) {
    console.error('Erro ao consultar o pagamento:', error);
    throw new Error('Erro ao verificar status do pagamento');
  }
}
module.exports = { criarPagamentoQR, verificarStatusPagamento, atualizarStatusPagamentos };