// Import memory system
const memorySystem = require('./memory_system');

// Process natural language to identify likely actions
function interpretAction(content) {
  // No need for strict JSON parsing - use natural language understanding
  
  // Look for action keywords in the response
  const actionKeywords = {
    follow: ['follow', 'following', 'come with', 'come to'],
    mine: ['mine', 'dig', 'gather', 'collect'],
    move: ['move to', 'go to', 'travel to', 'walk to'],
    look: ['look at', 'observe', 'view'],
    inventory: ['inventory', 'what do i have', 'what am i carrying'],
    analyze: ['analyze', 'describe surroundings', 'what do you see'],
    craft: ['craft', 'make', 'create', 'build'],
    place: ['place', 'put', 'set down']
  };
  
  // Check if the content contains action keywords
  for (const [action, keywords] of Object.entries(actionKeywords)) {
    if (keywords.some(keyword => content.toLowerCase().includes(keyword))) {
      // Extract parameters based on the action
      let params = {};
      
      if (action === 'follow') {
        // Look for player names
        const playerMatch = content.match(/follow\s+(\w+)/i) || content.match(/following\s+(\w+)/i);
        if (playerMatch && playerMatch[1]) {
          params.playerName = playerMatch[1];
        }
      } else if (action === 'mine') {
        // Look for block types and quantities
        const blockMatch = content.match(/mine\s+(?:some\s+)?(\w+)/i) || 
                          content.match(/gather\s+(?:some\s+)?(\w+)/i) ||
                          content.match(/collect\s+(?:some\s+)?(\w+)/i);
        
        const quantityMatch = content.match(/(\d+)\s+(\w+)/i);
        
        if (blockMatch && blockMatch[1]) {
          params.blockType = blockMatch[1].toLowerCase();
          params.quantity = 1; // default
        }
        
        if (quantityMatch && quantityMatch[1] && quantityMatch[2]) {
          params.quantity = parseInt(quantityMatch[1]);
          // If we found a quantity but no block type yet, use the second part
          if (!params.blockType) {
            params.blockType = quantityMatch[2].toLowerCase();
          }
        }
      } else if (action === 'move' || action === 'look') {
        // Look for coordinates
        const coordsMatch = content.match(/\b(\d+)[,\s]+(\d+)[,\s]+(\d+)\b/);
        if (coordsMatch) {
          params.x = parseInt(coordsMatch[1]);
          params.y = parseInt(coordsMatch[2]);
          params.z = parseInt(coordsMatch[3]);
        }
      } else if (action === 'craft') {
        // Look for item names and quantities
        const itemMatch = content.match(/craft\s+(?:some\s+)?(\w+)/i) || 
                         content.match(/make\s+(?:some\s+)?(\w+)/i);
        
        const quantityMatch = content.match(/(\d+)\s+(\w+)/i);
        
        if (itemMatch && itemMatch[1]) {
          params.itemName = itemMatch[1].toLowerCase();
          params.quantity = 1; // default
        }
        
        if (quantityMatch && quantityMatch[1] && quantityMatch[2]) {
          params.quantity = parseInt(quantityMatch[1]);
          // If we found a quantity but no item type yet, use the second part
          if (!params.itemName) {
            params.itemName = quantityMatch[2].toLowerCase();
          }
        }
      } else if (action === 'place') {
        // Look for block type and coordinates
        const blockMatch = content.match(/place\s+(?:a\s+)?(\w+)/i) || 
                          content.match(/put\s+(?:a\s+)?(\w+)/i);
        
        const coordsMatch = content.match(/\b(\d+)[,\s]+(\d+)[,\s]+(\d+)\b/);
        
        if (blockMatch && blockMatch[1]) {
          params.blockType = blockMatch[1].toLowerCase();
        }
        
        if (coordsMatch) {
          params.x = parseInt(coordsMatch[1]);
          params.y = parseInt(coordsMatch[2]);
          params.z = parseInt(coordsMatch[3]);
        }
      }
      
      return { action, params };
    }
  }
  
  // No action detected
  return null;
}

// Learn from user feedback
function processFeedback(user, message, previousAction) {
  const lowercaseMsg = message.toLowerCase();
  
  // Detect positive feedback
  const positivePatterns = [
    'good', 'great', 'thanks', 'thank you', 'awesome', 'perfect', 'nice', 'well done'
  ];
  
  // Detect negative feedback
  const negativePatterns = [
    'wrong', 'incorrect', 'not right', 'stop', 'bad', 'terrible', 'no', 'don\'t'
  ];
  
  let feedback = null;
  
  if (positivePatterns.some(pattern => lowercaseMsg.includes(pattern))) {
    feedback = 'positive';
  } else if (negativePatterns.some(pattern => lowercaseMsg.includes(pattern))) {
    feedback = 'negative';
  }
  
  // If we detected feedback and there was a previous action
  if (feedback && previousAction) {
    if (!memorySystem.botMemory.feedback[previousAction.action]) {
      memorySystem.botMemory.feedback[previousAction.action] = { positive: 0, negative: 0 };
    }
    
    if (feedback === 'positive') {
      memorySystem.botMemory.feedback[previousAction.action].positive++;
      
      // If user has specific preferences, remember them
      if (previousAction.params) {
        if (!memorySystem.botMemory.playerPreferences[user]) {
          memorySystem.botMemory.playerPreferences[user] = {};
        }
        memorySystem.botMemory.playerPreferences[user][previousAction.action] = previousAction.params;
      }
    } else {
      memorySystem.botMemory.feedback[previousAction.action].negative++;
    }
    
    memorySystem.saveMemory();
  }
  
  return feedback;
}

// Create a learning rate function that gives different weight to actions based on success history
function getLearningRate(action) {
  if (!memorySystem.botMemory.feedback[action]) {
    return 0.5; // default learning rate for new actions
  }
  
  const positive = memorySystem.botMemory.feedback[action].positive || 0;
  const negative = memorySystem.botMemory.feedback[action].negative || 0;
  const total = positive + negative;
  
  if (total === 0) return 0.5;
  
  // Calculate success rate, but give more weight to recent feedback using a dynamic learning rate
  // Lower learning rate for well-established actions, higher for actions with less history
  return Math.max(0.1, Math.min(0.9, 1.0 - (positive / (positive + negative))));
}

// Export the functions for use in other modules
module.exports = {
  interpretAction,
  processFeedback,
  getLearningRate
};
