const db = require('../../config/database'); // Usando MySQL com mysql2

class Stream {

  static async getGameById(gameId) {
    try {
      const [rows] = await db.promise().query(`
        SELECT 
          j.*,
          tc.nome AS time_casa_nome,
          tc.logo AS time_casa_logo,
          tv.nome AS time_visitante_nome,
          tv.logo AS time_visitante_logo,
          c.nome AS competicao_nome
        FROM jogos j
        LEFT JOIN times tc ON j.time_casa_id = tc.id
        LEFT JOIN times tv ON j.time_visitante_id = tv.id
        LEFT JOIN competicoes c ON j.competicao_id = c.id
        WHERE j.id = ?
        LIMIT 1
      `, [gameId]);
      
      return rows[0] || null;
    } catch (err) {
      console.error('Erro ao buscar jogo:', err);
      throw err;
    }
  }

  static async getCanalUrlById(canalId) {
    try {
      const [rows] = await db.promise().query(`
        SELECT 
          id,
          nome AS name,
          url,
          url_alternative AS alternativeUrl,
          logo
        FROM canais 
        WHERE id = ?
      `, [canalId]);
      
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error('Erro ao buscar URL do canal:', err);
      throw err;
    }
  }

  static async getTeamById(teamId) {
    try {
      const [rows] = await db.promise().query(`
        SELECT 
          id,
          nome AS name,
          logo,
          sigla AS abbreviation,
          pais AS country
        FROM times 
        WHERE id = ?
      `, [teamId]);
      
      return rows.length > 0 ? rows[0] : null;
    } catch (err) {
      console.error('Erro ao buscar time:', err);
      throw err;
    }
  }

  static async getAllGames(limit = 20, page = 1) {
    try {
      const offset = (page - 1) * limit;
      const [rows] = await db.promise().query(`
        SELECT 
          j.*,
          tc.nome AS time_casa_nome,
          tc.logo AS time_casa_logo,
          tv.nome AS time_visitante_nome,
          tv.logo AS time_visitante_logo,
          c.nome AS competicao_nome
        FROM jogos j
        LEFT JOIN times tc ON j.time_casa_id = tc.id
        LEFT JOIN times tv ON j.time_visitante_id = tv.id
        LEFT JOIN competicoes c ON j.competicao_id = c.id
        ORDER BY j.data DESC, j.hora DESC
        LIMIT ? OFFSET ?
      `, [limit, offset]);
      
      return rows;
    } catch (error) {
      console.error('Erro ao buscar jogos:', error);
      throw error;
    }
  }

  static async getLiveGames(limit = 5) {
    try {
      const [rows] = await db.promise().query(`
        SELECT 
          j.*,
          tc.nome AS time_casa_nome,
          tc.logo AS time_casa_logo,
          tv.nome AS time_visitante_nome,
          tv.logo AS time_visitante_logo
        FROM jogos j
        LEFT JOIN times tc ON j.time_casa_id = tc.id
        LEFT JOIN times tv ON j.time_visitante_id = tv.id
        WHERE j.status = 'ao-vivo' 
        OR j.status = 'intervalo'
        ORDER BY j.data DESC, j.hora DESC
        LIMIT ?
      `, [limit]);
      
      return rows;
    } catch (error) {
      console.error('Erro ao buscar jogos ao vivo:', error);
      throw error;
    }
  }
}

module.exports = Stream;