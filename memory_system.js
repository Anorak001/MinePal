// Memory and learning system for MinePal
const fs = require('fs');
const path = require('path');

// Memory file location
const MEMORY_FILE = path.join(__dirname, 'bot_memory.json');
const CONTEXT_WINDOW = 10; // Number of recent interactions to include in context

// Initialize bot memory
let botMemory = {
  interactions: [],   // Store past interactions
  feedback: {},       // Store user feedback for learning
  actionSuccess: {},  // Track success rates of different actions
  playerPreferences: {},  // Remember user preferences
  lastSeen: {}        // Track when things were last seen
};

// Load memory if it exists
function loadMemory() {
  try {
    if (fs.existsSync(MEMORY_FILE)) {
      const data = fs.readFileSync(MEMORY_FILE, 'utf8');
      botMemory = JSON.parse(data);
      console.log('Loaded bot memory from disk');
    }
  } catch (err) {
    console.error('Error loading memory:', err);
  }
}

// Save memory periodically
function saveMemory() {
  try {
    fs.writeFileSync(MEMORY_FILE, JSON.stringify(botMemory, null, 2));
    console.log('Saved bot memory to disk');
  } catch (err) {
    console.error('Error saving memory:', err);
  }
}

// Record an interaction in memory
function recordInteraction(user, message, botResponse, action = null, success = null) {
  const timestamp = new Date().toISOString();
  
  botMemory.interactions.push({
    timestamp,
    user,
    message,
    botResponse,
    action,
    success
  });
  
  // Keep only the recent interactions to avoid memory file getting too large
  if (botMemory.interactions.length > 1000) {
    botMemory.interactions = botMemory.interactions.slice(-1000);
  }
  
  // If action was performed, update success rates
  if (action && success !== null) {
    if (!botMemory.actionSuccess[action]) {
      botMemory.actionSuccess[action] = { success: 0, failure: 0 };
    }
    
    if (success) {
      botMemory.actionSuccess[action].success++;
    } else {
      botMemory.actionSuccess[action].failure++;
    }
  }
  
  // Save memory every 10 interactions
  if (botMemory.interactions.length % 10 === 0) {
    saveMemory();
  }
}

// Extract relevant context for the current interaction
function getRelevantContext(user, message) {
  // Get recent interactions with this user
  const userInteractions = botMemory.interactions
    .filter(i => i.user === user)
    .slice(-CONTEXT_WINDOW);
  
  // Build context from past interactions
  const conversationHistory = userInteractions.map(i => 
    `${i.user}: ${i.message}\n${process.env.BOT_USERNAME || 'AI_Assistant'}: ${i.botResponse}`
  ).join('\n');
  
  // Include success rates of relevant actions
  let actionInsights = '';
  if (botMemory.actionSuccess) {
    Object.entries(botMemory.actionSuccess).forEach(([action, stats]) => {
      const total = stats.success + stats.failure;
      const rate = total > 0 ? Math.round((stats.success / total) * 100) : 0;
      actionInsights += `${action}: ${rate}% success rate (${total} attempts)\n`;
    });
  }
  
  // Include any known preferences for this user
  let preferences = '';
  if (botMemory.playerPreferences[user]) {
    preferences = `${user}'s preferences: ${JSON.stringify(botMemory.playerPreferences[user])}\n`;
  }
  
  return {
    conversationHistory,
    actionInsights,
    preferences
  };
}

module.exports = {
  botMemory,
  loadMemory,
  saveMemory,
  recordInteraction,
  getRelevantContext
};
