const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const autoEat = require('mineflayer-auto-eat').loader;
const fetch = require('node-fetch');
const Vec3 = require('vec3');

// Configuration
const BOT_USERNAME = process.env.BOT_USERNAME || 'AI_Assistant';
const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234';
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || 25565;
const ENABLE_LLM = process.env.ENABLE_LLM !== 'false'; // Set to false to disable LLM

// Helper functions defined before creating the bot
function cleanJson(text) {
  return text
    .replace(/^```(?:json)?\s*/, '')
    .replace(/\s*```$/, '')
    .trim();
}

async function followPlayer(bot, playerName) {
  const player = bot.players[playerName];
  
  if (!player || !player.entity) {
    return { success: false, message: `I can't see ${playerName}. Are they nearby?` };
  }
  
  bot.chat(`Following ${playerName}`);
  
  try {
    // Create a goal that follows the player
    const goal = new goals.GoalFollow(player.entity, 2); // Follow within 2 blocks
    bot.pathfinder.setGoal(goal, true);
    return { success: true, message: `I'm now following ${playerName}!` };
  } catch (err) {
    return { success: false, message: `Failed to follow ${playerName}: ${err.message}` };
  }
}

async function mineBlock(bot, blockType, quantity = 1) {
  const mcData = require('minecraft-data')(bot.version);
  const blockID = mcData.blocksByName[blockType];
  
  if (!blockID) {
    return { success: false, message: `I don't know any block called ${blockType}` };
  }
  
  try {
    bot.chat(`Looking for ${blockType} to mine...`);
    
    // Find blocks of the requested type
    const blocks = bot.findBlocks({
      matching: blockID.id,
      maxDistance: 32,
      count: quantity
    });
    
    if (blocks.length === 0) {
      return { success: false, message: `I couldn't find any ${blockType} blocks nearby.` };
    }
    
    let successCount = 0;
    
    for (let i = 0; i < Math.min(blocks.length, quantity); i++) {
      const block = bot.blockAt(blocks[i]);
      
      if (!block) continue;
      
      try {
        await bot.collectBlock.collect(block);
        successCount++;
      } catch (err) {
        console.error(`Failed to collect block at ${blocks[i]}: ${err.message}`);
      }
    }
    
    if (successCount > 0) {
      return { 
        success: true, 
        message: `Mined ${successCount} ${blockType} blocks!` 
      };
    } else {
      return { 
        success: false, 
        message: `Found ${blocks.length} ${blockType} blocks but couldn't mine any of them.` 
      };
    }
  } catch (err) {
    return { success: false, message: `Error mining ${blockType}: ${err.message}` };
  }
}

async function lookAt(bot, x, y, z) {
  try {
    await bot.lookAt(new Vec3(x, y, z));
    return { success: true, message: `Looking at coordinates [${x}, ${y}, ${z}]` };
  } catch (err) {
    return { success: false, message: `Failed to look at target: ${err.message}` };
  }
}

async function moveTo(bot, x, y, z) {
  try {
    const goal = new goals.GoalBlock(x, y, z);
    await bot.pathfinder.goto(goal);
    return { success: true, message: `Moved to coordinates [${x}, ${y}, ${z}]` };
  } catch (err) {
    return { success: false, message: `Failed to move to target: ${err.message}` };
  }
}

function getInventory(bot) {
  const items = bot.inventory.items();
  if (items.length === 0) {
    return { success: true, message: "My inventory is empty." };
  }
  
  const itemCounts = {};
  for (const item of items) {
    if (itemCounts[item.name]) {
      itemCounts[item.name] += item.count;
    } else {
      itemCounts[item.name] = item.count;
    }
  }
  
  const itemList = Object.entries(itemCounts)
    .map(([name, count]) => `${count}x ${name}`)
    .join(', ');
  
  return { 
    success: true, 
    message: `My inventory contains: ${itemList}` 
  };
}

async function handleToolCall(bot, call) {
  console.log('Handling tool call:', call);
  
  try {
    // Parse the function arguments
    const args = JSON.parse(call.function.arguments);
    const functionName = call.function.name;
    
    let result;
    // Execute the appropriate function based on the name
    if (functionName === 'follow_player') {
      result = await followPlayer(bot, args.playerName);
    } else if (functionName === 'mine_blocks') {
      result = await mineBlock(bot, args.blockType, args.quantity);
    } else if (functionName === 'look_at') {
      result = await lookAt(bot, args.x, args.y, args.z);
    } else if (functionName === 'move_to') {
      result = await moveTo(bot, args.x, args.y, args.z);
    } else if (functionName === 'get_inventory') {
      result = getInventory(bot);
    } else {
      bot.chat(`Unknown function: ${functionName}`);
      return;
    }
    
    // Report the result back to the user
    if (result.message) {
      bot.chat(result.message);
    }
  } catch (err) {
    console.error('Error handling tool call:', err);
    bot.chat(`Error executing action: ${err.message}`);
  }
}

// Create bot instance
const bot = mineflayer.createBot({
  host: SERVER_HOST,
  port: SERVER_PORT,
  username: BOT_USERNAME,
  auth: 'offline', // Change to 'microsoft' for premium accounts
});

// Load plugins
bot.loadPlugin(pathfinder);
bot.loadPlugin(collectBlock);
bot.loadPlugin(autoEat);

// Configure auto-eat plugin
bot.once('spawn', () => {
  bot.autoEat.options = {
    priority: 'foodPoints',
    startAt: 14,
    bannedFood: [],
  };
  
  // Initialize pathfinder
  const mcData = require('minecraft-data')(bot.version);
  const defaultMove = new Movements(bot, mcData);
  bot.pathfinder.setMovements(defaultMove);
  
  console.log(`Bot ${BOT_USERNAME} spawned and ready!`);
  bot.chat("I'm online and ready to help!");
});

// Set up chat handler
bot.on('chat', async (user, msg) => {
  if (user === bot.username) return;

  // Basic command handling without LLM if it's disabled or unavailable
  if (!ENABLE_LLM || msg.startsWith('!')) {
    // Direct command mode with ! prefix
    const command = msg.startsWith('!') ? msg.substring(1).trim() : msg.trim();
    const parts = command.split(' ');
    
    try {
      if (parts[0] === 'follow') {
        // !follow <player_name>
        await followPlayer(bot, parts[1] || user);
      } else if (parts[0] === 'mine' || parts[0] === 'dig') {
        // !mine <block_type> [quantity]
        if (parts.length < 2) {
          bot.chat("Please specify what to mine, e.g. !mine dirt 5");
          return;
        }
        const blockType = parts[1];
        const quantity = parseInt(parts[2]) || 1;
        await mineBlock(bot, blockType, quantity);
      } else if (parts[0] === 'move' || parts[0] === 'goto') {
        // !move <x> <y> <z>
        if (parts.length < 4) {
          bot.chat("Please specify coordinates, e.g. !move 100 64 -200");
          return;
        }
        const x = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        const z = parseInt(parts[3]);
        await moveTo(bot, x, y, z);
      } else if (parts[0] === 'look') {
        // !look <x> <y> <z>
        if (parts.length < 4) {
          bot.chat("Please specify coordinates, e.g. !look 100 64 -200");
          return;
        }
        const x = parseInt(parts[1]);
        const y = parseInt(parts[2]);
        const z = parseInt(parts[3]);
        await lookAt(bot, x, y, z);
      } else if (parts[0] === 'inventory' || parts[0] === 'inv') {
        // !inventory
        const result = getInventory(bot);
        bot.chat(result.message);
      } else if (parts[0] === 'help') {
        // !help
        bot.chat("Commands: !follow, !mine <block> [qty], !move <x> <y> <z>, !look <x> <y> <z>, !inventory, !help");
      } else if (msg.startsWith('!')) {
        bot.chat(`Unknown command: ${parts[0]}. Type !help for a list of commands.`);
      }
    } catch (err) {
      bot.chat(`Error executing command: ${err.message}`);
    }
    
    // If it's a direct command (with !) then return
    if (msg.startsWith('!')) return;
  }
  
  // Only proceed with LLM if it's enabled
  if (!ENABLE_LLM) return;

  try {
    const resp = await fetch(LLM_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: "gpt-3.5-turbo",
        messages: [
          {
            role: "system",
            content: "You are a helpful Minecraft bot assistant. Respond with valid JSON containing either a tool_call or an action to perform in the game. Your response must be parseable JSON."
          },
          {
            role: "user",
            content: `${user} says: ${msg}`
          }
        ],
        temperature: 0.7
      })
    });
    
    const raw = await resp.json();
    let content = raw.choices[0].message.content || '';
    content = cleanJson(content);

    let parsed;
    try {
      parsed = JSON.parse(content);
    } catch (e) {
      console.error('Invalid JSON:', content);
      return bot.chat("Sorry, I couldn't parse the response.");
    }

    // Handle OpenAI-style tool_calls
    if (parsed.tool_calls && parsed.tool_calls.length) {
      const call = parsed.tool_calls[0];
      await handleToolCall(bot, call);
      return;
    }

    // Handle simple action format
    if (parsed.action) {
      const { action, params, chatReply } = parsed;
      try {
        if (action === 'follow') {
          await followPlayer(bot, params.playerName);
        } else if (action === 'mine') {
          await mineBlock(bot, params.blockType, params.quantity);
        }
        bot.chat(chatReply);
      } catch (err) {
        bot.chat(`Error: ${err.message}`);
      }
      return;
    }

    // Fallback plain chat
    bot.chat(content);
  } catch (err) {
    console.error('Error connecting to LLM:', err.message);
    bot.chat(`I couldn't connect to my AI brain. You can use direct commands like !follow, !mine dirt, etc. (Type !help for more info)`);
  }
});
