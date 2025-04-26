const db = require('../../config/database');
const {getjogos} = require('./getJogos');

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

  async verificarRegistroDoDia() {
    return new Promise((resolve) => {
      db.get(
        `SELECT id FROM system WHERE data = ?`, 
        [this.hoje],
        (err, row) => resolve(!!row)
      );
    });
  }

  async criarRegistro() {
    return new Promise((resolve, reject) => {
      db.run(
        `INSERT INTO system (data) VALUES (?)`,
        [this.hoje],
        function(err) {
          if (err) return reject(err);
          resolve(this.lastID);
        }
      );
    });
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