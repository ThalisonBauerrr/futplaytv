const db = require('../../config/database');

const verificarUsuario = (uuid) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT tempo_inicio, tempo_fim FROM usuarios WHERE uuid = ?", [uuid], (err, row) => {
      if (err) {
        return reject(err);  // Caso de erro, rejeita a Promise
      }
      resolve(row);  // Caso contrário, resolve com o resultado, incluindo as datas tempo_inicio e tempo_fim
    });
  });
};

const atualizarTempoFim = (uuid) => {
  return new Promise((resolve, reject) => {
    const minutesFree = parseInt(process.env.MINUTES_FREE) || 10;  // Pega o valor de MINUTES_FREE (default 10 se não encontrado)
  
    // Calculando tempo de fim
    const tempoInicio = new Date();  // Data e hora atual
    const tempoFim = new Date(tempoInicio.getTime() + minutesFree * 60000);  // Adiciona os minutos gratuitos ao tempo de início
  
    // Formata a data para o formato YYYY-MM-DD HH:MM:SS
    const tempoFimFormatado = formatDate(tempoFim);
  
    // Atualiza o tempo de fim do usuário com base no UUID
    db.run("UPDATE usuarios SET tempo_fim = ? WHERE uuid = ?", [tempoFimFormatado, uuid], function(err) {
      if (err) {
        return reject(err);  // Se houver erro, rejeita a Promise
      }
      resolve();  // Caso contrário, resolve a Promise
    });
  });
};

const verificarOuAtualizarUsuario = (ip, uuid) => {
  return new Promise((resolve, reject) => {
    // Primeiro, verificamos se o IP já existe
    db.get("SELECT * FROM usuarios WHERE ip = ?", [ip], (err, row) => {
      if (err) {
        return reject(err);  // Caso de erro, rejeita a Promise
      }

      if (row) {
        // Se o IP existe, verificamos se o UUID é diferente
        if (row.uuid !== uuid) {
          // Atualiza o UUID se for diferente
          db.run("UPDATE usuarios SET uuid = ? WHERE ip = ?", [uuid, ip], function(err) {
            if (err) {
              return reject(err);  // Se houver erro, rejeita a Promise
            }
            console.log(`IP ${ip} encontrado. UUID atualizado.`);
            resolve({ updated: true });  // Resolve a Promise com o resultado de atualização
          });
        } else {
          // Se o IP e UUID são iguais, não altera nada
          console.log(`IP ${ip} e UUID já estão atualizados.`);
          resolve({ noChange: true });  // Resolve indicando que não houve alteração
        }
      } else {
        // Se o IP não existe, verificamos o UUID
        db.get("SELECT * FROM usuarios WHERE uuid = ?", [uuid], (err, row) => {
          if (err) {
            return reject(err);  // Se houver erro, rejeita a Promise
          }

          if (row) {
            // Se o UUID já existe, mas o IP é diferente, atualizamos o IP
            if (row.ip !== ip) {
              db.run("UPDATE usuarios SET ip = ? WHERE uuid = ?", [ip, uuid], function(err) {
                if (err) {
                  return reject(err);  // Se houver erro, rejeita a Promise
                }
                console.log(`UUID ${uuid} encontrado. IP atualizado.`);
                resolve({ updated: true });  // Resolve a Promise com o resultado de atualização
              });
            } else {
              // Se o UUID e o IP são iguais, não altera nada
              console.log(`UUID ${uuid} e IP já estão atualizados.`);
              resolve({ noChange: true });  // Resolve indicando que não houve alteração
            }
          } else {
            // Se nem o IP nem o UUID existem, inserimos um novo usuário
            const minutesFree = parseInt(process.env.MINUTES_FREE) || 10;
            const tempoInicio = new Date();
            const tempoFim = new Date(tempoInicio.getTime() + minutesFree * 60000);  // Adiciona os minutos gratuitos

            // Formata as datas para o formato YYYY-MM-DD HH:MM:SS
            const tempoInicioFormatado = formatDate(tempoInicio);
            const tempoFimFormatado = formatDate(tempoFim);

            // Inserir um novo usuário
            db.run("INSERT INTO usuarios (uuid, ip, tempo_inicio, tempo_fim) VALUES (?, ?, ?, ?)", [uuid, ip, tempoInicioFormatado, tempoFimFormatado], function(err) {
              if (err) {
                return reject(err);  // Se houver erro, rejeita a Promise
              }
              console.log(`Novo usuário com IP ${ip} e UUID ${uuid} inserido.`);
              resolve({ inserted: true });  // Resolve a Promise indicando que o usuário foi inserido
            });
          }
        });
      }
    });
  });
};

const formatDate = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0'); // Meses começam em 0
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const getQRCodeByUser = (uuid) => {
  return new Promise((resolve, reject) => {
    db.get("SELECT payment_qr_code FROM usuarios WHERE uuid = ?", [uuid], (err, row) => {
      if (err) {
        reject(err);
      }
      resolve(row);  // Retorna o QR Code armazenado
    });
  });
};

// Função para salvar o QR Code no banco de dados
const saveQRCode = (uuid, paymentId, qrCodeBase64) => {
  return new Promise((resolve, reject) => {
    const updateQuery = 'UPDATE usuarios SET idpayment = ?, payment_qr_code = ? WHERE uuid = ?';
    db.run(updateQuery, [paymentId, qrCodeBase64, uuid], function (err) {
      if (err) {
        reject(err);
      }
      resolve();  // Salvo com sucesso
    });
  });
};

module.exports = {
  verificarUsuario,
  atualizarTempoFim,
  verificarOuAtualizarUsuario,
  getQRCodeByUser, 
  saveQRCode
};
