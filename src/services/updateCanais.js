const puppeteer = require('puppeteer');
const db = require('../../config/database');

async function atualizarCanais() {
    let browser;
    let stats = {
        total: 0,
        updated: 0,
        inserted: 0,
        skipped: 0,
        errors: 0
    };

    try {
        console.log('Iniciando atualização de canais...');

        browser = await puppeteer.launch({
            headless: true, // Mude para false durante os testes
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            timeout: 30000
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log('Acessando embedcanaistv.com...');
        await page.goto('https://embedcanaistv.com/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('Página carregada. Buscando canais...');
        await page.waitForSelector('#primary > section > div > div > div.col-lg-8 > div > div.content-part.p-0', { timeout: 15000 });

        const cards = await page.$$('#primary > section > div > div > div.col-lg-8 > div > div.content-part.p-0 > div:nth-child(3) > div');

        stats.total = cards.length;
        console.log(`\nTotal de canais encontrados: ${stats.total}`);

        for (const [index, card] of cards.entries()) {
            let nome, url;
            try {
                console.log(`\nProcessando canal ${index + 1}/${stats.total}...`);

                // Extrair nome do canal
                const nomeElement = await card.$('div > h3');
                nome = nomeElement ? (await page.evaluate(el => el.textContent, nomeElement)).trim() : null;

                // Extrair URL do iframe
                const urlElement = await card.$('div > p:nth-child(4) > input[type=text]');
                let urlValue = urlElement ? (await page.evaluate(el => el.value, urlElement)) : null;

                if (urlValue) {
                    const srcMatch = urlValue.match(/src="([^"]+)"/);
                    url = srcMatch ? srcMatch[1] : null;
                }

                if (!nome || !url) {
                    console.log('ℹ️ Dados incompletos, pulando...');
                    stats.skipped++;
                    continue;
                }

                console.log(`Processando: ${nome} - ${url}`);
                const canaisEncontrados = await db.all(
                    `SELECT id FROM canais WHERE LOWER(name) = LOWER(?)`,
                    [nome.toLowerCase()]
                );

                console.log('Resultado da busca:', canaisEncontrados);

                if (canaisEncontrados && canaisEncontrados.length > 0) {
                    canaisEncontrados.forEach(canal => {
                        try {
                            console.log('ID do canal encontrado:', canal.id);
                            db.runAsync('UPDATE canais SET url = ? WHERE id = ?', [url, canal.id]);
                            stats.updated++;
                            console.log(`✅ Canal atualizado: ${nome}`);
                        } catch (updateError) {
                            console.error(`❌ Erro ao atualizar ${nome}:`, updateError);
                            stats.errors++;
                        }
                    });
                } else {
                    try {
                        await db.runAsync('INSERT INTO canais (name, url, category) VALUES (?, ?, ?)', [nome, url, 'Esportes']);
                        stats.inserted++;
                        console.log(`➕ Novo canal inserido: ${nome}`);
                    } catch (insertError) {
                        console.error(`❌ Erro ao inserir ${nome}:`, insertError);
                        stats.errors++;
                    }
                }
            } catch (error) {
                console.error(`❌ Erro ao processar canal ${index + 1} (${nome || 'sem nome'}):`, error);
                stats.errors++;
            }
        }

    } catch (error) {
        console.error('❌ Erro geral:', error);
        stats.errors++;
    } finally {
        if (browser) {
            await browser.close();
        }

        // Relatório final
        console.log('\n📊 Relatório Final:');
        console.log(`🔍 Total de canais processados: ${stats.total}`);
        console.log(`🔄 Canais atualizados: ${stats.updated}`);
        console.log(`🆕 Canais inseridos: ${stats.inserted}`);
        console.log(`⏭️ Canais ignorados: ${stats.skipped}`);
        console.log(`❌ Erros encontrados: ${stats.errors}`);
        console.log('🎉 Operação concluída!');
    }
}

async function atualizarUrlAlternativa() {
    let browser;
    let stats = {
        total: 0,
        updated: 0,
        inserted: 0,
        errors: 0
    };

    try {
        console.log('\nIniciando atualização de URL alternativa dos canais...');

        browser = await puppeteer.launch({
            headless: true, // Mude para false durante os testes
            args: ['--no-sandbox', '--disable-setuid-sandbox'],
            timeout: 30000
        });

        const page = await browser.newPage();
        await page.setViewport({ width: 1280, height: 800 });

        console.log('Acessando reidoscanais.cc...');
        await page.goto('https://reidoscanais.cc/', {
            waitUntil: 'networkidle2',
            timeout: 60000
        });

        console.log('Página carregada. Buscando canais...');
        await page.waitForSelector('#canais-container', { timeout: 15000 });

        const cards = await page.$$('#canais-container > div');

        stats.total = cards.length;
        console.log(`\nTotal de canais encontrados: ${stats.total}`);

        for (const [index, card] of cards.entries()) {
            let nome, linkPagina;
            try {
                console.log(`\nProcessando canal ${index + 1}/${stats.total}...`);

                // Extrair nome do canal
                const nomeElement = await card.$('div.informacoes > h2');
                nome = nomeElement ? (await page.evaluate(el => el.textContent, nomeElement)).trim() : null;

                // Extrair link da página do canal
                const linkElement = await card.$('div.informacoes > a');
                linkPagina = linkElement ? (await page.evaluate(el => el.href, linkElement)).trim() : null;

                if (!nome || !linkPagina) {
                    console.log('ℹ️ Dados incompletos, pulando...');
                    stats.skipped++;
                    continue;
                }

                console.log(`Processando: ${nome} - Link da página: ${linkPagina}`);

                const canaisEncontrados = await db.all(
                    `SELECT id FROM canais WHERE LOWER(name) = LOWER(?)`,
                    [nome.toLowerCase()]
                );

                console.log('Resultado da busca:', canaisEncontrados);

                if (canaisEncontrados && canaisEncontrados.length > 0) {
                    canaisEncontrados.forEach(canal => {
                        try {
                            console.log('ID do canal encontrado:', canal.id);
                            db.runAsync('UPDATE canais SET url_alternative = ? WHERE id = ?', [linkPagina, canal.id]);
                            stats.updated++;
                            console.log(`✅ URL alternativa atualizada para: ${nome}`);
                        } catch (updateError) {
                            console.error(`❌ Erro ao atualizar URL alternativa de ${nome}:`, updateError);
                            stats.errors++;
                        }
                    });
                } else {
                    try {
                        await db.runAsync('INSERT INTO canais (name, category, url_alternative) VALUES (?, ?, ?)', [nome, 'Outros', linkPagina]);
                        stats.inserted++;
                        console.log(`➕ Novo canal inserido com URL alternativa: ${nome}`);
                    } catch (insertError) {
                        console.error(`❌ Erro ao inserir ${nome} com URL alternativa:`, insertError);
                        stats.errors++;
                    }
                }

            } catch (error) {
                console.error(`❌ Erro ao processar canal ${index + 1} (${nome || 'sem nome'}):`, error);
                stats.errors++;
            }
        }

    } catch (error) {
        console.error('❌ Erro geral ao atualizar URLs alternativas:', error);
        stats.errors++;
    } finally {
        if (browser) {
            await browser.close();
        }

        // Relatório final
        console.log('\n📊 Relatório Final da atualização de URLs alternativas:');
        console.log(`🔍 Total de canais processados: ${stats.total}`);
        console.log(`🔄 URLs alternativas atualizadas: ${stats.updated}`);
        console.log(`🆕 Canais inseridos: ${stats.inserted}`);
        console.log(`⏭️ Canais ignorados: ${stats.skipped}`);
        console.log(`❌ Erros encontrados: ${stats.errors}`);
        console.log('🎉 Operação de atualização de URLs alternativas concluída!');
    }
}

if (require.main === module) {
    atualizarCanais()
        .then(() => atualizarUrlAlternativa())
        .then(() => setTimeout(() => process.exit(0), 1000))
        .catch(error => {
            console.error('❌ Falha crítica:', error);
            setTimeout(() => process.exit(1), 1000);
        });
}

module.exports = { atualizarCanais, atualizarUrlAlternativa };