const { body } = require('express-validator');

module.exports = [
  body('currentPassword')
    .notEmpty().withMessage('Senha atual é obrigatória'),
  
  body('newPassword')
    .isLength({ min: 6 }).withMessage('A nova senha deve ter pelo menos 6 caracteres')
    .not().equals(body('currentPassword')).withMessage('A nova senha deve ser diferente da atual'),
    
  body('confirmPassword')
    .custom((value, { req }) => value === req.body.newPassword)
    .withMessage('As senhas não coincidem')
];