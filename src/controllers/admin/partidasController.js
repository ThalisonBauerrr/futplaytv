const db = require('../../../config/database');

module.exports = {
    async listarPartidas(req, res) {
        try {
            // Obter mensagens da query string
            const success = req.query.success || null;
            const error = req.query.error || null;
            const hojeOnly = req.query.hoje === 'true';
    
            // Obter a data atual no formato YYYY-MM-DD (horário de Brasília)
            const hoje = new Date();
            hoje.setHours(hoje.getHours() - 3); // Ajuste para UTC-3
            const dataHoje = hoje.toISOString().split('T')[0];
    
            // Consulta SQL
            const [partidas] = await db.execute(`
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
                ${hojeOnly ? 'WHERE DATE(p.data) = ?' : ''}
                ORDER BY p.data, p.hora
            `, hojeOnly ? [dataHoje] : []);
    
            // Formatar os dados para a view
            const jogosFormatados = partidas.map(partida => ({
                id: partida.id,
                rodada: partida.rodada,
                competicao_nome: partida.competicao_nome,
                time_casa_nome: partida.time_casa_nome,
                time_visitante_nome: partida.time_visitante_nome,
                time_casa_imagem: partida.time_casa_imagem,
                time_visitante_imagem: partida.time_visitante_imagem,
                data: formatarData(partida.data), // Chamada segura
                hora: partida.hora,
                destac: partida.destac,
                link_partida: partida.link_partida,
                canal_id: partida.transmissoes
            }));
    
            res.render('admin/jogos/index', {
                pageTitle: hojeOnly ? 'Partidas de Hoje' : 'Gerenciar Partidas',
                jogos: jogosFormatados,
                success,
                error,
                hojeOnly
            });
    
        } catch (error) {
            console.error('Erro ao listar partidas:', error);
            res.status(500).send('Erro ao carregar partidas');
        }
    },

    // Formulário para adicionar nova partida
    async formAdicionarPartida(req, res) {
        try {
            const success = req.query.success || null;
            const error = req.query.error || null;
            
            // Busca todas as competições disponíveis
            const [competicoes] = await db.execute('SELECT id, nome_padrao FROM competicoes ORDER BY nome_padrao');

            // Busca todos os canais disponíveis
            const [canais] = await db.execute('SELECT id, name FROM canais ORDER BY name');

            res.render('admin/jogos/adicionar', {
                pageTitle: 'Adicionar Nova Partida',
                competicoes,
                canais,
                success,
                error
            });
        } catch (error) {
            console.error('Erro no formulário de adição:', error);
            req.flash('error', 'Erro ao carregar formulário');
            res.redirect('/admin/jogos');
        }
    },

    // Processar adição de nova partida
    async adicionarPartida(req, res) {
        try {
            const { competicao_id, rodada, time_casa_nome, time_visitante_nome, data, hora } = req.body;
            
            await db.execute(
                `INSERT INTO partidas (
                    competicao_id, 
                    rodada, 
                    time_casa_nome, 
                    time_visitante_nome, 
                    data, 
                    hora,
                    created_at,
                    updated_at
                ) VALUES (?, ?, ?, ?, ?, ?, NOW(), NOW())`,
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
            const [partidaRows] = await db.execute(
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
                    c.nome_padrao as competicao_nome
                FROM partidas p
                LEFT JOIN competicoes c ON p.competicao_id = c.id
                WHERE p.id = ?`,
                [req.params.id]
            );
    
            if (partidaRows.length === 0) {
                req.flash('error', 'Partida não encontrada');
                return res.redirect('/admin/jogos');
            }
    
            const partida = partidaRows[0];
    
            // Busca todas as competições disponíveis
            const [competicoes] = await db.execute('SELECT id, nome_padrao FROM competicoes ORDER BY nome_padrao');
            
            // Busca todos os canais disponíveis
            const [canais] = await db.execute('SELECT id, name FROM canais WHERE url IS NOT NULL ORDER BY name');
    
            // Extrai os nomes únicos dos times existentes nas partidas
            const [timesCasa] = await db.execute(
                `SELECT DISTINCT time_casa_nome as nome, time_casa_imagem as imagem 
                 FROM partidas 
                 WHERE time_casa_nome IS NOT NULL 
                 ORDER BY time_casa_nome`
            );
    
            const [timesVisitante] = await db.execute(
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
    
            // Formatação segura da data para o input HTML
            let dataFormatada = '';
    
            if (partida.data) {
                if (partida.data instanceof Date) {
                    // Se for objeto Date
                    const year = partida.data.getFullYear();
                    const month = String(partida.data.getMonth() + 1).padStart(2, '0');
                    const day = String(partida.data.getDate()).padStart(2, '0');
                    dataFormatada = `${year}-${month}-${day}`;
                } else if (typeof partida.data === 'string') {
                    // Se for string, converte de dd/mm/yyyy para yyyy-mm-dd
                    if (partida.data.includes('/')) {
                        const [day, month, year] = partida.data.split('/');
                        dataFormatada = `${year}-${month}-${day}`;
                    } else {
                        // Assume que já está no formato yyyy-mm-dd
                        dataFormatada = partida.data.split('T')[0];
                    }
                }
            }
    
            res.render('admin/jogos/editar', {
                pageTitle: 'Editar Partida',
                jogo: {
                    ...partida,
                    data: dataFormatada, // Data formatada para o input type="date"
                    transmissoes: partida.transmissoes ? JSON.parse(partida.transmissoes) : []
                },
                competicoes,
                times: timesDisponiveis,
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

            await db.execute(
                `UPDATE partidas SET
                    competicao_id = ?,
                    rodada = ?,
                    time_casa_nome = ?,
                    time_visitante_nome = ?,
                    data = ?,
                    hora = ?,
                    transmissoes = ?,
                    updated_at = NOW()
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
            await db.execute('DELETE FROM partidas WHERE id = ?', [req.params.id]);
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
            // Implementação específica para atualizar partidas
            
            req.flash('success', `Partidas da competição ${competicaoId} atualizadas com sucesso!`);
            res.redirect('/admin/jogos');
        } catch (error) {
            console.error('Erro ao atualizar partidas:', error);
            req.flash('error', 'Erro ao atualizar partidas');
            res.redirect('/admin/jogos');
        }
    },
    
    // Mostrar formulário para adicionar transmissão
    async showAddTransmissionForm(req, res) {
        try {
            const { id } = req.params;
            
            // Busca apenas os dados básicos da partida
            const [partida] = await db.execute(`
                SELECT id, time_casa_nome, time_visitante_nome, 
                    time_casa_imagem, time_visitante_imagem 
                FROM partidas 
                WHERE id = ?
            `, [id]);
            
            if (!partida.length) {
                req.flash('error', 'Partida não encontrada');
                return res.redirect('/admin/jogos');
            }

            res.render('admin/jogos/adicionarTransmissao', {
                pageTitle: 'Adicionar Transmissão',
                partida: partida[0]
            });
        } catch (error) {
            console.error('Erro ao carregar formulário de transmissão:', error);
            req.flash('error', 'Erro ao carregar formulário');
            res.redirect('/admin/jogos');
        }
    },

    // Processar adição de transmissão
    async addTransmission(req, res) {
        try {
            const { id } = req.params;
            const { name, url } = req.body;

            // Validação básica
            if (!name || !url) {
                req.flash('error', 'Preencha todos os campos');
                return res.redirect(`/admin/jogos/adicionar-transmissao/${id}`);
            }

            // Verifica se a partida existe
            const [partida] = await db.execute('SELECT id FROM partidas WHERE id = ?', [id]);
            if (!partida.length) {
                req.flash('error', 'Partida não encontrada');
                return res.redirect('/admin/jogos');
            }

            // Insere na tabela canais_jogos
            await db.execute(
                'INSERT INTO canais_jogos (name, url, id_partida) VALUES (?, ?, ?)',
                [name, url, id]
            );

            req.flash('success', 'Transmissão adicionada com sucesso!');
            res.redirect(`/admin/jogos/editar/${id}`);
        } catch (error) {
            console.error('Erro ao adicionar transmissão:', error);
            req.flash('error', 'Erro ao adicionar transmissão');
            res.redirect(`/admin/jogos/adicionar-transmissao/${id}`);
        }
    }

};

// Função auxiliar robusta para formatar data
function formatarData(dataInput) {
    if (!dataInput) return '--';
    
    // Se já estiver no formato dd/mm/yyyy
    if (typeof dataInput === 'string' && dataInput.match(/^\d{2}\/\d{2}\/\d{4}$/)) {
        return dataInput;
    }
    
    // Se for objeto Date
    if (dataInput instanceof Date) {
        const day = String(dataInput.getDate()).padStart(2, '0');
        const month = String(dataInput.getMonth() + 1).padStart(2, '0');
        const year = dataInput.getFullYear();
        return `${day}/${month}/${year}`;
    }
    
    // Se for string no formato ISO (yyyy-mm-dd)
    if (typeof dataInput === 'string') {
        try {
            // Remove parte do tempo se existir
            const datePart = dataInput.split(' ')[0].split('T')[0];
            const [year, month, day] = datePart.split('-');
            
            // Verifica se temos partes válidas
            if (year && month && day) {
                return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
            }
        } catch (e) {
            console.error('Erro ao formatar data:', e);
        }
    }
    
    return '--';
}