const db = require('../../config/database'); // Usando MySQL com mysql2/promise
const { buscarPlacaresExatos } = require('./getStatus');

// Função principal de atualização de placar
async function atualizarPlacarPartida(partida) {
  let connection;
  try {
    connection = await db.getConnection();
    
    let partidaExistente = null;
    let nomeCasaOficial = partida.timeCasa;
    let nomeVisitanteOficial = partida.timeVisitante;

    // 1. Busca o ID da partida usando os nomes exatos
    partidaExistente = await buscarPartida(nomeCasaOficial, nomeVisitanteOficial, connection);

    if (!partidaExistente) {
      // 2. Tenta encontrar variação do time da casa
      const timeCasaVariacao = await buscarNomeOficialPorVariacao(nomeCasaOficial, connection);
      if (timeCasaVariacao) {
        nomeCasaOficial = timeCasaVariacao;
        partidaExistente = await buscarPartida(nomeCasaOficial, nomeVisitanteOficial, connection);
      }

      // 3. Se ainda não encontrou, tenta encontrar variação do time visitante
      if (!partidaExistente) {
        const timeVisitanteVariacao = await buscarNomeOficialPorVariacao(nomeVisitanteOficial, connection);
        if (timeVisitanteVariacao) {
          nomeVisitanteOficial = timeVisitanteVariacao;
          partidaExistente = await buscarPartida(nomeCasaOficial, nomeVisitanteOficial, connection);
        }
      }

      // 4. Se não encontrar, tenta variação de ambos os times
      if (!partidaExistente) {
        partidaExistente = await buscarPartida(nomeCasaOficial, nomeVisitanteOficial, connection);
      }

      if (!partidaExistente) {
        return false; // Não encontrou a partida
      }
    }

    // 5. Atualização usando o ID encontrado
    const updateQuery = `
      UPDATE partidas 
      SET placar_casa = ?, placar_visitante = ?, tempo = ?, status = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `;
    const updateValues = [
      partida.placarCasa,
      partida.placarVisitante,
      partida.tempo,
      partida.status,
      partidaExistente.id
    ];

    const [updateResult] = await connection.query(updateQuery, updateValues);

    if (updateResult.affectedRows === 0) {
      return false;
    }

    // 6. Verificação explícita
    const [dadosAtualizados] = await connection.query(
      `SELECT placar_casa, placar_visitante FROM partidas WHERE id = ?`,
      [partidaExistente.id]
    );

    if (!dadosAtualizados || dadosAtualizados.length === 0) {
      return false;
    }

    return true;

  } catch (error) {
    console.error('Erro ao atualizar o placar da partida:', error);
    return false;
  } finally {
    if (connection) connection.release();
  }
}

// Função para normalizar o nome do time conforme padrão do banco de dados
function normalizarNomeTime(nomeTime) {
  // Substitui " Feminino" por " (F)"
  return nomeTime.replace(/ Feminino$/, ' (F)');
}

// Função auxiliar para buscar partida por nome do time da casa e visitante
async function buscarPartida(timeCasa, timeVisitante, connection) {
  const timeCasaNormalizado = normalizarNomeTime(timeCasa);
  const timeVisitanteNormalizado = normalizarNomeTime(timeVisitante);

  const [rows] = await connection.query(
    `SELECT id FROM partidas WHERE time_casa_nome = ? AND time_visitante_nome = ?`,
    [timeCasaNormalizado, timeVisitanteNormalizado]
  );

  if (rows.length > 0) {
    return rows[0]; // Retorna o primeiro resultado encontrado
  }

  return null;
}

// Função auxiliar para buscar o nome oficial do time por variação
async function buscarNomeOficialPorVariacao(nomeTime, connection) {
  const [rows] = await connection.query(
    `SELECT nome_oficial FROM times WHERE variacoes LIKE ?`,
    [`%${nomeTime}%`]
  );

  if (rows.length > 0) {
    return rows[0].nome_oficial; // Retorna o nome oficial encontrado
  }

  return null;
}

// Função que busca os placares e atualiza as partidas
async function atualizarPlacaresNoBanco() {
  let connection;
  try {
    connection = await db.getConnection();
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
    console.error('❌ Falha crítica ao atualizar placares:', error.message);
    throw error;
  } finally {
    if (connection) connection.release();
  }
}

module.exports = { atualizarPlacaresNoBanco };