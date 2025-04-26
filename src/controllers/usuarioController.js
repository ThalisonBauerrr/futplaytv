const usuarioModel = require('../models/usuarioModel');
const { v4: uuidv4 } = require('uuid');

// Função para verificar ou registrar o usuário
const verificarOuRegistrarUsuario = (req, res, next) => {
  const uuidUsuario = req.cookies.uuid || uuidv4();  // Verifica se o UUID está no cookie, caso contrário gera um novo
  const ipUsuario = req.ip;  // Pega o IP do usuário

  // Armazenar o UUID no cookie para o usuário
  res.cookie('uuid', uuidUsuario, { maxAge: 900000, httpOnly: true });

  // Verificar ou atualizar o usuário com o IP e UUID
  usuarioModel.verificarOuAtualizarUsuario(ipUsuario, uuidUsuario, (err, result) => {
    if (err) {
      return res.status(500).send('Erro ao verificar ou atualizar usuário');
    }

    // Resultado do banco
    if (result.updated) {
      console.log(`Usuário atualizado com IP ${ipUsuario} e UUID ${uuidUsuario}.`);
    } else if (result.noChange) {
      console.log(`IP ${ipUsuario} e UUID ${uuidUsuario} já estão atualizados.`);
    } else if (result.inserted) {
      console.log(`Novo usuário com IP ${ipUsuario} e UUID ${uuidUsuario} inserido.`);
    }

    next();  // Passa para o próximo middleware ou rota
  });
};

module.exports = {
  verificarOuRegistrarUsuario
};
