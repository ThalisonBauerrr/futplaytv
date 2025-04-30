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

// Função para verificar se um pagamento foi aprovado
async function atualizarStatusPagamentos() {
  let connection;
  try {
    connection = await db.getConnection();
    
    // 1. Buscar todos os pagamentos não finalizados
    const [pagamentos] = await connection.query(`
      SELECT id, idpayment, payment_status
      FROM usuarios 
      WHERE payment_status IS NULL 
      OR payment_status NOT IN ('approved', 'rejected', 'refunded', 'cancelled','pending')
    `);

    let atualizados = 0;

    // 2. Verificar cada pagamento
    for (const pagamento of pagamentos) {
      try {
        if (!pagamento.idpayment) {
          console.log(`[${pagamento.id}] Sem ID de pagamento, ignorando...`);
          continue;
        }

        // Consulta o Mercado Pago
        const { status } = (await verificarStatusPagamento(pagamento.idpayment));
        
        // Se o status já é o mesmo, ignora
        if (pagamento.payment_status === status) {
          console.log(`[${pagamento.id}] Status já atualizado (${status}), ignorando...`);
          continue;
        }

        // Atualiza somente se mudou
        await connection.query(`
          UPDATE usuarios 
          SET payment_status = ?, 
              updated_at = NOW() 
          WHERE id = ?
        `, [status, pagamento.id]);

        console.log(`[${pagamento.id}] Status atualizado: ${pagamento.payment_status} → ${status}`);
        atualizados++;

        // Libera acesso se aprovado
        if (status === 'approved') {
          await liberarAcessoUsuario(pagamento.id);
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


// Função auxiliar para liberar acesso do usuário (exemplo)
async function liberarAcessoUsuario(userId) {
 console.log('LIBERANDO ACESSO')
}

// Mantenha sua função existente para verificar um pagamento individual
async function verificarStatusPagamento(paymentId) {
  try {
      const pagamento = await mercadopago.payment.get(paymentId);
      const status = pagamento.response.status;

      console.log('Status do pagamento:', status);

      return { 
          aprovado: status === 'approved', 
          status: status,
          pagamento: pagamento.response 
      };

  } catch (error) {
      console.error('Erro ao consultar o pagamento:', error);
      throw new Error('Erro ao verificar status do pagamento');
  }
}

module.exports = { criarPagamentoQR, verificarStatusPagamento, atualizarStatusPagamentos };