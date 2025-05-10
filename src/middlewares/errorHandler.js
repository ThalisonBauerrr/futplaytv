/**
 * Middleware para tratamento centralizado de erros
 */
function errorHandler(err, req, res, next) {
    // Log detalhado em desenvolvimento
    if (process.env.NODE_ENV === 'development') {
      console.error('\x1b[31m', '=== ERRO ===');
      console.error('Mensagem:', err.message);
      console.error('Stack:', err.stack);
      console.error('Endpoint:', req.originalUrl);
      console.error('Corpo:', req.body);
      console.error('Params:', req.params);
      console.error('Query:', req.query);
      console.error('\x1b[0m');
    }
  
    // Tratamento para erros de validação
    if (err.name === 'ValidationError') {
      return res.status(422).json({
        error: 'Erro de validação',
        details: err.errors
      });
    }
  
    // Tratamento para erros JWT
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({
        error: 'Token inválido'
      });
    }
  
    // Tratamento para erros de banco de dados
    if (err.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({
        error: 'Registro duplicado',
        details: process.env.NODE_ENV === 'development' ? err.sqlMessage : undefined
      });
    }
  
    // Erros customizados com status code
    if (err.statusCode) {
      return res.status(err.statusCode).json({
        error: err.message,
        ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
      });
    }
  
    // Erro genérico (500)
    res.status(500).json({
      error: 'Erro interno no servidor',
      ...(process.env.NODE_ENV === 'development' && {
        message: err.message,
        stack: err.stack
      })
    });
  }
  
  module.exports = errorHandler;