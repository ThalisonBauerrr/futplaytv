const db = require('../../config/database');
const axios = require('axios');

// Função para exibir os canais
exports.showChannels = (req, res) => {
  db.all("SELECT * FROM canais", (err, rows) => {
    if (err) {
      return res.status(500).send('Erro ao carregar canais');
    }
    res.render('admin/canais', {
      pageTitle: 'Gerenciar Canais',
      canais: rows
    });
  });
};

// Função para editar o canal (exibe o formulário)
exports.showEditChannelForm = (req, res) => {
  const canalId = req.params.id;

  db.get("SELECT * FROM canais WHERE id = ?", [canalId], (err, row) => {
    if (err) {
      return res.status(500).send('Erro ao carregar o canal');
    }
    if (!row) {
      return res.status(404).send('Canal não encontrado');
    }

    res.render('admin/edit-channel', {
      pageTitle: 'Editar Canal',
      canal: row
    });
  });
};

// Função para editar um canal (atualiza o banco)
exports.editChannel = (req, res) => {
  const canalId = req.params.id;
  const { name, category, url } = req.body;

  db.run("UPDATE canais SET name = ?, category = ?, url = ? WHERE id = ?", [name, category, url, canalId], (err) => {
    if (err) {
      return res.status(500).send('Erro ao atualizar canal');
    }
    res.redirect('/admin/canais'); // Redireciona para a lista de canais
  });
};

// Função para excluir um canal
exports.deleteChannel = (req, res) => {
  const canalId = req.params.id;

  db.run("DELETE FROM canais WHERE id = ?", [canalId], (err) => {
    if (err) {
      return res.status(500).send('Erro ao excluir canal');
    }
    res.redirect('/admin/canais'); // Redireciona para a lista de canais
  });
};

// Função para atualizar os canais (já implementada anteriormente)
exports.updateChannels = async (req, res) => {
  try {
    const response = await axios.get('http://seusite.com/api/channels'); // Substitua pela sua URL real
    const channels = response.data.data;

    channels.forEach(canal => {
      const { id, name, category, url } = canal;

      db.get("SELECT * FROM canais WHERE id = ?", [id], (err, row) => {
        if (err) {
          console.error('Erro ao verificar canal:', err);
          return;
        }

        if (!row) {
          db.run(`
            INSERT INTO canais (id, name, category, url) 
            VALUES (?, ?, ?, ?)
          `, [id, name, category, url], (err) => {
            if (err) {
              console.error('Erro ao adicionar canal:', err);
            }
          });
        }
      });
    });

    res.redirect('/admin/canais');
  } catch (error) {
    console.error('Erro ao atualizar canais:', error);
    res.status(500).send('Erro ao atualizar canais');
  }
};
