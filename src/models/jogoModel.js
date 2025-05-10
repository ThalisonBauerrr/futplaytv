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
      AND NOT (p.status = 'aguardando' AND p.hora <= (CURRENT_TIME() - INTERVAL 3 HOUR))
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

const verificarCanais = async (transmissoes, jogoId) => {
  let connection;
  try {
    connection = await db.getConnection();

    // 1. Verifica primeiro na tabela `canais_jogos` pelo `id_partida`
    const [canaisJogos] = await connection.query(`
      SELECT 
        idcanais_jogos,
        name,
        url
      FROM canais_jogos
      WHERE id_partida = ?
    `, [jogoId]);

    // Se encontrou registros, retorna no formato esperado
    if (canaisJogos?.length > 0) {
      return canaisJogos.map((canal) => ({
        id: canal.idcanais_jogos, // Mapeia `idcanais_jogos` para `id` (caso necessário)
        name: canal.name,
        urls: [{ url: canal.url, index: 0 }], // Assume que só há uma URL (índice 0)
        logo: null // Se não tiver logo na tabela, pode ser null ou adicionar se existir
      }));
    }

    // 2. Se não encontrou em `canais_jogos`, faz a busca normal nos `canais`
    if (!transmissoes?.length) return [];

    const termosBusca = transmissoes.flatMap((transmissao) => {
      const nomeBase = transmissao.trim().toLowerCase();
      const semAlternativo = nomeBase.replace(/\(alternativo\)/i, '').trim();
      return [nomeBase, semAlternativo];
    });

    const termosUnicos = [...new Set(termosBusca)].filter(Boolean);

    const [canais] = await connection.query(`
      SELECT 
        id, 
        name,
        url_0, url_1, url_2, url_3, 
        url_4, url_5, url_6,
        logo
      FROM canais
      WHERE LOWER(TRIM(name)) IN (${termosUnicos.map(() => '?').join(',')})
      ORDER BY name ASC
    `, termosUnicos);

    return canais.map((canal) => {
      const urls = [];
      for (let i = 0; i <= 6; i++) {
        const url = canal[`url_${i}`];
        if (url?.trim()) urls.push({ url, index: i });
      }
      return { ...canal, urls };
    });

  } catch (error) {
    console.error('Erro ao buscar canais ao vivo:', error);
    throw error;
  } finally {
    connection?.release();
  }
};

module.exports = {
  buscarJogoPorId,
  buscarJogosDeHoje,
  verificarCanais,
  buscarJogosAoVivo,
  getDataBrasileira
};