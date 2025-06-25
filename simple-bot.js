const mineflayer = require('mineflayer');

// Configuration
const BOT_USERNAME = process.env.BOT_USERNAME || 'AI_Assistant';
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || 25565;

// Create bot instance
const bot = mineflayer.createBot({
  host: SERVER_HOST,
  port: SERVER_PORT,
  username: BOT_USERNAME,
  auth: 'offline', // Change to 'microsoft' for premium accounts
});

// Simple event handlers
bot.once('spawn', () => {
  console.log(`Bot ${BOT_USERNAME} spawned and ready!`);
  bot.chat("I'm online and ready to help!");
});

bot.on('chat', (username, message) => {
  if (username === bot.username) return;
  
  console.log(`${username} said: ${message}`);
  
  if (message === 'ping') {
    bot.chat('pong!');
  } else if (message.includes('hello')) {
    bot.chat(`Hello, ${username}!`);
  }
});
