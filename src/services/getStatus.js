const axios = require('axios');
const cheerio = require('cheerio');

async function buscarPlacaresExatos() {
  try {
    const url = 'https://www.placardefutebol.com.br/jogos-de-hoje';
    const headers = {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
    };

    console.log('🔍 Acessando Placar Futebol...');
    const response = await axios.get(url, { headers });
    const $ = cheerio.load(response.data);


    const resultados = [];

    // Extrair competições
    $('#livescore > a').each((i, el) => {
      if ($(el).find('h3').length > 0) {
        resultados.push({
          competicao: $(el).find('h3').text().trim(),
          partidas: []
        });
      }
    });

    // Extrair partidas
    $('#livescore > div').each((i, div) => {
      const competicaoIndex = Math.floor(i / 2);
      if (competicaoIndex < resultados.length) {
        $(div).find('a').each((j, a) => {
            const partida = {
                timeCasa: $(a).find('div > div:nth-child(2) > h5').text().trim() || 'Time Desconhecido',
                timeVisitante: $(a).find('div > div:nth-child(6) > h5').text().trim() || 'Time Desconhecido',
                placarCasa: $(a).find('div > div.w-25.p-1.match-score.d-flex.justify-content-end > h4 > span').text().trim() || '0',
                placarVisitante: $(a).find('div > div.w-25.p-1.match-score.d-flex.justify-content-start > h4 > span').text().trim() || '0',
                tempo: $(a).find('div > div.w-25.p-1.status.text-center > span').text().trim(),
                
                status: (function() {
                  const statusText = $(a).find('div > div.w-25.p-1.status.text-center > span').text().trim();
                  if (statusText.includes("MIN")) return 'ao-vivo';
                  if (statusText.includes("INTERVALO")) return 'intervalo';
                  if (statusText.includes("ENCERRADO")) return 'encerrado';
                  if (statusText.includes("SUSPENSO")) return 'suspenso';
                  if (statusText.includes("HOJE")) return 'aguardando';
                  return 'indefinido';
                })()
              };

          // Validação básica
          if (partida.timeCasa && partida.timeVisitante) {
            resultados[competicaoIndex].partidas.push(partida);
          } else {
            console.log('⚠ Partida inválida ignorada:', partida);
          }
        });
      }
    });

    console.log('✅ Dados extraídos com sucesso!');
    return resultados;

  } catch (error) {
    console.error('❌ Erro ao buscar placares:', error.message);
    throw error;
  }
}

module.exports = { buscarPlacaresExatos };