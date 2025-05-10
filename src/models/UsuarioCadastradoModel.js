const db = require('../../config/database');

class UsuarioCadastradoModel {
  static async criar(id_uuid, email, senha) {
    try {
      const [result] = await db.query(
        `INSERT INTO usuarios_cadastrados 
         (id_uuid, email, senha) 
         VALUES (?, ?, ?)`,
        [id_uuid, email, senha]
      );
      return result.insertId;
    } catch (error) {
      console.error('Erro no modelo ao cadastrar usuário:', error);
      throw error;
    }
  }
  static async buscarPorEmail(email) {
    try {
      const [rows] = await db.query(
        `SELECT uc.*, u.uuid 
         FROM usuarios_cadastrados uc
         JOIN usuarios u ON uc.id_uuid = u.id
         WHERE uc.email = ? LIMIT 1`,
        [email]
      );
      return rows[0];
    } catch (error) {
      console.error('Erro ao buscar usuário por email:', error);
      throw error;
    }
  }
  static async atualizarSenha(id, novaSenha) {
    try {
      const [result] = await db.query(
        'UPDATE usuarios_cadastrados SET senha = ? WHERE id = ?',
        [novaSenha, id]
      );
      return result.affectedRows > 0;
    } catch (error) {
      console.error('Erro ao atualizar senha:', error);
      throw error;
    }
  }
  static async buscarPorId(id) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM usuarios_cadastrados WHERE id = ?',
        [id]
      );
      return rows[0];
    } catch (error) {
      console.error('Erro ao buscar usuário por ID:', error);
      throw error;
    }
  }
}

module.exports = UsuarioCadastradoModel;