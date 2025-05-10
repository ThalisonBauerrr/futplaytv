const jwt = require('jsonwebtoken');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'seuSegredoSuperSecreto';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '1h';

module.exports = {
  gerarToken: (payload) => {
    return jwt.sign(payload, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  },

  verificarToken: (token) => {
    return jwt.verify(token, JWT_SECRET);
  }
};