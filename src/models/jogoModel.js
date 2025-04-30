const db = require('../../config/database');

// Função para obter a data atual no formato brasileiro (YYYY-MM-DD)
function getDataBrasileira() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, '0');
  const dia = String(agora.getDate()).padStart(2, '0');
  return `${ano}-${mes}-${dia}`;
}

const buscarJogosDeHoje = async () => {
  let connection;
  try {
    connection = await db.getConnection();
    const hoje = getDataBrasileira();

    const [jogosHoje] = await connection.query(`
      SELECT 
        p.id,
        p.time_casa_nome,
        p.time_visitante_nome,
        p.time_casa_imagem,
        p.time_visitante_imagem,
        p.rodada,
        c.nome_padrao AS competicao,
        p.hora,
        p.placar_casa,
        p.placar_visitante,
        p.tempo,
        p.status,
        p.transmissoes,
        CASE 
          WHEN p.status = 'ao-vivo' THEN 1
          WHEN p.status = 'aguardando' AND TIME(p.hora) > TIME(CURRENT_TIME()) THEN 2
          WHEN p.status = 'intervalo' THEN 3
          WHEN p.status = 'aguardando' THEN 4
          ELSE 4
        END AS ordem_exibicao
      FROM partidas p
      INNER JOIN competicoes c ON p.competicao_id = c.id
      WHERE p.data = ?
      AND p.tempo != 'ENCERRADO'
      AND p.tempo != 'SUSPENSO' 
      AND p.transmissoes IS NOT NULL 
      AND p.transmissoes != '[]' 
      AND p.transmissoes != 'null'
      AND JSON_LENGTH(p.transmissoes) > 0
      ORDER BY ordem_exibicao, p.hora ASC
    `, [hoje]);

    const resultadosFormatados = jogosHoje.map(jogo => {
      try {
        return {
          ...jogo,
          transmissoes: jogo.transmissoes ? JSON.parse(jogo.transmissoes) : []
        };
      } catch (e) {
        console.error(`Erro ao processar transmissões do jogo ${jogo.id}:`, e);
        return {
          ...jogo,
          transmissoes: []
        };
      }
    });

    return resultadosFormatados.filter(jogo => jogo.transmissoes.length > 0);
  } catch (error) {
    console.error('Erro ao buscar jogos de hoje:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

const buscarJogoPorId = async (id) => {
  let connection;
  try {
    connection = await db.getConnection();
    const [jogos] = await connection.query(`
      SELECT 
        p.id,
        p.time_casa_nome AS time_casa,
        p.time_visitante_nome AS time_visitante,
        p.time_casa_imagem AS time_casa_logo,
        p.time_visitante_imagem AS time_visitante_logo,
        c.nome_padrao AS competicao,
        p.hora,
        p.placar_casa,
        p.placar_visitante,
        p.tempo,
        p.status,
        p.transmissoes
      FROM partidas p
      INNER JOIN competicoes c ON p.competicao_id = c.id
      WHERE p.id = ?
      LIMIT 1
    `, [id]);

    if (jogos.length === 0) return null;

    const jogo = jogos[0];
    if (jogo) {
      try {
        jogo.transmissoes = jogo.transmissoes ? JSON.parse(jogo.transmissoes) : [];
      } catch (e) {
        console.error(`Erro ao parsear transmissoes do jogo ${jogo.id}:`, e);
        jogo.transmissoes = [];
      }
    }

    return jogo;
  } catch (error) {
    console.error('Erro ao buscar jogo:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

const buscarJogosAoVivo = async () => {
  let connection;
  try {
    connection = await db.getConnection();
    const hoje = getDataBrasileira();

    const [jogosAoVivo] = await connection.query(`
      SELECT 
        p.id,
        p.time_casa_nome,
        p.time_visitante_nome,
        p.time_casa_imagem,
        p.time_visitante_imagem,
        p.placar_casa,
        p.placar_visitante,
        p.tempo,
        p.status,
        p.transmissoes,
        p.data,
        c.nome_padrao AS competicao
      FROM partidas p
      INNER JOIN competicoes c ON p.competicao_id = c.id
      WHERE p.data = ?
        AND (p.status = 'ao-vivo' OR p.status = 'intervalo')
        AND p.tempo != 'ENCERRADO'
        AND p.tempo != 'SUSPENSO' 
        AND p.transmissoes IS NOT NULL 
        AND p.transmissoes != '[]' 
        AND p.transmissoes != 'null'
        AND JSON_LENGTH(p.transmissoes) > 0
      ORDER BY p.hora ASC
      LIMIT 4
    `, [hoje]);

    const resultadosFormatados = jogosAoVivo.map(jogo => {
      try {
        return {
          ...jogo,
          transmissoes: jogo.transmissoes ? JSON.parse(jogo.transmissoes) : []
        };
      } catch (e) {
        console.error(`Erro ao processar transmissões do jogo ${jogo.id}:`, e);
        return {
          ...jogo,
          transmissoes: []
        };
      }
    });

    return resultadosFormatados.filter(jogo => jogo.transmissoes.length > 0);
  } catch (error) {
    console.error('Erro ao buscar jogos ao vivo:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

const verificarCanais = async (transmissoes) => {
  let connection;
  try {
    if (!transmissoes?.length) return [];

    connection = await db.getConnection();
    
    // Criar duas versões de cada transmissão: com e sem (Alternativo)
    const transmissoesFormatadas = transmissoes.flatMap(transmissao => {
      const base = transmissao.trim().toLowerCase();
      const semAlternativo = base.replace(/\(alternativo\)/i, '').trim();
      return [base, semAlternativo];
    });

    // Remover duplicados
    const transmissoesUnicas = [...new Set(transmissoesFormatadas)];

    const placeholders = transmissoesUnicas.map(() => '?').join(',');

    const [canais] = await connection.query(`
      SELECT 
        c.id,
        c.name,
        c.url,
        c.url_alternative,
        c.logo
      FROM canais c
      WHERE LOWER(TRIM(c.name)) IN (${placeholders})
      ORDER BY c.name ASC
    `, transmissoesUnicas);
    return canais;
  } catch (error) {
    console.error('Erro ao buscar canais ao vivo:', error);
    throw error;
  } finally {
    if (connection) connection.release();
  }
};

module.exports = {
  buscarJogoPorId,
  buscarJogosDeHoje,
  verificarCanais,
  buscarJogosAoVivo,
  getDataBrasileira
};