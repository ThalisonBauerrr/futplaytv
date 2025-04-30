const db = require('../../config/database');
const { getjogos } = require('./getJogos');

class RegistroDiarioService {
  constructor() {
    this.hoje = this.getDataAtual();
  }

  getDataAtual() {
    const agora = new Date();
    const offsetUTC = agora.getTimezoneOffset() * 60000;
    const offsetBRT = -3 * 3600000;
    const agoraBRT = new Date(agora.getTime() + offsetUTC + offsetBRT);
    
    return [
      agoraBRT.getFullYear(),
      String(agoraBRT.getMonth() + 1).padStart(2, '0'),
      String(agoraBRT.getDate()).padStart(2, '0')
    ].join('-');
  }

  // Alterado para usar db.query sem .promise(), pois já está usando mysql2/promise
  async verificarRegistroDoDia() {
    const [rows] = await db.query(
      `SELECT id FROM \`system\` WHERE data = ?`, 
      [this.hoje]
    );
    return rows.length > 0;  // Verifica se há registros
  }

  // Alterado para usar db.query sem .promise()
  async criarRegistro() {
    const [result] = await db.query(
      `INSERT INTO \`system\` (data) VALUES (?)`,
      [this.hoje]
    );
    return result.insertId;  // Retorna o ID do registro inserido
  }

  async executarRotinaDiaria() {
    try {
      const existeRegistro = await this.verificarRegistroDoDia();
      if (existeRegistro) {
        return { 
          status: 'skipped',
          message: `⚠️  Registro para ${this.hoje} já existe`,
        };
      }

      const registroId = await this.criarRegistro();
      const resultadoJogos = await getjogos();

      return {
        status: 'success',
        registroId,
        data: this.hoje,
        jogos: resultadoJogos,
        message: `✅  Registro do dia ${this.hoje} criado!`
      };

    } catch (error) {
      console.error('Erro no registro diário:', error);
      return {
        status: 'error',
        error: error.message
      };
    }
  }
}

module.exports = new RegistroDiarioService();
