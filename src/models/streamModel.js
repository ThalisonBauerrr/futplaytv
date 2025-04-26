const db = require('../../config/database');

class Stream {
  static async getGameById(gameId) {
    return new Promise((resolve, reject) => {
      db.get("SELECT * FROM jogos WHERE id = ?", [gameId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row); // Retorna os dados do jogo
      });
    });
  }

  // Função para obter a URL do canal baseado no canal_id
  static async getCanalUrlById(canalId) {
    return new Promise((resolve, reject) => {
      db.get("SELECT url FROM canais WHERE id = ?", [canalId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row ? row.url : null); // Retorna a URL do canal
      });
    });
  }

  // Função para obter os detalhes de um time com base no ID
  static async getTeamById(teamId) {
    return new Promise((resolve, reject) => {
      db.get("SELECT name, logo FROM times WHERE id = ?", [teamId], (err, row) => {
        if (err) {
          return reject(err);
        }
        resolve(row);  // Retorna o nome e logo do time
      });
    });
  }

  static async getAllGames() {
    try {
      const result = await db.query('SELECT * FROM jogos ORDER BY data DESC');
      return result.rows;
    } catch (error) {
      console.error('Erro ao buscar jogos:', error);
      throw error;
    }
}
}

module.exports = Stream;
