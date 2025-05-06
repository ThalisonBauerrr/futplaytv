const path = require('path');
const helmet = require('helmet');
const express = require('express');

module.exports = (app) => {
  // Configurações de segurança reforçada
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        styleSrc: [
          "'self'",
          "'unsafe-inline'",
          "https://cdnjs.cloudflare.com/",
          "https://fonts.googleapis.com/",
          "https://vjs.zencdn.net/",
          "https://cdnjs.cloudflare.com/"
        ],
        fontSrc: [
          "'self'",
          "data:",
          "https://cdnjs.cloudflare.com/",
          "https://fonts.gstatic.com/",
          "https://fonts.googleapis.com/"
        ],
        scriptSrc: [
          "'self'",
          "https://entitlements.jwplayer.com/",
          "https://cdn.bcdn.zip/tv/scriptcanais26.js",
          "https://vjs.zencdn.net/",
          "https://cdnjs.cloudflare.com/",
          "https://entitlements.jwplayer.com/",
          "https://cdnjs.cloudflare.com/",
          "'unsafe-inline'"
        ],
        imgSrc: [
          "'self'",
          "data:",
          "https://playertv.net/",
          "https://reidoscanais.cc/",
          "https://logodetimes.com/",
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
          "https://netcinez.ch/",
          "https://tvl.nectinez.ch/",
          "https://embed.tvcdn.space/"
          
        ],
        frameSrc: [
          "'self'",
          "data:",
          "https://playertv.net/",
          "https://www.google.com/",
          "https://reidoscanais.cc/",
          "https://embedcanaistv.com/",
          "https://embed.tvcdn.space/",
          "https://embedtv-0.icu/",
          "https://placardefutebol.com.br/",
          "https://entitlements.jwplayer.com/",
          "https://meuplayeronlinehd.com/",
          "https://nossoplayeronlinehd.com/",
          "https://netcinez.ch/",
          "https://tvl.nectinez.ch/",
          "https://embed.tvcdn.space/"

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