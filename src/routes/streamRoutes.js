const express = require('express');
const router = express.Router();
const streamController = require('../controllers/streamController');
const resHomeController = require('../controllers/homeController');
const jogoModel = require('../models/jogoModel'); // Importa o jogoModel
router.get('/', resHomeController.resHome);
router.get('/home', resHomeController.resHome);
router.get('/player/:id', streamController.resPlayer);

router.get('/atualizar-jogos', async (req, res) => {
    try {
      const jogosAtualizados = await jogoModel.buscarJogosAoVivo(); // Função que busca os jogos ao vivo
      res.json({ jogos: jogosAtualizados });  // Retorna os jogos no formato JSON
    } catch (error) {
      console.error('Erro ao buscar jogos:', error);
      res.status(500).json({ error: 'Erro ao buscar jogos' });
    }
  });

// Rota para buscar os dados atualizados do jogo
router.get('/atualizar-jogo/:id', async (req, res) => {
    const jogoId = req.params.id;  // Obtém o ID da partida da URL
  
    try {
      // Função para buscar os dados do jogo no banco de dados
      const jogoAtualizado = await jogoModel.buscarJogoPorId(jogoId);
  
      // Se o jogo não for encontrado, retorna erro 404
      if (!jogoAtualizado) {
        return res.status(404).json({ error: 'Jogo não encontrado' });
      }
  
      // Retorna os dados atualizados do jogo (placar e tempo)
      res.json({ jogo: jogoAtualizado });
    } catch (error) {
      console.error('Erro ao buscar jogo:', error);
      res.status(500).json({ error: 'Erro ao buscar jogo' });
    }
  });
module.exports = router;