const bcrypt = require('bcrypt');
const { gerarToken } = require('../utils/jwtUtils');
const UsuarioModel = require('../models/usuarioModel');
const UsuarioCadastradoModel = require('../models/UsuarioCadastradoModel');

class AuthController {
  static async registrar(req, res, next) {
    try {
      const { uuid, email, password } = req.body;
  
      // Verificação de UUID
      const usuarioExistente = await UsuarioModel.buscarPorUUID(uuid);
      if (!usuarioExistente) {
        return res.status(400).json({ error: 'UUID inválido' });
      }
  
      // Criptografia da senha
      const hashedPassword = await bcrypt.hash(password, 10);
  
      // Criação do usuário
      const usuario = await UsuarioCadastradoModel.criar(
        usuarioExistente.id,  // Passando id do usuário existente
        email, 
        hashedPassword  // Senha criptografada
      );
  
      // Geração do token
      const token = gerarToken({
        userId: usuario.id,
        email: usuario.email
      });
  
      res.status(201).json({
        success: true,
        token,
        user: {
          email: usuario.email
        }
      });
  
    } catch (error) {
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
  
      // 1. Busca usuário
      const usuario = await UsuarioCadastradoModel.buscarPorEmail(email);
      if (!usuario) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }
  
      // 2. Valida senha
      const senhaValida = await bcrypt.compare(password, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Credenciais inválidas' });
      }

  
      // 4. Gera token JWT
      const token = gerarToken({
        userId: usuario.id_uuid,
        email: usuario.email,
        lastUpdate: usuario.updated_at // Opcional: incluir no token
      });
  
      // 5. Retorna resposta
      res.json({
        success: true,
        token,
        user: {
          email: usuario.email,
          lastAccess: usuario.updated_at
        }
      });
  
    } catch (error) {
      next(error);
    }
  }

  static async obterPerfil(req, res) {
    res.json({ user: req.user });
  }

  static async atualizarSenha(req, res, next) {
    try {
      const { currentPassword, newPassword } = req.body;
      const userId = req.user.userId; // Obtido do token JWT
  
      // 1. Buscar usuário
      const usuario = await UsuarioCadastradoModel.buscarPorId(userId);
      if (!usuario) {
        return res.status(404).json({ error: 'Usuário não encontrado' });
      }
  
      // 2. Verificar senha atual
      const senhaValida = await bcrypt.compare(currentPassword, usuario.senha);
      if (!senhaValida) {
        return res.status(401).json({ error: 'Senha atual incorreta' });
      }
  
      // 3. Criptografar nova senha
      const hashedPassword = await bcrypt.hash(newPassword, 10);
  
      // 4. Atualizar no banco de dados
      await UsuarioCadastradoModel.atualizarSenha(userId, hashedPassword);
  
      res.json({ success: true, message: 'Senha atualizada com sucesso' });
  
    } catch (error) {
      next(error);
    }
  }

static async logout(req, res) {
  try {
    // If using JWT with token blacklist:
    // await invalidateToken(req.headers.authorization.split(' ')[1]);
    
    // Clear HTTP-only cookie if using
    res.clearCookie('authToken');
    
    // Return proper JSON response
    res.json({ 
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Logout failed'
    });
  }
}
}

module.exports = AuthController;