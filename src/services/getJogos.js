// src/services/getJogos.js
const puppeteer = require('puppeteer');
const db = require('../../config/database');

async function saveToDatabase(partidasData) {
    let connection;
    try {
        connection = await db.getConnection();
        await connection.beginTransaction();
        
        let partidasInseridas = 0;
        let partidasIgnoradas = 0;
        let partidasAtualizadas = 0;

        for (const competicao of partidasData.competicoes) {
            try {
                const competicaoId = await getCompetitionId(competicao.competicao, connection);

                for (const partida of competicao.partidas) {
                    try {
                        const [dia, mes, ano] = partida.data.split('/');
                        const dataSQL = `${ano}-${mes}-${dia}`;

                        const [rows] = await connection.query(
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
                            ]
                        );
                        const partidaExistente = rows[0];

                        if (partidaExistente) {
                            const needsUpdate = 
                                partidaExistente.rodada !== partida.rodada ||
                                partidaExistente.hora !== partida.hora;

                            if (needsUpdate) {
                                await connection.query(
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
                                    ]
                                );
                                partidasAtualizadas++;
                                console.log(`   - Partida atualizada: ${partida.timeCasa.nome} vs ${partida.timeVisitante.nome} em ${dataSQL}`);
                            } else {
                                partidasIgnoradas++;
                                console.log(`   - Partida já existe: ${partida.timeCasa.nome} vs ${partida.timeVisitante.nome} em ${dataSQL}`);
                            }
                            continue;
                        }

                        await connection.query(
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
                            ]
                        );
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
        
        await connection.commit();
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
        if (connection) await connection.rollback();
        console.error('Erro ao salvar no banco:', error);
        return {
            success: false,
            error: error.message
        };
    } finally {
        if (connection) connection.release();
    }
}

async function findCompetitionByName(competitionName, connection) {
    try {
        // Busca no banco por qualquer competição que tenha esse nome em seu JSON
        const [rows] = await connection.query(
            `SELECT id, nome, nome_padrao 
            FROM competicoes
            WHERE JSON_EXTRACT(nome, '$.nomes') LIKE ? 
            OR nome_padrao LIKE ?
            LIMIT 1`,
            [`%${competitionName}%`, `%${competitionName}%`]
        );
        
        if (rows.length > 0) {
            const compRow = rows[0];
            // Verifica se o campo nome é uma string JSON
            const nomes = typeof compRow.nome === 'string' ? JSON.parse(compRow.nome).nomes : compRow.nome.nomes;
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

async function getCompetitionId(competitionName, connection) {
    try {
        // Primeiro tenta encontrar a competição com o nome exato
        const existingComp = await findCompetitionByName(competitionName, connection);

        if (existingComp) {
            console.log(`Competição encontrada: ${existingComp.nome_padrao} (ID: ${existingComp.id})`);
            return existingComp.id;
        }

        // Se não encontrou, cria nova competição com esse nome
        const nomesParaSalvar = {
            nomes: [competitionName],
            padrao: competitionName
        };

        const [result] = await connection.query(
            'INSERT INTO competicoes (nome, nome_padrao) VALUES (?, ?)',
            [JSON.stringify(nomesParaSalvar), competitionName]
        );

        console.log(`Nova competição cadastrada: ${competitionName} (ID: ${result.insertId})`);
        return result.insertId;

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
        headless: true,
        executablePath: '/usr/bin/chromium-browser', // Caminho para o Chromium/Chrome
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage' // Útil para sistemas com pouca memória
        ]
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
        await page.waitForSelector('#routes-wrapper > div:nth-child(4) > div > div', {
            timeout: 10000
        });
        // Verificar quantas competições existem
        const competicoesCount = await page.$$eval(
            '#routes-wrapper > div:nth-child(4) > div > div > div',
            divs => divs.length
        );

        console.log(`Encontradas ${competicoesCount} competições`);

        const allPartidas = [];

        // Iterar sobre cada competição
        for (let i = 1; i <= competicoesCount; i++) {
            const competicaoSelector = `#routes-wrapper > div:nth-child(4) > div > div > div:nth-child(${i})`;
            
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
                    // Dentro da função getjogos(), onde processamos cada partida:
                    const partidaData = await page.evaluate((selector, formattedDate) => {
                        // Função auxiliar para tentar múltiplos seletores
                        const trySelectors = (selectors, attribute = 'textContent') => {
                            for (const sel of selectors) {
                                try {
                                    const el = document.querySelector(`${selector} ${sel}`);
                                    if (el) {
                                        return attribute === 'textContent' ? el.textContent.trim() : el.getAttribute(attribute);
                                    }
                                } catch (e) {
                                    continue;
                                }
                            }
                            return null;
                        };
                    
                        // Seletores alternativos para cada campo
                        const rodadaSelectors = [
                            'div > div.sc-kpDqfm.fsWuRt > div:nth-child(1) > div > span:nth-child(1)'
                        ];
                        
                        const horaSelectors = [
                            'div > div.sc-kpDqfm.fsWuRt > div:nth-child(2) > div > span:nth-child(2)'
                        ];
                        
                        const timeCasaNomeSelectors = [
                            'div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.ivQJob > div > span',
                            'div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.bFZpgo > div > span'
                        ];
                        
                        const timeCasaImgSelectors = [
                            'div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.ivQJob > div > img',
                            'div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.bFZpgo > div.sc-koXPp.fQeBdq > img'
                        ];
                        
                        const timeVisitanteNomeSelectors = [
                            'div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.epSQAH > div > span',
                            'div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.gsaEwE > div.sc-koXPp.fQeBdq > span'
                        ];
                        
                        const timeVisitanteImgSelectors = [
                            'div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.epSQAH > div > img',
                            'div > div.sc-cwHptR.clodXQ > div > div.sc-bmzYkS.gsaEwE > div.sc-koXPp.fQeBdq > img'
                        ];
                    
                        return {
                            rodada: trySelectors(rodadaSelectors),
                            hora: trySelectors(horaSelectors),
                            data: formattedDate,
                            timeCasa: {
                                nome: trySelectors(timeCasaNomeSelectors),
                                imagem: trySelectors(timeCasaImgSelectors, 'src')
                            },
                            timeVisitante: {
                                nome: trySelectors(timeVisitanteNomeSelectors),
                                imagem: trySelectors(timeVisitanteImgSelectors, 'src')
                            }
                        };
                    }, partidaSelector, dateStr);
                    
                    // Adicionar (F) para competições femininas
                    if (nomeCompeticao && /feminino|feminina|women|womens|female/i.test(nomeCompeticao)) {
                        if (partidaData.timeCasa.nome && !partidaData.timeCasa.nome.endsWith('(F)')) {
                            partidaData.timeCasa.nome = `${partidaData.timeCasa.nome} (F)`;
                        }
                        if (partidaData.timeVisitante.nome && !partidaData.timeVisitante.nome.endsWith('(F)')) {
                            partidaData.timeVisitante.nome = `${partidaData.timeVisitante.nome} (F)`;
                        }
                    }
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

module.exports = {getjogos};