const { updateTransmissoes } = require('./src/services/updateTransmissoes');
const registroDiarioService = require('./src/services/system');
const { atualizarPlacaresNoBanco } = require('./src/services/atualizaPartida');
const { atualizarStatusPagamentos } = require('./src/services/mercadoPagoService');

const express = require('express');
const session = require('express-session');
const path = require('path');
const cookieParser = require('cookie-parser');
const { v4: uuidv4 } = require('uuid');
const flash = require('connect-flash');
const cron = require('node-cron');
const helmet = require('helmet'); // Adicione para segurança
const compression = require('compression'); // Adicione para performance

const app = express();
const port = process.env.PORT || 3000;

// Configurações de Segurança
app.use(helmet());
app.use(compression());

// Configurações básicas
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// Configuração de sessão melhorada
app.use(session({
  secret: process.env.SESSION_SECRET || 'sua-chave-secreta-forte',
  resave: false,
  saveUninitialized: false,
  cookie: { 
    secure: process.env.NODE_ENV === 'production',
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000 // 1 dia
  }
}));

// Flash messages
app.use(flash());

// Middleware para variáveis globais
app.use((req, res, next) => {
  // UUID
  if (!req.cookies.uuid) {
    const uuidUsuario = uuidv4();
    res.cookie('uuid', uuidUsuario, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      maxAge: 3600000
    });
    req.uuidUsuario = uuidUsuario;
  } else {
    req.uuidUsuario = req.cookies.uuid;
  }

  // Flash messages
  res.locals.success = req.flash('success');
  res.locals.error = req.flash('error');
  next();
});

// Configuração de views
app.set('views', path.join(__dirname, 'src', 'views'));
app.set('view engine', 'ejs');

// Rotas
app.use('/', require('./src/routes/streamRoutes'));
app.use('/admin', require('./src/routes/adminRoutes'));

// Rotinas agendadas
const iniciarRotinas = async () => {
  try {
    console.log('🔄 Iniciando rotina diária...');
    const resultado = await registroDiarioService.executarRotinaDiaria();
    
    if (resultado.status === "success") {
      await updateTransmissoes();
    }
    console.log(resultado.message);
  } catch (error) {
    console.error('❌ Erro na rotina diária:', error);
  }
};

const agendarRotinas = () => {
  // Rotina diária às 1:00 AM
  cron.schedule('0 1 * * *', async () => {
    console.log('⏰ Disparando rotina programada (1:00 AM BRT)');
    try {
      await registroDiarioService.executarRotinaDiaria();
      await updateTransmissoes();
    } catch (error) {
      console.error('❌ Erro na rotina agendada:', error);
    }
  }, {
    timezone: "America/Sao_Paulo"
  });

  // Rotina a cada 5 minutos
  cron.schedule('*/5 * * * *', async () => {
    try {
      const pagamentos = await atualizarStatusPagamentos();
      console.log(`🔄 ${pagamentos.atualizados}/${pagamentos.total} pagamentos verificados`);
      
      await atualizarPlacaresNoBanco();
    } catch (error) {
      console.error('❌ Erro nas rotinas periódicas:', error);
    }
  }, {
    timezone: "America/Sao_Paulo"
  });
};

// Rota básica de saúde
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'healthy' });
});

// Inicialização do servidor
app.listen(port, '0.0.0.0', async () => {
  console.log(`🚀 Servidor rodando em http://localhost:${port}`);
  
  await iniciarRotinas();
  agendarRotinas();
});

// Tratamento de erros não capturados
process.on('unhandledRejection', (reason, promise) => {
  console.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  console.error('Uncaught Exception:', error);
  process.exit(1);
});