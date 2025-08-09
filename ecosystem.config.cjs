module.exports = {
  apps: [{
    script: 'weeklybot/app.js'
  }],
  deploy: {
    production: {
      'user' : 'raz',
      'host' : '192.168.68.77',
      'ref'  : 'origin/main',
      'repo' : 'git@github.com:raz-a/weeklybot.git',
      'path' : '/home/raz/weeklybot',
      'post-deploy': 'npm install && npm run build pm2 reload ecosystem.config.cjs --env production'
    }
  }
};