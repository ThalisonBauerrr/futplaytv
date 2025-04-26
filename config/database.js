const sqlite3 = require('sqlite3').verbose();
const { promisify } = require('util'); // Para usar promisify

// Criação do banco de dados SQLite
const db = new sqlite3.Database('./futplay.db');

// Promisificando o método 'all' do sqlite3 (usado para consultas SELECT)
db.all = promisify(db.all);

// Criar a tabela de usuários, se não existir
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS usuarios (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      uuid TEXT NOT NULL UNIQUE,
      ip TEXT NOT NULL,
      tempo_inicio TEXT NOT NULL,
      tempo_fim TEXT NOT NULL
    );
  `);
  db.run(`
    CREATE TABLE IF NOT EXISTS competicoes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      nome TEXT NOT NULL
    );
  `);

  // Tabela de partidas
  db.run(`
    CREATE TABLE IF NOT EXISTS partidas (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      competicao_id INTEGER,
      rodada TEXT,
      hora TEXT,
      data TEXT,
      time_casa_nome TEXT,
      time_visitante_nome TEXT,
      time_casa_imagem TEXT,
      time_visitante_imagem TEXT,
      link_partida TEXT,
      FOREIGN KEY (competicao_id) REFERENCES competicoes(id)
    );
  `);
});

// Promisificar o método 'run' para executar comandos como INSERT/UPDATE/DELETE
db.runAsync = promisify(db.run);

module.exports = db;
