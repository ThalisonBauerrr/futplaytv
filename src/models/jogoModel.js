const db = require('../../config/database');


function getDataBrasileira() {
  const agora = new Date();
  
  // Ajusta para o fuso horário de Brasília (UTC-3)
  const offsetUTC = agora.getTimezoneOffset() * 60000; // Offset local em ms
  const offsetBRT = -3 * 3600000; // BRT = UTC-3 (3 horas em ms)
  const agoraBRT = new Date(agora.getTime() + offsetUTC + offsetBRT);
  
  // Formata como YYYY-MM-DD
  const ano = agoraBRT.getFullYear();
  const mes = String(agoraBRT.getMonth() + 1).padStart(2, '0');
  const dia = String(agoraBRT.getDate()).padStart(2, '0');
  
  return `${ano}-${mes}-${dia}`;
}
const buscarJogosDeHoje = async () => {
  try {
    const hoje = getDataBrasileira();
    const jogosHoje = await db.all(`
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
          WHEN p.status = 'aguardando' AND time(p.hora) > time('now') THEN 2
          WHEN p.status = 'intervalo' THEN 3
          WHEN p.status = 'aguardando' THEN 4
          ELSE 4
        END AS ordem_exibicao
      FROM partidas p
      INNER JOIN competicoes c ON p.competicao_id = c.id
      WHERE p.data = ?
      AND p.tempo != 'ENCERRADO'  -- EXCLUINDO JOGOS ENCERRADOS
      AND p.tempo != 'SUSPENSO' 
      AND p.transmissoes IS NOT NULL 
      AND p.transmissoes != '[]' 
      AND p.transmissoes != 'null'
      AND json_array_length(p.transmissoes) > 0
      ORDER BY ordem_exibicao, p.hora ASC
    `, [hoje]);

    const resultadosFormatados = jogosHoje.map(jogo => {
      try {
        return {
          ...jogo,
          transmissoes: jogo.transmissoes ? JSON.parse(jogo.transmissoes.replace(/\\"/g, '"')) : []
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
  }
};

const buscarJogoPorId = async (id) => {
  try {
    const jogo = await new Promise((resolve, reject) => {
      db.get(`
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
      `, [id], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });

    if (jogo) {
      jogo.transmissoes = jogo.transmissoes ? JSON.parse(jogo.transmissoes.replace(/\\"/g, '"')) : [];
    }

    return jogo;
  } catch (error) {
    console.error('Erro ao buscar jogo:', error);
    throw error;
  }
};

const buscarJogosAoVivo = async () => {
  try {
    const hoje = getDataBrasileira();
    console.log(hoje)
    const jogosAoVivo = await db.all(`
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
        p.data
      FROM partidas p
      WHERE p.data = ?
        AND (p.status = 'ao-vivo' OR p.status = 'intervalo')
        AND p.tempo != 'ENCERRADO'  -- Excluindo jogos encerrados
        AND p.tempo != 'SUSPENSO' 
        AND p.transmissoes IS NOT NULL 
        AND p.transmissoes != '[]' 
        AND p.transmissoes != 'null'
        AND json_array_length(p.transmissoes) > 0
      ORDER BY p.hora ASC  -- Ordenando pelos horários de início dos jogos
      LIMIT 4  -- Limitando a 4 jogos
    `, [hoje]); // Passando a data 'hoje' como parâmetro para a query

    // Processando os jogos ao vivo para formatar as transmissões
    const resultadosFormatados = jogosAoVivo.map(jogo => {
      try {
        return {
          ...jogo,
          transmissoes: jogo.transmissoes ? JSON.parse(jogo.transmissoes.replace(/\\"/g, '"')) : []
        };
      } catch (e) {
        console.error(`Erro ao processar transmissões do jogo ${jogo.id}:`, e);
        return {
          ...jogo,
          transmissoes: []
        };
      }
    });

    // Retorna apenas os jogos com transmissões válidas
    return resultadosFormatados.filter(jogo => jogo.transmissoes.length > 0);
  } catch (error) {
    console.error('Erro ao buscar jogos ao vivo:', error);
    throw error;
  }
};

const verificarCanais = async (transmissoes) => {
  try {
    // Verificar se existem transmissões
    if (!transmissoes?.length) return [];

    // Remover "(Alternativo)" e comparar tudo em minúsculas, mas manter os espaços
    const transmissoesFormatadas = transmissoes.map((transmissao) => {
      return transmissao
        .replace(/\(Alternativo\)/i, '')  // Remove "(Alternativo)" (case-insensitive)
        .toLowerCase();                  // Converte tudo para minúsculas
    });

    console.log("Transmissões formatadas:", transmissoesFormatadas);  // Exemplo: ['nossofutebol', 'dazn']

    // Depuração: Mostrar a consulta SQL antes de ser executada
    const query = `
      SELECT 
        c.name,
        c.url,
        c.url_alternative
      FROM canais c
      WHERE LOWER(c.name) IN (${transmissoesFormatadas.map(() => '?').join(',')})
      ORDER BY c.name ASC
    `;
    console.log("Consulta SQL:", query);

    // Consulta SQL para buscar canais ao vivo
    const canaisAoVivo = await db.all(query, transmissoesFormatadas);  // Passando as transmissões formatadas para a consulta

    // Verificação do que foi retornado
    console.log("Canais encontrados:", canaisAoVivo);

    // Verifica se não encontrou nenhum canal
    if (canaisAoVivo.length === 0) {
      console.log("Nenhum canal encontrado.");
    }

    return canaisAoVivo;

  } catch (error) {
    console.error('Erro ao buscar canais ao vivo:', error);
    throw error;
  }
};


module.exports = {
  buscarJogoPorId,
  buscarJogosDeHoje,
  verificarCanais,
  buscarJogosAoVivo
};