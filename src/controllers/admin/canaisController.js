const db = require('../../../config/database');

module.exports = {
    // Listar todos os canais
    async listarCanais(req, res) {
        try {
            const [canais] = await db.execute('SELECT * FROM canais ORDER BY name');
            
            // Obter mensagens da query string
            const success = req.query.success || null;
            const error = req.query.error || null;
            
            res.render('admin/canais/index', {
                pageTitle: 'Gerenciar Canais',
                canais,
                success,
                error
            });
            
        } catch (error) {
            console.error('Erro ao listar canais:', error);
            res.redirect('/admin/canais?error=Erro ao carregar lista de canais');
        }
    },

    // Exibir formulário de adição
    formAdicionarCanal(req, res) {
        // Pega mensagem de erro da query string se existir
        const success = req.query.success || null;
        const error = req.query.error || null;

        res.render('admin/canais/adicionar', {
            pageTitle: 'Adicionar Novo Canal',
            success,
            error
        });
    },

    async adicionarCanal(req, res) {
        try {
            const { name, url, url_alternative, logo } = req.body;
            console.log('Dados recebidos:', { name, url, url_alternative, logo });
    
            // Validação robusta do nome
            if (!name || typeof name !== 'string' || name.trim() === '') {
                return res.redirect('/admin/canais/adicionar?error=O nome do canal é obrigatório');
            }
    
            // Validação da URL principal
            if (!url || typeof url !== 'string' || url.trim() === '') {
                return res.redirect('/admin/canais/adicionar?error=A URL principal é obrigatória');
            }
    
            // Validação opcional da URL alternativa
            if (url_alternative && typeof url_alternative !== 'string') {
                return res.redirect('/admin/canais/adicionar?error=URL alternativa inválida');
            }
    
            // Validação do logo (opcional)
            if (logo && typeof logo !== 'string') {
                return res.redirect('/admin/canais/adicionar?error=Logo inválido');
            }
    
            await db.execute(
                'INSERT INTO canais (name, url, url_alternative, logo, created_at, updated_at) VALUES (?, ?, ?, ?, NOW(), NOW())',
                [name.trim(), url.trim(), url_alternative ? url_alternative.trim() : null, logo || null]
            );
    
            res.redirect('/admin/canais?success=Canal adicionado com sucesso');
            
        } catch (error) {
            console.error('Erro ao adicionar canal:', error);
            
            let errorMessage = 'Erro ao adicionar canal';
            if (error.code === 'ER_DUP_ENTRY') {
                errorMessage = 'Já existe um canal com este nome';
            } else if (error.code === 'ER_BAD_NULL_ERROR') {
                errorMessage = 'Dados obrigatórios não fornecidos';
            }
            
            res.redirect(`/admin/canais/adicionar?error=${encodeURIComponent(errorMessage)}`);
        }
    },

    async editarCanalForm(req, res) {
        try {
            const { id } = req.params;
            const [canalRows] = await db.execute('SELECT * FROM canais WHERE id = ?', [id]);
            
            if (canalRows.length === 0) {
                return res.redirect('/admin/canais?error=Canal não encontrado');
            }
    
            const canal = canalRows[0];
    
            // Extrai mensagens da query string
            const { success, error } = req.query;
    
            res.render('admin/canais/editar', {
                pageTitle: `Editar ${canal.name}`,
                canal,
                success: success || null,
                error: error || null,
                activePage: 'canais'
            });
    
        } catch (error) {
            console.error('Erro ao carregar formulário de edição:', error);
            res.redirect('/admin/canais?error=Erro ao carregar formulário de edição');
        }
    },
    
    async editarCanal(req, res) {
        try {
            const { id } = req.params;
            const { name, url, url_alternative, active, remove_logo } = req.body;
    
            // Validações
            if (!name?.trim()) {
                return res.redirect(`/admin/canais/editar/${id}?error=O nome do canal é obrigatório`);
            }
    
            if (!url?.trim()) {
                return res.redirect(`/admin/canais/editar/${id}?error=A URL principal é obrigatória`);
            }
    
            // Verifica se o canal existe
            const [canalExistenteRows] = await db.execute('SELECT * FROM canais WHERE id = ?', [id]);
            if (canalExistenteRows.length === 0) {
                return res.redirect('/admin/canais?error=Canal não encontrado');
            }
    
            const canalExistente = canalExistenteRows[0];
    
            // Tratamento do logo
            let logo = canalExistente.logo;
            if (remove_logo === 'on') {
                logo = null;
            } else if (req.file) {
                logo = `/uploads/${req.file.filename}`;
                // Aqui você pode querer deletar a imagem antiga se existir
            }
    
            // Atualização no banco de dados
            await db.execute(
                `UPDATE canais SET 
                    name = ?, 
                    url = ?, 
                    url_alternative = ?, 
                    logo = ?, 
                    active = ?,
                    updated_at = NOW()
                 WHERE id = ?`,
                [
                    name.trim(),
                    url.trim(),
                    url_alternative?.trim() || null,
                    logo,
                    active === '1' ? 1 : 0,
                    id
                ]
            );
    
            res.redirect(`/admin/canais?success=Canal ${name} atualizado com sucesso`);
    
        } catch (error) {
            console.error('Erro ao editar canal:', error);
            
            const errorMessage = error.code === 'ER_DUP_ENTRY' 
                ? 'Já existe um canal com este nome' 
                : 'Erro ao atualizar canal';
                
            res.redirect(`/admin/canais/editar/${req.params.id}?error=${encodeURIComponent(errorMessage)}`);
        }
    },

    // Excluir canal
    async excluirCanal(req, res) {
        try {
            // Verifica se o canal existe antes de tentar excluir
            const [canalRows] = await db.execute(
                'SELECT id FROM canais WHERE id = ?',
                [req.params.id]
            );
            
            if (canalRows.length === 0) {
                return res.redirect('/admin/canais?error=Canal não encontrado');
            }
            
            await db.execute(
                'DELETE FROM canais WHERE id = ?',
                [req.params.id]
            );
            
            res.redirect('/admin/canais?success=Canal excluído com sucesso');
            
        } catch (error) {
            console.error('Erro ao excluir canal:', error);
            
            let errorMessage = 'Erro ao excluir canal';
            if (error.code === 'ER_ROW_IS_REFERENCED_2') {
                errorMessage = 'Não é possível excluir - canal está em uso';
            }
            
            res.redirect(`/admin/canais?error=${encodeURIComponent(errorMessage)}`);
        }
    }
};