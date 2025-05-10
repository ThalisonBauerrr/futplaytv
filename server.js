
const {updateTransmissoes} = require('./src/services/updateTransmissoes');
const registroDiarioService = require('./src/services/system');
const {atualizarPlacaresNoBanco} = require('./src/services/atualizaPartida');
const { atualizarStatusPagamentos } = require('./src/services/mercadoPagoService');
const errorHandler = require('./src/middlewares/errorHandler');
const authRoutes = require('./src/routes/authRoutes');
const express = require('express');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const flash = require('connect-flash');

const cron = require('node-cron');  // Adiciona a dependência do node-cron
const app = express();
const cors = require('cors');
const port = 3000;

// Configuração para ler cookies (Deve vir antes de qualquer outra lógica que use os cookies)
app.use(cookieParser());  // Middleware para ler cookies
app.use(express.urlencoded({ extended: true })); // Para formulários HTML
app.use(express.json()); // Para APIs JSON

// Middleware para gerar e armazenar um ID único
app.use((req, res, next) => {
  let uuidUsuario = req.cookies.uuid;

  if (!uuidUsuario) {
    // Se o UUID não estiver no cookie, gera um novo UUID
    uuidUsuario = uuidv4();

    // Armazenar o UUID no cookie
    res.cookie('uuid', uuidUsuario, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000, // 1 hora
      sameSite: 'strict' // Proteção adicional contra CSRF
    });
  }
  
  // Tornar o UUID disponível para as views/templates
  res.locals.uuid = uuidUsuario;
  next();
});

// Configuração da sessão
app.use(session({
  secret: 'sua-chave-secreta', // Troque por uma chave segura
  resave: false,
  saveUninitialized: true,
  cookie: { secure: false } // Defina como true se estiver usando HTTPS
}));

// Configuração do flash
app.use(flash());

// Middleware para disponibilizar flash messages para todas as views
app.use((req, res, next) => {
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// No backend (app.js)
app.use(cors({
  origin: 'http://localhost:3000',
  credentials: true
}));
// Configurações adicionais do servidor (não alterei)
require('./config/server')(app); // Manter a configuração do servidor conforme já está

// Configuração para servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'src/public'))); // Ajuste conforme sua estrutura

// Configuração das views
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'ejs');

// Importando as rotas
// Proxy reverso para nossoplayeronlinehd.com
app.use('/', require('./src/routes/streamRoutes'));
app.use('/admin', require('./src/routes/adminRoutes'));
app.use('/api/auth', authRoutes);
app.get('/api/get-uuid', (req, res) => {
  res.json({ uuid: req.cookies.uuid });
});
// Rotina de inicialização
async function iniciarRotinas() {
  console.log('🔄 Iniciando rotina diária...');
  const resultado = await registroDiarioService.executarRotinaDiaria();

    if(resultado.status==="skipped"){
      console.log(resultado.message)
    }else if(resultado.status==="success"){
      console.log(resultado.message)
      await updateTransmissoes()
    }
}

// Agenda a rotina diária às 1:00 AM (Brasília)
async function agendarRotinaDiaria() {
  cron.schedule('0 1 * * *', async () => {
    console.log('⏰ Disparando rotina programada (1:00 AM BRT)');
    await iniciarRotinas();
  }, {
    scheduled: true,
    timezone: "America/Sao_Paulo"
  });
}



async function crons() {
  cron.schedule('*/1 * * * *', async () => { // Rodando a cada 5 minutos
    try {
      //console.log('🔄 Verificando status de pagamentos...');
      const resultado = await atualizarStatusPagamentos();
      console.log(`🔄 ${resultado.atualizados}/${resultado.total} pagamentos verificados`);
    } catch (error) {
      console.error('❌ Erro ao verificar pagamentos:', error.message);
    }

    try {
      await atualizarPlacaresNoBanco();
      //console.log(`✅ ${atualizadas} placares atualizados com sucesso!`);
    } catch (error) {
      console.error('❌ Erro ao atualizar placares:', error.message);
    }
    
  }, {
    timezone: "America/Sao_Paulo"
  });
}

app.get('/', (req, res) => {
  res.send('Servidor rodando!');
});

// Middleware de erro (deve ser o último)
app.use(errorHandler);
// No final do arquivo, modifique a parte que inicia o servidor:
app.listen(3000, '0.0.0.0', async () => {
  console.log(`Servidor rodando em http://localhost:${port}`);
  await iniciarRotinas();
  await agendarRotinaDiaria();
  await crons();
});