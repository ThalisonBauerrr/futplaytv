const sqlite3 = require('sqlite3').verbose();
const db = new sqlite3.Database('./futplay.db');  // Altere conforme o caminho do seu banco

// Exibir todos os times
const showAllTimes = (req, res) => {
    db.all('SELECT * FROM times', [], (err, rows) => {
        if (err) {
            return res.status(500).send('Erro ao recuperar os times');
        }
        res.render('admin/times', { times: rows, pageTitle: 'Gerenciar Times' });
    });
};

// Exibir o formulário de edição de um time
const showEditTimeForm = (req, res) => {
    const timeId = req.params.id;
    db.get('SELECT * FROM times WHERE id = ?', [timeId], (err, row) => {
        if (err) {
            return res.status(500).send('Erro ao carregar o time');
        }
        if (!row) {
            return res.status(404).send('Time não encontrado');
        }
        res.render('admin/edit-time', { time: row, pageTitle: 'Editar Time' });
    });
};

// Atualizar as informações de um time
const updateTime = (req, res) => {
    const { name, logo } = req.body;
    const timeId = req.params.id;

    // Verificando se todos os campos estão presentes
    if (!name || !logo) {
        return res.status(400).send('Nome e logo são obrigatórios');
    }

    db.run('UPDATE times SET name = ?, logo = ? WHERE id = ?', [name, logo, timeId], function(err) {
        if (err) {
            return res.status(500).send('Erro ao atualizar o time');
        }
        // Se a atualização for bem-sucedida, redireciona para a lista de times
        res.redirect('/admin/times');
    });
};

// Exibir o formulário para adicionar um novo time
const showAddTimeForm = (req, res) => {
    res.render('admin/add-time', { pageTitle: 'Adicionar Time' });
};

// Adicionar um novo time
const addTime = (req, res) => {
    const { name, logo } = req.body;

    // Verificando se todos os campos estão presentes
    if (!name || !logo) {
        return res.status(400).send('Nome e logo são obrigatórios');
    }

    db.run('INSERT INTO times (name, logo) VALUES (?, ?)', [name, logo], function(err) {
        if (err) {
            return res.status(500).send('Erro ao adicionar o time');
        }
        // Se o time for adicionado com sucesso, redireciona para a lista de times
        res.redirect('/admin/times');
    });
};

module.exports = { showAllTimes, showEditTimeForm, updateTime, showAddTimeForm, addTime };
