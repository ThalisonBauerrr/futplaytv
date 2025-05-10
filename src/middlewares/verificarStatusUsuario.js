const UsuarioCadastradoModel = require('../models/UsuarioCadastradoModel');

module.exports = async (req, res, next) => {
    try {
        const usuario = await UsuarioCadastradoModel.buscarPorId(req.user.userId);
        
        if (!usuario) {
            return res.status(404).json({ 
                success: false,
                message: 'Usuário não encontrado',
                code: 'USER_NOT_FOUND'
            });
        }

        if (usuario.status !== 'ativo') {
            return res.status(403).json({ 
                success: false,
                message: 'Conta desativada ou suspensa',
                code: 'ACCOUNT_INACTIVE'
            });
        }

        req.usuario = usuario;
        next();
    } catch (error) {
        console.error('Erro ao verificar status:', error);
        res.status(500).json({ 
            success: false,
            message: 'Erro ao verificar conta',
            code: 'SERVER_ERROR'
        });
    }
};