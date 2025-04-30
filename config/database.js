const mysql = require('mysql2/promise');  // Importando a versão promise do mysql2

// Criando a conexão com o banco de dados MySQL
const db = mysql.createPool({
  host: '191.252.196.56',  // IP do seu servidor MySQL
  user: 'bauerthalison',    // Seu usuário MySQL
  password: 'p5pexvm',      // Sua senha do MySQL
  database: 'futplay',      // Nome do banco de dados
  waitForConnections: true, // Espera por conexões disponíveis
  connectionLimit: 10,      // Limite de conexões no pool
  queueLimit: 0             // Limite de espera na fila
});

// Agora o db já tem os métodos query e execute que retornam promessas por padrão
module.exports = db;
