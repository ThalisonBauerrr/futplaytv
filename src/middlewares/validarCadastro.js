const { body } = require('express-validator');

module.exports = [
  body('email')
    .isEmail().withMessage('E-mail inválido')
    .normalizeEmail(),
  
  body('password')
    .isLength({ min: 6 }).withMessage('A senha deve ter pelo menos 6 caracteres'),
    
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.password)
    .withMessage('As senhas não coincidem')
];