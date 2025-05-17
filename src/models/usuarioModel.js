const db = require('../../config/database');
const { DateTime } = require('luxon');

class usuarioModel {
  // Centraliza a criação da conexão com o banco de dados
  static async getConnection() {
    let connection;
    try {
      connection = await db.getConnection();
      return connection;
    } catch (error) {
      console.error('Erro ao obter conexão com o banco:', error);
      throw error;
    }
  }
  // Verificar dados do usuário
  static async verificarUsuario(uuid) {
    let connection;
    try {
      connection = await this.getConnection();
      await connection.beginTransaction();
      const [rows] = await connection.query(
        "SELECT tempo_inicio, tempo_fim, idpayment, payment_qr_code,payment_status,purchase FROM usuarios WHERE uuid = ? FOR UPDATE", 
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
  }
  // Atualizar tempo_fim
  static async atualizarTempoFim(uuid) {
    let connection;
    try {
      connection = await this.getConnection();
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
  }
  // Verificar ou atualizar o usuário (IP e UUID)
  static async verificarOuAtualizarUsuario(ip, uuid) {
    let connection;
    try {
      connection = await this.getConnection();
      await connection.beginTransaction();

      const [rowsByIp] = await connection.query(
        "SELECT uuid FROM usuarios WHERE ip = ?", 
        [ip]
      );

      if (rowsByIp.length > 0) {
        if (rowsByIp[0].uuid !== uuid) {
          const [result] = await connection.query(
            "UPDATE usuarios SET uuid = ? WHERE ip = ?", 
            [uuid, ip]
          );
          await connection.commit();
          return { updated: result.affectedRows > 0 };
        }
        return { noChange: true };
      }

      const [rowsByUuid] = await connection.query(
        "SELECT ip FROM usuarios WHERE uuid = ?", 
        [uuid]
      );

      if (rowsByUuid.length > 0) {
        if (rowsByUuid[0].ip !== ip) {
          const [result] = await connection.query(
            "UPDATE usuarios SET ip = ? WHERE uuid = ?", 
            [ip, uuid]
          );
          await connection.commit();
          return { updated: result.affectedRows > 0 };
        }
        return { noChange: true };
      }

      const minutesFree = parseInt(process.env.MINUTES_FREE) || 10;
      const [result] = await connection.query(
        `INSERT INTO usuarios (uuid, ip, tempo_inicio, tempo_fim) VALUES (?, ?, NOW(), DATE_ADD(NOW(), INTERVAL ? MINUTE))`,
        [uuid, ip, minutesFree]
      );
      await connection.commit();
      return { inserted: result.affectedRows > 0 };
    } catch (err) {
      if (connection) await connection.rollback();
      console.error('Erro ao verificar/atualizar usuário:', err);
      throw err;
    } finally {
      if (connection) await connection.release();
    }
  }
  // Buscar QRCode pelo usuário
  static async getQRCodeByUser(uuid) {
    let connection;
    try {
      connection = await this.getConnection();
      const [rows] = await connection.query(
        "SELECT payment_qr_code, idpayment FROM usuarios WHERE uuid = ? LIMIT 1", 
        [uuid]
      );
      return rows[0] ? { qrCode: rows[0].payment_qr_code, paymentId: rows[0].idpayment } : null;
    } catch (err) {
      console.error('Erro ao buscar QR Code:', err);
      throw err;
    } finally {
      if (connection) await connection.release();
    }
  }
  // Salvar QRCode
  static async saveQRCode(uuid, paymentId, qrCodeBase64) {
    let connection;
    try {
      connection = await this.getConnection();
      await connection.beginTransaction(); // Inicia transação

      if (!uuid || !paymentId || !qrCodeBase64) {
        throw new Error('Dados inválidos para salvar QR Code');
      }

      const [result] = await connection.query(
        `UPDATE usuarios SET idpayment = ?, payment_qr_code = ?, updated_at = CURRENT_TIMESTAMP WHERE uuid = ?`,
        [paymentId, qrCodeBase64, uuid]
      );

      if (result.affectedRows === 0) {
        throw new Error(`Nenhum usuário com UUID ${uuid} foi encontrado para atualização`);
      }

      await connection.commit(); // Confirma transação
      return true;
    } catch (error) {
      if (connection) await connection.rollback(); // Rollback em caso de erro
      console.error('Erro ao salvar QR Code:', error.message);
      throw error;
    } finally {
      if (connection) await connection.release();
    }
  }
  // Limpar dados de pagamento
  static async limparDadosPagamento(uuid) {
    let connection;
    try {
      connection = await this.getConnection();
      const [result] = await connection.query(
        `UPDATE usuarios SET idpayment = NULL, payment_qr_code = NULL WHERE uuid = ?`,
        [uuid]
      );
      return result.affectedRows > 0;
    } catch (err) {
      console.error('Erro ao limpar dados de pagamento:', err);
      throw err;
    } finally {
      if (connection) await connection.release();
    }
  }
  // Atualizar dados de pagamento
static async atualizarDadosPagamento(uuid, paymentId, qrCode, payloadPix) {
  let connection;
  try {
    connection = await this.getConnection();
    const [result] = await connection.query(
      `UPDATE usuarios 
       SET idpayment = ?, payment_qr_code = ?, payment_pix_payload = ?, tempo_inicio = NOW(), tempo_fim = DATE_ADD(NOW(), INTERVAL ? MINUTE) 
       WHERE uuid = ?`,
      [paymentId, qrCode, payloadPix, process.env.MINUTES_FREE || 10, uuid]
    );
    return result.affectedRows > 0;
  } catch (err) {
    console.error('Erro ao atualizar dados de pagamento:', err);
    throw err;
  } finally {
    if (connection) await connection.release();
  }
}
  // Buscar dados completos do usuário
  static async getDadosCompletos(uuid) {
    let connection;
    try {
      connection = await this.getConnection();
      const [rows] = await connection.query(
        `SELECT 
          idpayment,
          payment_status,
          purchase, 
          payment_qr_code,
          payment_pix_payload,
          tempo_inicio,
          tempo_fim, 
          updated_at FROM usuarios WHERE uuid = ?`,
        [uuid]
      );
      return rows[0];
    } catch (err) {
      console.error('Erro ao buscar dados:', err);
      throw err;
    } finally {
      if (connection) await connection.release();
    }
  }
  // Atualizar o tempo de acesso
  static async atualizarTempoAcesso(uuid, minutos) {
    try {
      // Obter a data e hora atual no fuso horário de São Paulo
      const novoTempoFim = DateTime.now().setZone('America/Sao_Paulo').plus({ minutes: minutos });

      // Exibir a hora após adicionar os minutos
      //console.log('Novo tempo fim:', novoTempoFim.toLocaleString(DateTime.DATETIME_MED), 'Minutos:', minutos);

      // Atualizar o tempo_fim no banco de dados
      const [result] = await db.query(
        `UPDATE usuarios SET tempo_fim = ? WHERE uuid = ?`,
        [novoTempoFim.toISO(), uuid]
      );

      // Retorna verdadeiro se a atualização foi bem-sucedida
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao adicionar tempo de acesso:', error);
      throw error;
    }
  }
  // Atualizar o último acesso
  static async atualizarUltimoAcesso(uuid) {
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
  }
  // Atualizar o status de pagamento
  static async atualizarStatusPagamento(uuid, status) {
    try {
      const [result] = await db.query(
        `UPDATE usuarios SET payment_status = ? WHERE uuid = ?`,
        [status, uuid]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar o status de pagamento:', error);
      throw error;
    }
  }
  // Atualizar o purchase
  static async atualizarPurchase(uuid, valor) {
    try {
      const [result] = await db.query(
        `UPDATE usuarios SET purchase = ? WHERE uuid = ?`,
        [valor, uuid]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar status da compra:', error);
      throw error;
    }
  }
  static async resetarCamposUsuario(uuid) {
    try {
      // Executa o update no banco de dados
      const [result] = await db.query(`
        UPDATE usuarios 
        SET 
            payment_status = NULL,
            purchase = 0
        WHERE uuid = ?
      `, [uuid]);

      // Verifica se o update foi bem-sucedido
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao resetar campos do usuário:', error);
      throw error;
    }
  }
}

module.exports = usuarioModel;
