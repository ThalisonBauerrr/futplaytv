// controllers/admin/PartidasController.js
const db = require('../../../config/database');

module.exports = {
    // Listar todas as partidas
    async listarPartidas(req, res) {
        try {
            // Obter mensagens da query string
            const success = req.query.success || null;
            const error = req.query.error || null;

            const partidas = await db.all(`
                SELECT 
                    p.id,
                    p.rodada,
                    p.hora,
                    p.data,
                    p.transmissoes,
                    p.time_casa_nome,
                    p.time_visitante_nome,
                    p.time_casa_imagem,
                    p.time_visitante_imagem,
                    p.destac,
                    p.link_partida,
                    c.nome_padrao as competicao_nome
                FROM partidas p
                LEFT JOIN competicoes c ON p.competicao_id = c.id
                ORDER BY p.data, p.hora
            `);

            // Formatar os dados para a view
            const jogosFormatados = partidas.map(partida => ({
                id: partida.id,
                rodada:partida.rodada,
                competicao_nome: partida.competicao_nome,
                time_casa_nome: partida.time_casa_nome,
                time_visitante_nome: partida.time_visitante_nome,
                time_casa_imagem: partida.time_casa_imagem,
                time_visitante_imagem: partida.time_visitante_imagem,
                data: formatarData(partida.data),
                hora: partida.hora,
                destac: partida.destac,
                link_partida: partida.link_partida,
                // Se transmissoes for JSON, parsear
                canal_id: partida.transmissoes
            }));

            res.render('admin/jogos/index', {
                pageTitle: 'Gerenciar Partidas',
                jogos: jogosFormatados,
                success,
                error
            });
        } catch (error) {
            console.error('Erro ao listar partidas:', error);
            res.status(500).send('Erro ao carregar partidas');
        }
    },

    // Formulário para adicionar nova partida
    async formAdicionarPartida(req, res) {
        const success = req.query.success || null;
        const error = req.query.error || null;
        // Busca todas as competições disponíveis
        const competicoes = await db.all('SELECT id, nome_padrao FROM competicoes ORDER BY nome_padrao');

        // Busca todos os canais disponíveis
        const canais = await db.all('SELECT id, name FROM canais ORDER BY name');

        res.render('admin/jogos/adicionar', {
            pageTitle: 'Adicionar Nova Partida',
            competicoes,
            canais,
            timesVisitante: time,
            success,
            error
            
        });
    },

    // Processar adição de nova partida
    async adicionarPartida(req, res) {
        try {
            const { competicao_id, rodada, time_casa_nome, time_visitante_nome, data, hora } = req.body;
            
            await db.run(
                `INSERT INTO partidas (
                    competicao_id, 
                    rodada, 
                    time_casa_nome, 
                    time_visitante_nome, 
                    data, 
                    hora,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, datetime('now'), datetime('now'))`,
                [competicao_id, rodada, time_casa_nome, time_visitante_nome, data, hora]
            );

            req.flash('success', 'Partida adicionada com sucesso!');
            res.redirect('/admin/jogos');
        } catch (error) {
            console.error('Erro ao adicionar partida:', error);
            req.flash('error', 'Erro ao adicionar partida');
            res.redirect('/admin/jogos/adicionar');
        }
    },

    async formEditarPartida(req, res) {
        try {
            const success = req.query.success || null;
            const error = req.query.error || null;
            // Busca a partida específica
            const partida = await db.get(
                `SELECT 
                    p.id,
                    p.competicao_id,
                    p.rodada,
                    p.time_casa_nome,
                    p.time_visitante_nome,
                    p.time_casa_imagem,
                    p.time_visitante_imagem,
                    p.data,
                    p.hora,
                    p.transmissoes,
                    p.link_partida,
                    p.destac,
                    c.nome as competicao_nome
                FROM partidas p
                LEFT JOIN competicoes c ON p.competicao_id = c.id
                WHERE p.id = ?`,
                [req.params.id]
            );
    
            if (!partida) {
                req.flash('error', 'Partida não encontrada');
                return res.redirect('/admin/jogos');
            }
    
            // Busca todas as competições disponíveis
            const competicoes = await db.all('SELECT id, nome_padrao AS nome FROM competicoes ORDER BY nome');
            
            // Busca todos os canais disponíveis
            const canais = await db.all('SELECT id, name FROM canais WHERE url IS NOT NULL ORDER BY name');
    
            // Extrai os nomes únicos dos times existentes nas partidas
            const timesCasa = await db.all(
                `SELECT DISTINCT time_casa_nome as nome, time_casa_imagem as imagem 
                 FROM partidas 
                 WHERE time_casa_nome IS NOT NULL 
                 ORDER BY time_casa_nome`
            );
    
            const timesVisitante = await db.all(
                `SELECT DISTINCT time_visitante_nome as nome, time_visitante_imagem as imagem 
                 FROM partidas 
                 WHERE time_visitante_nome IS NOT NULL 
                 ORDER BY time_visitante_nome`
            );
    
            // Combina e remove duplicatas
            const timesDisponiveis = [...timesCasa, ...timesVisitante]
                .filter((time, index, self) =>
                    index === self.findIndex(t => t.nome === time.nome)
                );
    
            res.render('admin/jogos/editar', {
                pageTitle: 'Editar Partida',
                jogo: {
                    ...partida,
                    data: partida.data ? partida.data.split('T')[0] : '', // Formata para input date
                    transmissoes: partida.transmissoes ? JSON.parse(partida.transmissoes) : []
                },
                competicoes,
                times: timesDisponiveis, // Lista de times disponíveis (extraídos das partidas)
                canais, 
                success,
                error
            });
    
        } catch (error) {
            console.error('Erro ao carregar partida para edição:', error);
            req.flash('error', 'Erro ao carregar partida');
            res.redirect('/admin/jogos');
        }
    },

    // Processar edição de partida
    async editarPartida(req, res) {
        try {
            const { id } = req.params;
            const { competicao_id, rodada, time_casa_nome, time_visitante_nome, data, hora, transmissoes } = req.body;

            await db.run(
                `UPDATE partidas SET
                    competicao_id = ?,
                    rodada = ?,
                    time_casa_nome = ?,
                    time_visitante_nome = ?,
                    data = ?,
                    hora = ?,
                    transmissoes = ?,
                    updated_at = datetime('now')
                WHERE id = ?`,
                [
                    competicao_id,
                    rodada,
                    time_casa_nome,
                    time_visitante_nome,
                    data,
                    hora,
                    transmissoes ? JSON.stringify(transmissoes) : null,
                    id
                ]
            );

            req.flash('success', 'Partida atualizada com sucesso!');
            res.redirect('/admin/jogos');
        } catch (error) {
            console.error('Erro ao editar partida:', error);
            req.flash('error', 'Erro ao editar partida');
            res.redirect(`/admin/jogos/editar/${req.params.id}`);
        }
    },

    // Excluir partida
    async excluirPartida(req, res) {
        try {
            await db.run('DELETE FROM partidas WHERE id = ?', [req.params.id]);
            req.flash('success', 'Partida excluída com sucesso!');
        } catch (error) {
            console.error('Erro ao excluir partida:', error);
            req.flash('error', 'Erro ao excluir partida');
        }
        res.redirect('/admin/jogos');
    },

    // Atualizar partidas de uma competição específica
    async atualizarCompeticao(req, res) {
        try {
            const competicaoId = req.params.id;
            // Aqui você chamaria sua função de scraping específica para a competição
            // Exemplo: await atualizarPartidasBrasileirao(competicaoId);
            
            req.flash('success', `Partidas da competição ${competicaoId} atualizadas com sucesso!`);
            res.redirect('/admin/jogos');
        } catch (error) {
            console.error('Erro ao atualizar partidas:', error);
            req.flash('error', 'Erro ao atualizar partidas');
            res.redirect('/admin/jogos');
        }
    }
};

// Função auxiliar para formatar data
function formatarData(dataString) {
    if (!dataString) return '--';
    const [year, month, day] = dataString.split('-');
    return `${day}/${month}/${year}`;
}