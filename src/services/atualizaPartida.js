const db = require('../../config/database');
const { buscarPlacaresExatos } = require('./getStatus');

// Função principal de atualização de placar
async function atualizarPlacarPartida(partida) {
  try {
    let partidaExistente = null;
    let nomeCasaOficial = partida.timeCasa;
    let nomeVisitanteOficial = partida.timeVisitante;

    // 1. Busca o ID da partida usando os nomes exatos
    partidaExistente = await buscarPartida(nomeCasaOficial, nomeVisitanteOficial);

    if (!partidaExistente) {
      // 2. Tenta encontrar variação do time da casa
      const timeCasaVariacao = await buscarNomeOficialPorVariacao(nomeCasaOficial);
      if (timeCasaVariacao) {
        nomeCasaOficial = timeCasaVariacao;
        partidaExistente = await buscarPartida(nomeCasaOficial, nomeVisitanteOficial);
      }

      // 3. Se ainda não encontrou, tenta encontrar variação do time visitante
      if (!partidaExistente) {
        const timeVisitanteVariacao = await buscarNomeOficialPorVariacao(nomeVisitanteOficial);
        if (timeVisitanteVariacao) {
          nomeVisitanteOficial = timeVisitanteVariacao;
          partidaExistente = await buscarPartida(nomeCasaOficial, nomeVisitanteOficial);
        }
      }

      // 4. Se não encontrar, tenta variação de ambos os times
      if (!partidaExistente) {
        partidaExistente = await buscarPartida(nomeCasaOficial, nomeVisitanteOficial);
      }

      if (!partidaExistente) {
        return false; // Não encontrou a partida
      }
    }

    // 5. Atualização usando o ID encontrado
    const updateResult = await new Promise((resolve) => {
      db.run(
        `UPDATE partidas SET
          placar_casa = ?,
          placar_visitante = ?,
          tempo = ?,
          status = ?,
          updated_at = CURRENT_TIMESTAMP
        WHERE id = ?`,
        [
          partida.placarCasa,
          partida.placarVisitante,
          partida.tempo,
          partida.status,
          partidaExistente.id
        ],
        function(error) {
          if (error) {
            resolve({ success: false, error });
          } else {
            resolve({
              success: true,
              changes: this.changes,
              id: partidaExistente.id
            });
          }
        }
      );
    });

    if (!updateResult.success) {
      return false;
    }

    // 6. Verificação explícita
    const dadosAtualizados = await new Promise((resolve) => {
      db.get(
        `SELECT placar_casa, placar_visitante
         FROM partidas WHERE id = ?`,
        [partidaExistente.id],
        (err, row) => {
          if (err) {
            resolve(null);
          } else {
            resolve(row);
          }
        }
      );
    });

    if (!dadosAtualizados) {
      return false;
    }

    return true;

  } catch (error) {
    return false;
  }
}

// Função auxiliar para buscar partida por nome do time da casa e visitante
async function buscarPartida(timeCasa, timeVisitante) {
  return new Promise((resolve) => {
    db.get(
      `SELECT id FROM partidas
       WHERE time_casa_nome = ?
       AND time_visitante_nome = ?`,
      [timeCasa, timeVisitante],
      (err, row) => {
        if (err) {
          resolve(null);
        } else {
          resolve(row);
        }
      }
    );
  });
}

// Função auxiliar para buscar o nome oficial do time por variação
async function buscarNomeOficialPorVariacao(nomeTime) {
  return new Promise((resolve) => {
    db.get(
      `SELECT nome_oficial FROM times WHERE variacoes LIKE ?`,
      [`%${nomeTime}%`],
      (err, row) => {
        if (err) {
          resolve(null);
        } else {
          resolve(row ? row.nome_oficial : null);
        }
      }
    );
  });
}

// Função que busca os placares e atualiza as partidas
async function atualizarPlacaresNoBanco() {
  try {
    const placares = await buscarPlacaresExatos();
    let atualizadas = 0;

    for (const competicao of placares) {
      for (const partida of competicao.partidas) {
        const success = await atualizarPlacarPartida(partida);
        if (success) atualizadas++;
      }
    }
    return atualizadas;

  } catch (error) {
    console.error('❌ Falha crítica:', error.message);
    throw error;
  }
}

module.exports = {atualizarPlacaresNoBanco};
