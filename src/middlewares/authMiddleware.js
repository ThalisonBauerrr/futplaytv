const { verificarToken } = require('../utils/jwtUtils');

module.exports = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'Token não fornecido' });
    }

    const decoded = verificarToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    res.status(401).json({ 
      error: 'Token inválido ou expirado',
      details: error.message // Opcional: remove se não quiser detalhes
    });
  }
};