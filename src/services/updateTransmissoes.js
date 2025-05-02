const puppeteer = require('puppeteer');
const db = require('../../config/database');

async function getPartidasdeHoje() {
    let connection;
    try {
        connection = await db.getConnection();
        
        // Configurar a data de HOJE
        const today = new Date();
        const day = String(today.getDate()).padStart(2, '0');
        const month = String(today.getMonth() + 1).padStart(2, '0');
        const year = today.getFullYear();
        const dateStr = `${day}/${month}/${year}`;         // Formato DD/MM/YYYY
        const urlDateStr = `${day}-${month}-${year}`;      // Formato DD-MM-YYYY para URL
        const dbDateStr = `${year}-${month}-${day}`;       // Formato YYYY-MM-DD para o banco

        console.log(`Buscando partidas para hoje: ${dbDateStr}`);
        
        const [rows] = await connection.query(
            `SELECT id, time_casa_nome, time_visitante_nome, hora 
             FROM partidas 
             WHERE DATE(data) = ?`,
            [dbDateStr]
        );

        console.log(`Encontradas ${rows.length} partidas para hoje`);
        return rows;
    } catch (error) {
        console.error('Erro ao buscar partidas:', error);
        throw error;
    } finally {
        if (connection) connection.release();
    }
}

async function buscarTransmissoesNoSite(page, partida) {
    const cards = await page.$$('#futnatv > div > div.row.mt-10 > div.col-sm-12.col-md-12.col-lg-7 > div:nth-child(2) > div:nth-child(2) > div');

    for (const card of cards) {
        try {
            // Extrair horário
            const horarioElement = await card.$('div.row > div.col-3.col-sm-2.box_time_live > a > div.box_time');
            const horarioSite = horarioElement ? (await page.evaluate(el => el.textContent, horarioElement)).trim() : '';
            
            // Verificar se é destaque
            const destaqueElement = await card.$('div.row > div.col-3.col-sm-2.box_time_live > a > div.cardtime.badge.p-1.mb-1.live.align-items-center > div');
            const isDestaque = destaqueElement !== null;
            
            // Extrair nomes dos times
            const timeCasaElement = await card.$('div.row > div.col-9.col-sm-10 > a > div:nth-child(1)');
            const timeVisitanteElement = await card.$('div.row > div.col-9.col-sm-10 > a > div:nth-child(2)');
            
            // Verificar se os elementos existem e têm conteúdo
            if (!timeCasaElement || !timeVisitanteElement) continue;
            
            const nomeTimeCasa = (await page.evaluate(el => el.textContent, timeCasaElement)).trim();
            const nomeTimeVisitante = (await page.evaluate(el => el.textContent, timeVisitanteElement)).trim();

            // Verificar se os nomes dos times são válidos
            if (!nomeTimeCasa || !nomeTimeVisitante) continue;

            // Verificar se os nomes da partida são válidos
            if (!partida.time_casa_nome || !partida.time_visitante_nome) continue;

            // Comparação segura com verificações de null/undefined
            const mesmaHora = horarioSite && partida.hora && 
                            (horarioSite.includes(partida.hora) || partida.hora.includes(horarioSite));
            
            const mesmoTimeCasa = nomeTimeCasa && partida.time_casa_nome && 
                                (nomeTimeCasa.includes(partida.time_casa_nome) || partida.time_casa_nome.includes(nomeTimeCasa));
            
            const mesmoTimeVisitante = nomeTimeVisitante && partida.time_visitante_nome && 
                                    (nomeTimeVisitante.includes(partida.time_visitante_nome) || partida.time_visitante_nome.includes(nomeTimeVisitante));

            if (mesmaHora && (mesmoTimeCasa || mesmoTimeVisitante)) {
                // Extrair link e canais
                const linkElement = await card.$('a');
                const linkPartida = linkElement ? await page.evaluate(el => el.href, linkElement) : null;
                
                const canaisElements = await card.$$('div.container.text-center > a > div > div > span');
                const canais = await Promise.all(
                    canaisElements.map(el => page.evaluate(e => e.textContent.trim(), el))
                );

                console.log('Match encontrado:', {
                    banco: {
                        timeCasa: partida.time_casa_nome,
                        timeVisitante: partida.time_visitante_nome,
                        hora: partida.hora
                    },
                    site: {
                        timeCasa: nomeTimeCasa,
                        timeVisitante: nomeTimeVisitante,
                        hora: horarioSite,
                        destaque: isDestaque
                    }
                });

                return { 
                    canais, 
                    linkPartida,
                    isDestaque,
                    matchDetails: {
                        timeCasaSite: nomeTimeCasa,
                        timeVisitanteSite: nomeTimeVisitante,
                        horarioSite,
                        horarioBanco: partida.hora,
                        isDestaque: isDestaque
                    }
                };
            }
        } catch (error) {
            console.error('Erro ao processar card:', error);
            continue;
        }
    }
    return { canais: [], linkPartida: null, isDestaque: false };
}

async function updateTransmissoes() {
    let browser;
    let connection;

    try {
        console.log('Iniciando processo de atualização de transmissões...');
        
        connection = await db.getConnection();
        const partidas = await getPartidasdeHoje();
        
        if (partidas.length === 0) {
            console.log('Nenhuma partida encontrada para hoje. Encerrando.');
            return;
        }

        console.log('Iniciando navegador...');
        browser = await puppeteer.launch({
            headless: true,
            executablePath: '/usr/bin/chromium-browser',
            args: [
              '--no-sandbox',
              '--disable-setuid-sandbox',
              '--disable-dev-shm-usage',  // Recomendado para servidores
              '--single-process'         // Pode ajudar em sistemas com poucos recursos
            ],
            timeout: 300000
          });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log('Acessando FutebolNaTV...');
        await page.goto('https://www.futebolnatv.com.br/jogos-hoje/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('Página carregada. Buscando transmissões...');
        await page.waitForSelector('#futnatv > div > div.row.mt-10', { timeout: 15000 });

        for (const partida of partidas) {
            try {
                console.log(`\nProcessando: ${partida.time_casa_nome} vs ${partida.time_visitante_nome} às ${partida.hora}`);
                
                const result = await buscarTransmissoesNoSite(page, partida);
                
                if (result.canais.length > 0 || result.linkPartida) {
                    console.log('Detalhes do match:', result.matchDetails);

                    // Atualizar os dados da partida no MySQL
                    await connection.query(
                        `UPDATE partidas 
                         SET transmissoes = ?, 
                             link_partida = COALESCE(?, link_partida),
                             destac = ?,
                             updated_at = CURRENT_TIMESTAMP
                         WHERE id = ?`,
                        [
                            JSON.stringify(result.canais),
                            result.linkPartida,
                            result.isDestaque,
                            partida.id
                        ]
                    );
                    console.log(`✅ Atualizada partida ID ${partida.id}`);
                } else {
                    console.log('ℹ️ Nenhuma transmissão encontrada para esta partida');
                }
            } catch (error) {
                console.error(`❌ Erro na partida ${partida.id}:`, error);
            }
        }

        console.log('\n🎉 Atualização concluída com sucesso!');
    } catch (error) {
        console.error('❌ Erro geral:', error);
    } finally {
        if (connection) connection.release();
        if (browser) {
            await browser.close();
        }
    }
}

module.exports = {updateTransmissoes};