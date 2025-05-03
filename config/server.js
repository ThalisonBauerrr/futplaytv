const path = require('path');
const helmet = require('helmet');
const express = require('express');

module.exports = (app) => {
  // Configurações de segurança reforçada
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.googleapis.com"  // Adicionando Google Fonts
        ],
        fontSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://fonts.gstatic.com"     // Domínio das fontes do Google
        ],
        scriptSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://entitlements.jwplayer.com/",
          "'unsafe-inline'"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://playertv.net/",
          "https://reidoscanais.cc",
          "https://logodetimes.com",
          "https://embedcanaistv.com/",
          "https://embed.tvcdn.space/",
          "https://frontendapiapp.blob.core.windows.net/",
          "https://ge.globo.com/",
          "https://s.sde.globo.com/",
          "https://embedtv-0.icu/",
          "https://placardefutebol.com.br/",
          "https://meuplayeronlinehd.com/",
          "https://nossoplayeronlinehd.com/",
          "https://www.google.com/",
          
        ],
        frameSrc: [
          "'self'",
          "data:",
          "https://playertv.net/",
          "https://www.google.com/",
          "https://reidoscanais.cc",
          "https://embedcanaistv.com/",
          "https://embed.tvcdn.space/",
          "https://embedtv-0.icu/",
          "https://placardefutebol.com.br/",
          "https://entitlements.jwplayer.com/",
          "https://meuplayeronlinehd.com/",
          "https://nossoplayeronlinehd.com/",
          
        ]
        
      }
    }
  }));

  app.set('views', [
    path.join(__dirname, '../src/views/home'),
    path.join(__dirname, '../src/views'),
    path.join(__dirname, '../src/views/partials')
  ]);
  
  app.set('view engine', 'ejs');
  
  // Middleware para arquivos estáticos
  app.use(express.static(path.join(__dirname, '../src/public'), {
    setHeaders: (res) => {
      res.set('X-Content-Type-Options', 'nosniff');
    }
  }))
};