const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const partidasController = require('../controllers/admin/partidasController');
const canaisController = require('../controllers/admin/canaisController');

// Rota para a página principal de administração
router.get('/', adminController.showAdminPage);

// Rotas de autenticação
router.get('/login', adminController.showLoginPage);
router.post('/login', adminController.login);
router.get('/logout', adminController.logout);


// Rotas para gerenciamento de canais
router.get('/canais/', canaisController.listarCanais);
router.get('/canais/adicionar', canaisController.formAdicionarCanal);
router.post('/canais/adicionar', canaisController.adicionarCanal);
router.get('/canais/editar/:id', canaisController.editarCanalForm);
router.post('/canais/editar/:id', canaisController.editarCanal);
router.get('/canais/excluir/:id', canaisController.excluirCanal);

// Listar jogos
router.get('/jogos/', partidasController.listarPartidas);
router.get('/jogos/adicionar', partidasController.formAdicionarPartida);
router.post('/jogos/adicionar', partidasController.adicionarPartida);
router.get('/jogos/editar/:id', partidasController.formEditarPartida);
router.post('/jogos/editar/:id', partidasController.editarPartida);
router.get('/jogos/excluir/:id', partidasController.excluirPartida);
router.get('/jogos/update-competicao/:id', partidasController.atualizarCompeticao);

module.exports = router;