const mysql = require('mysql2/promise');  // Importando a versão promise do mysql2

// Criando a conexão com o banco de dados MySQL
const db = mysql.createPool({
  host: '127.0.0.1',  // IP do seu servidor MySQL
  user: 'bauerthalison',    // Seu usuário MySQL
  password: 'p5pexvm',      // Sua senha do MySQL
  database: 'futplaytv',      // Nome do banco de dados
  waitForConnections: true, // Espera por conexões disponíveis
  connectionLimit: 10,      // Limite de conexões no pool
  queueLimit: 0             // Limite de espera na fila
});

// Agora o db já tem os métodos query e execute que retornam promessas por padrão
module.exports = db;
