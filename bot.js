const mineflayer = require('mineflayer');
const { pathfinder, Movements, goals } = require('mineflayer-pathfinder');
const collectBlock = require('mineflayer-collectblock').plugin;
const autoEat = require('mineflayer-auto-eat').loader;
const fetch = require('node-fetch');
const Vec3 = require('vec3');
const fs = require('fs');
const path = require('path');

// Configuration
const BOT_USERNAME = process.env.BOT_USERNAME || 'AI_Assistant';
const LLM_URL = process.env.LLM_URL || 'http://127.0.0.1:1234';
const LLM_MODEL = process.env.LLM_MODEL || 'meta-llama-3.1-8b-instruct';
const LLM_API_KEY = process.env.LLM_API_KEY || '';
const SERVER_HOST = process.env.SERVER_HOST || 'localhost';
const SERVER_PORT = process.env.SERVER_PORT || 25565;
const ENABLE_LLM = process.env.ENABLE_LLM !== 'false'; // Set to false to disable LLM

// Import memory and reinforcement learning systems
const memorySystem = require('./memory_system');
const reinforcementLearning = require('./reinforcement_learning');

// Helper functions defined before creating the bot
function cleanJson(text) {
  // Find JSON objects or arrays in the text
  const jsonMatch = text.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                    text.match(/{[\s\S]*}/);
  
  if (jsonMatch) {
    return jsonMatch[0].replace(/^```(?:json)?\s*/, '').replace(/\s*```$/, '').trim();
  }
  
  return text.trim();
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

// Add new functions for expanded capabilities
async function analyzeSurroundings(bot) {
  try {
    // Get nearby entities
    const nearbyEntities = Object.values(bot.entities)
      .filter(e => e.position.distanceTo(bot.entity.position) < 20)
      .map(e => ({
        type: e.type,
        name: e.name,
        distance: Math.round(e.position.distanceTo(bot.entity.position) * 10) / 10
      }));
    
    // Get nearby blocks of interest
    const mcData = require('minecraft-data')(bot.version);
    const interestingBlocks = [
      'chest', 'crafting_table', 'furnace', 'diamond_ore', 'iron_ore', 
      'gold_ore', 'coal_ore', 'ancient_debris', 'nether_portal', 'water', 'lava'
    ];
    
    const blockIds = interestingBlocks
      .map(name => mcData.blocksByName[name])
      .filter(block => block) // Filter out undefined blocks
      .map(block => block.id);
    
    const nearbyBlocks = bot.findBlocks({
      matching: blockIds,
      maxDistance: 15,
      count: 20
    });
    
    // Get current biome
    const biome = bot.world.getBiome(bot.entity.position);
    const biomeName = mcData.biomes[biome] ? mcData.biomes[biome].name : 'unknown';
    
    // Prepare the analysis
    let analysis = `I'm in a ${biomeName} biome. `;
    
    // Time of day
    const timeOfDay = bot.time.timeOfDay;
    if (timeOfDay < 1000) {
      analysis += "It's early morning. ";
    } else if (timeOfDay < 6000) {
      analysis += "It's daytime. ";
    } else if (timeOfDay < 12000) {
      analysis += "It's evening. ";
    } else {
      analysis += "It's nighttime. ";
    }
    
    // Nearby entities
    if (nearbyEntities.length > 0) {
      const players = nearbyEntities.filter(e => e.type === 'player');
      const mobs = nearbyEntities.filter(e => e.type === 'mob');
      const animals = nearbyEntities.filter(e => !players.includes(e) && !mobs.includes(e));
      
      if (players.length > 0) {
        analysis += `I can see ${players.length} player(s) nearby. `;
      }
      
      if (mobs.length > 0) {
        analysis += `There are ${mobs.length} mobs around. `;
      }
      
      if (animals.length > 0) {
        analysis += `I can also see ${animals.length} animals. `;
      }
    } else {
      analysis += "I don't see any entities nearby. ";
    }
    
    // Nearby blocks
    if (nearbyBlocks.length > 0) {
      analysis += "I can see: ";
      
      const blockNames = {};
      for (const pos of nearbyBlocks) {
        const block = bot.blockAt(pos);
        if (!block) continue;
        
        if (blockNames[block.name]) {
          blockNames[block.name]++;
        } else {
          blockNames[block.name] = 1;
        }
      }
      
      analysis += Object.entries(blockNames)
        .map(([name, count]) => `${count} ${name}`)
        .join(', ');
      
      analysis += " within 15 blocks of me.";
    } else {
      analysis += "I don't see any interesting blocks nearby.";
    }
    
    return { success: true, message: analysis };
  } catch (err) {
    return { success: false, message: `Error analyzing surroundings: ${err.message}` };
  }
}

async function craftItem(bot, itemName, quantity = 1) {
  try {
    const mcData = require('minecraft-data')(bot.version);
    const item = mcData.itemsByName[itemName];
    
    if (!item) {
      return { success: false, message: `I don't know how to craft ${itemName}` };
    }
    
    // Find recipes for the item
    const recipes = bot.recipesFor(item.id);
    
    if (recipes.length === 0) {
      return { success: false, message: `I don't have any recipes for ${itemName}` };
    }
    
    bot.chat(`Attempting to craft ${quantity} ${itemName}...`);
    
    // Find a crafting table nearby
    let craftingTable = bot.findBlock({
      matching: mcData.blocksByName.crafting_table.id,
      maxDistance: 6
    });
    
    // Try to craft
    try {
      await bot.craft(recipes[0], quantity, craftingTable);
      return { success: true, message: `Successfully crafted ${quantity} ${itemName}!` };
    } catch (craftErr) {
      return { 
        success: false, 
        message: `Failed to craft ${itemName}: ${craftErr.message}. Make sure I have the required materials.` 
      };
    }
  } catch (err) {
    return { success: false, message: `Error trying to craft ${itemName}: ${err.message}` };
  }
}

async function placeBlock(bot, blockType, x, y, z) {
  try {
    const mcData = require('minecraft-data')(bot.version);
    
    // Find the block in inventory
    const item = bot.inventory.items().find(item => item.name === blockType);
    
    if (!item) {
      return { 
        success: false, 
        message: `I don't have any ${blockType} in my inventory to place` 
      };
    }
    
    // Equip the block
    await bot.equip(item, 'hand');
    
    // Try to place the block
    const targetPos = new Vec3(x, y, z);
    
    // Find a face to place against
    const faces = [
      new Vec3(0, -1, 0), // Bottom (y-)
      new Vec3(0, 1, 0),  // Top (y+)
      new Vec3(-1, 0, 0), // West (x-)
      new Vec3(1, 0, 0),  // East (x+)
      new Vec3(0, 0, -1), // North (z-)
      new Vec3(0, 0, 1),  // South (z+)
    ];
    
    // Try each face until we find one that works
    for (const face of faces) {
      const adjacentPos = targetPos.plus(face);
      const adjacentBlock = bot.blockAt(adjacentPos);
      
      if (adjacentBlock && adjacentBlock.name !== 'air') {
        await bot.placeBlock(adjacentBlock, face.scaled(-1));
        return { 
          success: true, 
          message: `Placed ${blockType} at coordinates [${x}, ${y}, ${z}]` 
        };
      }
    }
    
    return { 
      success: false, 
      message: `Couldn't find a suitable face to place ${blockType} at [${x}, ${y}, ${z}]` 
    };
  } catch (err) {
    return { success: false, message: `Error placing block: ${err.message}` };
  }
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
    } else if (functionName === 'analyze_surroundings') {
      result = await analyzeSurroundings(bot);
    } else if (functionName === 'craft_item') {
      result = await craftItem(bot, args.itemName, args.quantity);
    } else if (functionName === 'place_block') {
      result = await placeBlock(bot, args.blockType, args.x, args.y, args.z);
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
  
  // Load bot memory
  memorySystem.loadMemory();
  
  console.log(`Bot ${BOT_USERNAME} spawned and ready!`);
  bot.chat("I'm online and ready to help!");
  
  // Set up periodic memory saving
  setInterval(memorySystem.saveMemory, 5 * 60 * 1000); // Save every 5 minutes
});

// Track the last action performed for learning
let lastAction = null;

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
        bot.chat("Commands: !follow [player], !mine <block> [qty], !move <x> <y> <z>, !look <x> <y> <z>, !inventory, !analyze, !craft <item> [qty], !place <block> <x> <y> <z>, !help");
      } else if (parts[0] === 'analyze') {
        // !analyze
        const result = await analyzeSurroundings(bot);
        bot.chat(result.message);
      } else if (parts[0] === 'craft') {
        // !craft <item_name> [quantity]
        if (parts.length < 2) {
          bot.chat("Please specify what to craft, e.g. !craft stick 4");
          return;
        }
        const itemName = parts[1];
        const quantity = parseInt(parts[2]) || 1;
        await craftItem(bot, itemName, quantity);
      } else if (parts[0] === 'place') {
        // !place <block_type> <x> <y> <z>
        if (parts.length < 5) {
          bot.chat("Please specify what to place and where, e.g. !place dirt 100 64 -200");
          return;
        }
        const blockType = parts[1];
        const x = parseInt(parts[2]);
        const y = parseInt(parts[3]);
        const z = parseInt(parts[4]);
        await placeBlock(bot, blockType, x, y, z);
      } else if (msg.startsWith('!')) {
        bot.chat(`Unknown command: ${parts[0]}. Type !help for a list of commands.`);
      }
    } catch (err) {
      bot.chat(`Error executing command: ${err.message}`);
    }
    
    // If it's a direct command (with !) then return
    if (msg.startsWith('!')) return;
  }
  
  // Check if this message is feedback about the last action
  if (lastAction) {
    const feedback = reinforcementLearning.processFeedback(user, msg, lastAction);
    if (feedback) {
      console.log(`Received ${feedback} feedback for action: ${lastAction.action}`);
      // Record this feedback interaction
      memorySystem.recordInteraction(user, msg, null, lastAction.action, feedback === 'positive');
      
      // Reset last action after processing feedback
      lastAction = null;
      // If it was just feedback, no need to process as a new command
      if (feedback === 'positive' && !msg.includes('now') && !msg.includes('also')) {
        return;
      }
    }
  }
  
  // Only proceed with LLM if it's enabled
  if (!ENABLE_LLM) return;

  try {
    // Get relevant context from memory to enhance the AI's response
    const context = memorySystem.getRelevantContext(user, msg);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (process.env.LLM_API_KEY) {
      headers['Authorization'] = `Bearer ${process.env.LLM_API_KEY}`;
    }

    const resp = await fetch(`${LLM_URL}/v1/chat/completions`, {
      method: 'POST',
      headers: headers,
      body: JSON.stringify({
        model: LLM_MODEL,
        messages: [
          {
            role: "system",
            content: `You are a helpful Minecraft bot assistant named ${BOT_USERNAME}.
You are in a Minecraft world and can perform actions and analyze the environment.
Instead of responding with JSON, just respond in natural language. The system will understand your intent.

CAPABILITIES:
1. You can follow players
2. You can mine blocks
3. You can navigate to coordinates
4. You can look at specific locations
5. You can analyze your inventory
6. You can observe your surroundings and describe what you see
7. You can craft items if you have the required materials
8. You can place blocks from your inventory

When responding, be natural and conversational. You don't need to include any special formatting 
or structured data. The system will understand your intentions from your natural language response.

${context.actionInsights ? `ACTION HISTORY:\n${context.actionInsights}\n` : ''}
${context.preferences ? `USER PREFERENCES:\n${context.preferences}\n` : ''}

PREVIOUS CONVERSATION:
${context.conversationHistory ? context.conversationHistory : 'This is the start of your conversation.'}`
          },
          {
            role: "user",
            content: `${user} says: ${msg}`
          }
        ],
        temperature: 0.8,
        max_tokens: 800
      })
    });
    
    const raw = await resp.json();
    console.log('LLM response:', JSON.stringify(raw));
    
    let content = '';
    if (raw.choices && raw.choices[0] && raw.choices[0].message) {
      content = raw.choices[0].message.content || '';
      console.log('LLM content:', content);
    } else {
      console.error('Unexpected API response format:', raw);
      bot.chat("I received an unexpected response format from my AI brain.");
      return;
    }
    
    // Send the response to the user
    bot.chat(content);
    
    // Record this interaction
    memorySystem.recordInteraction(user, msg, content);
    
    // Try to interpret if there's an action to take
    const actionInfo = reinforcementLearning.interpretAction(content);
    
    if (actionInfo) {
      console.log('Detected action:', actionInfo);
      lastAction = actionInfo; // Store for potential feedback
      
      const { action, params = {} } = actionInfo;
      try {
        let result;
        
        // Execute the appropriate action
        if (action === 'follow') {
          result = await followPlayer(bot, params.playerName || user);
        } else if (action === 'mine') {
          result = await mineBlock(bot, params.blockType, params.quantity);
        } else if (action === 'look') {
          result = await lookAt(bot, params.x, params.y, params.z);
        } else if (action === 'move') {
          result = await moveTo(bot, params.x, params.y, params.z);
        } else if (action === 'inventory') {
          result = getInventory(bot);
        } else if (action === 'analyze') {
          result = await analyzeSurroundings(bot);
        } else if (action === 'craft') {
          result = await craftItem(bot, params.itemName, params.quantity);
        } else if (action === 'place') {
          result = await placeBlock(bot, params.blockType, params.x, params.y, params.z);
        }
        
        // Update the action success record
        if (result) {
          memorySystem.recordInteraction(user, msg, content, action, result.success);
          
          // Only say the result message if the action was not mentioned in the original response
          if (result.message && !content.toLowerCase().includes(result.message.toLowerCase())) {
            bot.chat(result.message);
          }
        }
      } catch (err) {
        console.error(`Error executing ${action}:`, err);
        memorySystem.recordInteraction(user, msg, content, action, false);
        bot.chat(`Error: ${err.message}`);
      }
    }
  } catch (err) {
    console.error('Error connecting to LLM:', err.message);
    bot.chat(`I couldn't connect to my AI brain (${LLM_MODEL} at ${LLM_URL}). Please check if LM Studio is running. You can use direct commands like !follow, !mine dirt, etc. (Type !help for more info)`);
  }
});

// Add more event handlers as needed
bot.on('kicked', console.log);
bot.on('error', console.log);
