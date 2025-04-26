const db = require('../../config/database');  // Conexão com o banco de dados

// Função para exibir a página de login
exports.showLoginPage = (req, res) => {
  // Obter mensagem de erro do flash se existir
  const error = req.flash('error')[0] || null;
  
  res.render('admin/login', {
    pageTitle: 'Login - Painel de Administração',
    error: error // Passa a mensagem de erro para a view
  });
};

exports.login = (req, res) => {
  const { login, senha } = req.body || {};

  if (!login || !senha) {
    req.flash('error', 'Login ou senha não fornecidos');
    return res.redirect('/admin/login');
  }

  const loginTrimmed = login.trim();
  const senhaTrimmed = senha.trim();

  db.get("SELECT * FROM admin WHERE login = ?", [loginTrimmed], (err, row) => {
    if (err) {
      console.error('Erro ao verificar usuário:', err);
      req.flash('error', 'Erro interno no servidor');
      return res.redirect('/admin/login');
    }

    if (!row || row.senha !== senhaTrimmed) {
      req.flash('error', 'Credenciais inválidas');
      return res.redirect('/admin/login');
    }

    req.session.isAdmin = true;
    req.session.userLevel = row.nivel;
    
    return res.redirect('/admin');
  });
};


// Função para exibir a página principal de administração (após login)
exports.showAdminPage = (req, res) => {
  // Verifica se o usuário está logado e se tem permissão de admin
  console.log(req.session.isAdmin)
  if (!req.session.isAdmin) {
    return res.redirect('/admin/login'); // Redireciona para a página de login se não estiver autenticado como admin
  }

  res.render('admin/index', {
    pageTitle: 'Painel de Administração',
    userLevel: req.session.userLevel  // Passando o nível de acesso para a página
  });
};

// Função para fazer logout
exports.logout = (req, res) => {
  req.session.destroy((err) => {
    if (err) {
      return res.status(500).send('Erro ao fazer logout');
    }
    res.redirect('/admin/login');
  });
};
