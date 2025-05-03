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
          "https://fonts.googleapis.com"
        ],
        fontSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com", 
          "https://fonts.gstatic.com"
        ],
        scriptSrc: [
          "'self'",
          "https://cdnjs.cloudflare.com",
          "https://entitlements.jwplayer.com/",
          "'unsafe-inline'"
        ],
        imgSrc: [
          "'self'",
          "https://playertv.net/",
          "https://reidoscanais.cc",
          "https://logodetimes.com",
          "https://embedcanaistv.com/",
          "https://embed.tvcdn.space/",
          "https://frontendapiapp.blob.core.windows.net/",
          "https://ge.globo.com/",
          "https://s.sde.globo.com", // Remove trailing slash
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
        ],
        upgradeInsecureRequests: null // Importante para mixed content
      }
    },
    hsts: false // Desativa pois estamos usando HTTP
  }));

  // Configurações de views (mantido)
  app.set('views', [
    path.join(__dirname, '../src/views/home'),
    path.join(__dirname, '../src/views'),
    path.join(__dirname, '../src/views/partials')
  ]);
  
  app.set('view engine', 'ejs');

  // Middleware para desativar headers problemáticos
  app.use((req, res, next) => {
    res.removeHeader('Origin-Agent-Cluster');
    res.set('X-Content-Type-Options', 'nosniff');
    next();
  });
};
