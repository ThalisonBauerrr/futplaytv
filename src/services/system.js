const db = require('../../config/database');
const { getjogos } = require('./getJogos');

class RegistroDiarioService {
  // Remove a criação da data no construtor
  constructor() {
    // vazio ou você pode remover o construtor totalmente
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

  async verificarRegistroDoDia() {
    const hoje = this.getDataAtual();  // chama aqui para pegar data atual toda vez
    const [rows] = await db.query(
      `SELECT id FROM \`system\` WHERE data = ?`, 
      [hoje]
    );
    return rows.length > 0;  // Verifica se há registros
  }

  async criarRegistro() {
    const hoje = this.getDataAtual();  // chama aqui para pegar data atual toda vez
    const [result] = await db.query(
      `INSERT INTO \`system\` (data) VALUES (?)`,
      [hoje]
    );
    return result.insertId;  // Retorna o ID do registro inserido
  }

  async executarRotinaDiaria() {
    try {
      const hoje = this.getDataAtual();  // chama aqui para pegar data atual toda vez

      const existeRegistro = await this.verificarRegistroDoDia();
      if (existeRegistro) {
        return { 
          status: 'skipped',
          message: `⚠️  Registro para ${hoje} já existe`,
        };
      }

      const registroId = await this.criarRegistro();
      const resultadoJogos = await getjogos();

      return {
        status: 'success',
        registroId,
        data: hoje,
        jogos: resultadoJogos,
        message: `✅  Registro do dia ${hoje} criado!`
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
