const { body } = require('express-validator');

module.exports = [
  body('email')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  
  body('password')
    .notEmpty().withMessage('Senha é obrigatória')
];