const db = require('../../config/database');

const verificarUsuario = async (uuid) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();
    
    const [rows] = await connection.query(
      "SELECT tempo_inicio, tempo_fim, idpayment, payment_qr_code FROM usuarios WHERE uuid = ? FOR UPDATE", 
      [uuid]
    );
    
    await connection.commit(); // Libera o lock após a verificação
    return rows[0] || null;
  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erro ao verificar usuário:', err);
    throw err;
  } finally {
    if (connection) await connection.release();
  }
};
const atualizarTempoFim = async (uuid) => {
  let connection;
  try {
    connection = await db.getConnection();
    const minutesFree = parseInt(process.env.MINUTES_FREE) || 10;

    const [result] = await connection.query(
      "UPDATE usuarios SET tempo_fim = DATE_ADD(NOW(), INTERVAL ? MINUTE) WHERE uuid = ?",
      [minutesFree, uuid]
    );

    return result.affectedRows > 0;
  } catch (err) {
    console.error('Erro ao atualizar tempo de fim:', err);
    throw err;
  } finally {
    if (connection) await connection.release();
  }
};
const verificarOuAtualizarUsuario = async (ip, uuid) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction();

    // Verifica se o IP já existe
    const [rowsByIp] = await connection.query(
      "SELECT uuid FROM usuarios WHERE ip = ?", 
      [ip]
    );

    if (rowsByIp.length > 0) {
      if (rowsByIp[0].uuid !== uuid) {
        // Atualiza o UUID se for diferente
        const [result] = await connection.query(
          "UPDATE usuarios SET uuid = ? WHERE ip = ?", 
          [uuid, ip]
        );
        await connection.commit();
        console.log(`IP ${ip} encontrado. UUID atualizado.`);
        return { updated: result.affectedRows > 0 };
      }
      console.log(`IP ${ip} e UUID já estão atualizados.`);
      return { noChange: true };
    }

    // Verifica se o UUID já existe
    const [rowsByUuid] = await connection.query(
      "SELECT ip FROM usuarios WHERE uuid = ?", 
      [uuid]
    );

    if (rowsByUuid.length > 0) {
      if (rowsByUuid[0].ip !== ip) {
        // Atualiza o IP se for diferente
        const [result] = await connection.query(
          "UPDATE usuarios SET ip = ? WHERE uuid = ?", 
          [ip, uuid]
        );
        await connection.commit();
        console.log(`UUID ${uuid} encontrado. IP atualizado.`);
        return { updated: result.affectedRows > 0 };
      }
      console.log(`UUID ${uuid} e IP já estão atualizados.`);
      return { noChange: true };
    }

    // Cria novo usuário se não existir
    const minutesFree = parseInt(process.env.MINUTES_FREE) || 10;
    const [result] = await connection.query(
      `INSERT INTO usuarios 
       (uuid, ip, tempo_inicio, tempo_fim) 
       VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
      [uuid, ip, minutesFree]
    );

    await connection.commit();
    console.log(`Novo usuário com IP ${ip} e UUID ${uuid} inserido.`);
    return { inserted: result.affectedRows > 0 };

  } catch (err) {
    if (connection) await connection.rollback();
    console.error('Erro ao verificar/atualizar usuário:', err);
    throw err;
  } finally {
    if (connection) await connection.release();
  }
};
const getQRCodeByUser = async (uuid) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows] = await connection.query(
      "SELECT payment_qr_code, idpayment FROM usuarios WHERE uuid = ? LIMIT 1", 
      [uuid]
    );
    
    if (!rows[0]) return null;
    
    return {
      qrCode: rows[0].payment_qr_code,
      paymentId: rows[0].idpayment
    };
  } catch (err) {
    console.error('Erro ao buscar QR Code:', err);
    throw err;
  } finally {
    if (connection) await connection.release();
  }
};
const saveQRCode = async (uuid, paymentId, qrCodeBase64) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.beginTransaction(); // ⚠️ Inicia transação

    console.log('Dados recebidos:', { uuid, paymentId, qrCodeLength: qrCodeBase64?.length });

    if (!uuid || !paymentId || !qrCodeBase64) {
      throw new Error('Dados inválidos para salvar QR Code');
    }

    const [result] = await connection.query(
      `UPDATE usuarios 
       SET idpayment = ?, 
           payment_qr_code = ?,
           updated_at = CURRENT_TIMESTAMP
       WHERE uuid = ?`,
      [paymentId, qrCodeBase64, uuid]
    );

    console.log('Resultado da atualização:', result);

    if (result.affectedRows === 0) {
      throw new Error(`Nenhum usuário com UUID ${uuid} foi encontrado para atualização`);
    }

    await connection.commit(); // ✅ Confirma a transação
    console.log('QR Code salvo com sucesso no banco de dados.');
    return true;
  } catch (error) {
    if (connection) await connection.rollback(); // 🔄 Rollback em caso de erro
    console.error('Erro ao salvar QR Code:', error.message);
    throw error;
  } finally {
    if (connection) await connection.release();
  }
};
const limparDadosPagamento = async (uuid) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [result] = await connection.query(
      `UPDATE usuarios 
       SET idpayment = NULL, 
           payment_qr_code = NULL
       WHERE uuid = ?`,
      [uuid]
    );
    return result.affectedRows > 0;
  } catch (err) {
    console.error('Erro ao limpar dados de pagamento:', err);
    throw err;
  } finally {
    if (connection) await connection.release();
  }
};
const atualizarDadosPagamento = async (uuid, paymentId, qrCode) => {
  let connection;
  try {
    connection = await db.getConnection();
    
    const [result] = await connection.query(
      `UPDATE usuarios 
       SET 
         idpayment = ?,
         payment_qr_code = ?,
         tempo_inicio = NOW(),
         tempo_fim = DATE_ADD(NOW(), INTERVAL ? MINUTE)
       WHERE uuid = ?`,
      [paymentId, qrCode, process.env.MINUTES_FREE || 10, uuid]
    );

    return result.affectedRows > 0;
  } catch (err) {
    console.error('Erro ao atualizar dados de pagamento:', err);
    throw err;
  } finally {
    if (connection) await connection.release();
  }
};
const getDadosCompletos = async (uuid) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows] = await connection.query(
      `SELECT 
        idpayment, 
        payment_qr_code, 
        tempo_inicio, 
        tempo_fim,
        updated_at
       FROM usuarios 
       WHERE uuid = ?`,
      [uuid]
    );
    return rows[0];
  } catch (err) {
    console.error('Erro ao buscar dados:', err);
    throw err;
  } finally {
    if (connection) await connection.release();
  }
};
const getDadosParaQRCode = async (uuid) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [rows] = await connection.query(
      `SELECT idpayment, payment_qr_code, tempo_fim 
       FROM usuarios 
       WHERE uuid = ? 
       LIMIT 1`,
      [uuid]
    );
    return rows[0];
  } catch (err) {
    console.error('Erro ao buscar dados para QR Code:', err);
    throw err;
  } finally {
    if (connection) await connection.release();
  }
};
const atualizarQRCodeETempo = async (uuid, paymentId, qrCode, minutos) => {
  let connection;
  try {
    connection = await db.getConnection();
    await connection.query(
      `UPDATE usuarios 
       SET idpayment = ?, 
           payment_qr_code = ?,
           tempo_fim = DATE_ADD(NOW(), INTERVAL ? MINUTE)
       WHERE uuid = ?`,
      [paymentId, qrCode, minutos, uuid]
    );
  } catch (err) {
    console.error('Erro ao atualizar QR Code e tempo:', err);
    throw err;
  } finally {
    if (connection) await connection.release();
  }
};
const buscarPorUUID = async (uuid) => {
  try {
    const [rows] = await db.query(
      "SELECT id, tempo_inicio, tempo_fim, updated_at FROM usuarios WHERE uuid = ? LIMIT 1", 
      [uuid]
    );
    return rows[0] || null;
  } catch (error) {
    console.error('Erro ao buscar usuário por UUID:', error);
    throw error;
  }
};
const atualizarTempoAcesso = async (uuid) => {
  try {
    const minutesFree = parseInt(process.env.MINUTES_FREE) || 10;
    const [result] = await db.query(
      `UPDATE usuarios 
       SET updated_at = NOW() 
       WHERE uuid = ?`,
      [uuid]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Erro ao atualizar tempo de acesso:', error);
    throw error;
  }
};
const atualizarUltimoAcesso = async (uuid) => {
  try {
    const [result] = await db.query(
      "UPDATE usuarios SET ultimo_acesso = NOW() WHERE uuid = ?",
      [uuid]
    );
    return result.affectedRows > 0;
  } catch (error) {
    console.error('Erro ao atualizar último acesso:', error);
    throw error;
  }
};



module.exports = {
  verificarUsuario,
  atualizarTempoFim,
  verificarOuAtualizarUsuario,
  getQRCodeByUser,
  saveQRCode,
  limparDadosPagamento,
  getDadosCompletos,
  atualizarDadosPagamento,
  getDadosParaQRCode,
  atualizarQRCodeETempo,
  buscarPorUUID,
  atualizarTempoAcesso,
  atualizarUltimoAcesso,
};