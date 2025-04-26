// src/services/getJogos.js
const puppeteer = require('puppeteer');
const db = require('../../config/database');

async function saveToDatabase(partidasData) {
    try {
        await db.run('BEGIN TRANSACTION');
        
        let partidasInseridas = 0;
        let partidasIgnoradas = 0;
        let partidasAtualizadas = 0;

        for (const competicao of partidasData.competicoes) {
            try {
                const competicaoId = await getCompetitionId(competicao.competicao);

                for (const partida of competicao.partidas) {
                    try {
                        const [dia, mes, ano] = partida.data.split('/');
                        const dataSQL = `${ano}-${mes}-${dia}`;

                        const partidaExistente = await new Promise((resolve, reject) => {
                            db.get(
                                `SELECT id, rodada, hora FROM partidas 
                                WHERE competicao_id = ? 
                                AND data = ? 
                                AND time_casa_nome = ? 
                                AND time_visitante_nome = ?`,
                                [
                                    competicaoId,
                                    dataSQL,
                                    partida.timeCasa.nome,
                                    partida.timeVisitante.nome
                                ],
                                (err, row) => {
                                    if (err) return reject(err);
                                    resolve(row);
                                }
                            );
                        });

                        if (partidaExistente) {
                            const needsUpdate = 
                                partidaExistente.rodada !== partida.rodada ||
                                partidaExistente.hora !== partida.hora;

                            if (needsUpdate) {
                                await new Promise((resolve, reject) => {
                                    db.run(
                                        `UPDATE partidas SET
                                            rodada = ?,
                                            hora = ?,
                                            time_casa_imagem = ?,
                                            time_visitante_imagem = ?,
                                            updated_at = CURRENT_TIMESTAMP
                                        WHERE id = ?`,
                                        [
                                            partida.rodada,
                                            partida.hora,
                                            partida.timeCasa.imagem,
                                            partida.timeVisitante.imagem,
                                            partidaExistente.id
                                        ],
                                        (err) => {
                                            if (err) return reject(err);
                                            resolve();
                                        }
                                    );
                                });
                                partidasAtualizadas++;
                                console.log(`   - Partida atualizada: ${partida.timeCasa.nome} vs ${partida.timeVisitante.nome} em ${dataSQL}`);
                            } else {
                                partidasIgnoradas++;
                                console.log(`   - Partida já existe: ${partida.timeCasa.nome} vs ${partida.timeVisitante.nome} em ${dataSQL}`);
                            }
                            continue;
                        }

                        await new Promise((resolve, reject) => {
                            db.run(
                                `INSERT INTO partidas (
                                    competicao_id, rodada, hora, data,
                                    time_casa_nome, time_visitante_nome,
                                    time_casa_imagem, time_visitante_imagem
                                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
                                [
                                    competicaoId,
                                    partida.rodada,
                                    partida.hora,
                                    dataSQL,
                                    partida.timeCasa.nome,
                                    partida.timeVisitante.nome,
                                    partida.timeCasa.imagem,
                                    partida.timeVisitante.imagem
                                ],
                                (err) => {
                                    if (err) return reject(err);
                                    resolve();
                                }
                            );
                        });
                        partidasInseridas++;
                        console.log(`   - Nova partida inserida: ${partida.timeCasa.nome} vs ${partida.timeVisitante.nome} em ${dataSQL}`);
                        
                    } catch (partidaError) {
                        console.error('Erro ao processar partida:', partidaError);
                        continue;
                    }
                }
            } catch (competicaoError) {
                console.error('Erro ao processar competição:', competicaoError);
                continue;
            }
        }
        
        await db.run('COMMIT');
        console.log(`\nResumo do salvamento:
          - Partidas novas inseridas: ${partidasInseridas}
          - Partidas atualizadas: ${partidasAtualizadas}
          - Partidas duplicadas ignoradas: ${partidasIgnoradas}
        `);
        return {
            success: true,
            inserted: partidasInseridas,
            updated: partidasAtualizadas,
            ignored: partidasIgnoradas
        };
    } catch (error) {
        await db.run('ROLLBACK');
        console.error('Erro ao salvar no banco:', error);
        return {
            success: false,
            error: error.message
        };
    }
}
async function findCompetitionByName(competitionName) {
    try {
      // Busca no banco por qualquer competição que tenha esse nome em seu JSON
      const query = `
        SELECT id, nome, nome_padrao 
        FROM competicoes
        WHERE json_extract(nome, '$.nomes') LIKE ?
        LIMIT 1
      `;
      
      const compRow = await new Promise((resolve, reject) => {
        db.get(query, [`%"${competitionName}"%`], (err, row) => {
          if (err) return reject(err);
          resolve(row);
        });
      });
  
      if (compRow) {
        const nomes = JSON.parse(compRow.nome).nomes;
        return {
          id: compRow.id,
          nome_padrao: compRow.nome_padrao,
          nomes: nomes
        };
      }
      return null;
    } catch (error) {
      console.error('Erro ao buscar competição:', error);
      return null;
    }
}
async function getCompetitionId(competitionName) {
    try {
      // Primeiro tenta encontrar a competição com o nome exato
      const existingComp = await findCompetitionByName(competitionName);
  
      if (existingComp) {
        console.log(`Competição encontrada: ${existingComp.nome_padrao} (ID: ${existingComp.id})`);
        return existingComp.id;
      }
  
      // Se não encontrou, cria nova competição com esse nome
      const nomesParaSalvar = {
        nomes: [competitionName],
        padrao: competitionName
      };
  
      const result = await new Promise((resolve, reject) => {
        db.run(
          'INSERT INTO competicoes (nome, nome_padrao) VALUES (?, ?)',
          [JSON.stringify(nomesParaSalvar), competitionName],
          function(err) {
            if (err) return reject(err);
            resolve(this.lastID);
          }
        );
      });
  
      console.log(`Nova competição cadastrada: ${competitionName} (ID: ${result})`);
      return result;
  
    } catch (error) {
      console.error(`Erro ao processar competição ${competitionName}:`, error);
      throw error;
    }
}
async function getjogos() {
    console.log('Iniciando scraping de partidas de futebol...');
    
    // Configurar a data de HOJE
    const today = new Date();
    
    const day = String(today.getDate()).padStart(2, '0');
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const year = today.getFullYear();
    const dateStr = `${day}/${month}/${year}`;         // Formato DD/MM/YYYY
    const urlDateStr = `${day}-${month}-${year}`;      // Formato DD-MM-YYYY para URL
    const dbDateStr = `${year}-${month}-${day}`;       // Formato YYYY-MM-DD para o banco

    console.log(`Buscando partidas para hoje: ${dateStr}`);

    const browser = await puppeteer.launch({
        headless: false,
        args: ['--no-sandbox', '--disable-setuid-sandbox']
    });
    const page = await browser.newPage();
    
    try {
        // Acessar a página com a data de hoje
        await page.goto(`https://ge.globo.com/agenda/#/futebol/${urlDateStr}`, {
            waitUntil: 'networkidle2',
            timeout: 30000
        });

        console.log('Página carregada, buscando dados...');

        // Esperar o carregamento dos dados
        await page.waitForSelector('#routes-wrapper > div:nth-child(5) > div > div', {
            timeout: 10000
        });

        // Verificar quantas competições existem
        const competicoesCount = await page.$$eval(
            '#routes-wrapper > div:nth-child(5) > div > div > div',
            divs => divs.length
        );

        console.log(`Encontradas ${competicoesCount} competições`);

        const allPartidas = [];

        // Iterar sobre cada competição
        for (let i = 1; i <= competicoesCount; i++) {
            const competicaoSelector = `#routes-wrapper > div:nth-child(5) > div > div > div:nth-child(${i})`;
            
            // Pegar nome da competição
            const nomeCompeticao = await page.$eval(
                `${competicaoSelector} > a > span`,
                span => span.textContent.trim()
            ).catch(() => null);

            if (!nomeCompeticao) continue;

            console.log(`\nProcessando competição: ${nomeCompeticao}`);

            // Verificar se tem botão "Mostrar mais" e clicar
            const hasButton = await page.$(`${competicaoSelector} > div > button`).then(btn => !!btn);
            if (hasButton) {
                console.log(' - Clicando em "Mostrar mais"...');
                await page.click(`${competicaoSelector} > div > button`);
                await new Promise(resolve => setTimeout(resolve, 1000));
            }

            // Verificar quantas partidas existem nesta competição
            const partidasCount = await page.$$eval(
                `${competicaoSelector} > div > a`,
                anchors => anchors.length
            );

            console.log(` - Encontradas ${partidasCount} partidas`);

            const partidasCompeticao = [];

            // Iterar sobre cada partida
            for (let j = 1; j <= partidasCount; j++) {
                const partidaSelector = `${competicaoSelector} > div > a:nth-child(${j})`;

                try {
                    const partidaData = await page.evaluate((selector, formattedDate) => {
                        const getText = (subSelector) => {
                            const el = document.querySelector(`${selector} ${subSelector}`);
                            return el ? el.textContent.trim() : null;
                        };
                    
                        const getSrc = (subSelector) => {
                            const el = document.querySelector(`${selector} ${subSelector}`);
                            return el ? el.getAttribute('src') : null;
                        };
                    
                        return {
                            rodada: getText('div > div.sc-kpDqfm.fsWuRt > div:nth-child(1) > div > span:nth-child(1)'),
                            hora: getText('div > div.sc-kpDqfm.fsWuRt > div:nth-child(2) > div > span:nth-child(2)'),
                            data: formattedDate,
                            timeCasa: {
                                nome: getText('div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.ivQJob > div > span'),
                                imagem: getSrc('div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.ivQJob > div > img')
                            },
                            timeVisitante: {
                                nome: getText('div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.epSQAH > div > span'),
                                imagem: getSrc('div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.epSQAH > div > img')
                            }
                        };
                    }, partidaSelector, dateStr);
                    
                    console.log(`   - ${partidaData.timeCasa.nome} vs ${partidaData.timeVisitante.nome}`);
                    console.log(`     Data: ${partidaData.data} ${partidaData.hora}`);
                    if (partidaData.link) {
                        console.log(`     Link: ${partidaData.link}`);
                    }
                    partidasCompeticao.push(partidaData);
                } catch (error) {
                    console.error(`   - Erro ao processar partida ${j}:`, error.message);
                    continue;
                }
            }

            allPartidas.push({
                competicao: nomeCompeticao,
                partidas: partidasCompeticao
            });
        }

        const result = {
            data: dateStr,
            competicoes: allPartidas
        };

        // Salvar no banco de dados com validação
        const saveResult = await saveToDatabase(result);
        
        await browser.close();
        
        console.log('\n=== RESUMO FINAL ===');
        console.log(`Data: ${dateStr}`);
        console.log(`Total de competições: ${allPartidas.length}`);
        console.log(`Total de partidas encontradas: ${allPartidas.reduce((acc, curr) => acc + curr.partidas.length, 0)}`);
        console.log(`Partidas novas inseridas: ${saveResult.inserted}`);
        console.log(`Partidas atualizadas: ${saveResult.updated}`);
        console.log(`Partidas duplicadas ignoradas: ${saveResult.ignored}`);
        
        return {
            ...result,
            databaseResult: saveResult
        };
    } catch (error) {
        console.error('Erro durante o scraping:', error);
        await browser.close();
        throw error;
    }
}

module.exports = {getjogos}
