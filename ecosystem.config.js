module.exports = {
    apps: [{
      name: "futplaytv",
      script: "node",           // Chama o Node.js diretamente
      args: "server.js",        // Passa o arquivo como argumento
      cwd: "/root/futplaytv",   // Diretório do projeto
      env: {
        NODE_ENV: "production",
        DISPLAY: ":99"         // Para Puppeteer, se necessário
      }
    }]
  };