const express = require('express');
const router = express.Router();
const AuthController = require('../controllers/authController');
const validarAtualizacaoSenha = require('../middlewares/validarAtualizacaoSenha');

// Middlewares
const validarCadastro = require('../middlewares/validarCadastro');
const validarLogin = require('../middlewares/validarLogin');
const authMiddleware = require('../middlewares/authMiddleware');

// Rotas públicas
router.post('/registrar', validarCadastro, AuthController.registrar);
router.post('/login', validarLogin, AuthController.login);
router.post('/logout', AuthController.logout);

// Rotas protegidas
router.get('/perfil', authMiddleware, AuthController.obterPerfil);

router.put(
    '/atualizar-senha',
    authMiddleware,
    validarAtualizacaoSenha,
    AuthController.atualizarSenha
  );
module.exports = router;