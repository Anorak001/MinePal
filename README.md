# MineAI - AI-Powered Minecraft Bot

A Minecraft bot assistant that uses AI to understand natural language commands and perform actions in the game.

## Features

- Natural language command processing (when connected to an LLM)
- Direct command mode with `!` prefix
- Pathfinding and navigation
- Block mining and collection
- Following players
- Inventory management
- Automatic eating

## Installation

Please refer to the [Installation Steps](./Installation_steps.md).

## Usage

### Start the bot

```
node bot.js
```

### Environment Variables

You can configure the bot using the following environment variables:

- `BOT_USERNAME`: Set the bot's username (default: 'AI_Assistant')
- `SERVER_HOST`: Minecraft server address (default: 'localhost')
- `SERVER_PORT`: Minecraft server port (default: 25565)
- `LLM_URL`: URL for the AI language model API (default: 'http://localhost:3000/v1/chat/completions')
- `ENABLE_LLM`: Set to 'false' to disable the LLM integration (default: 'true')

Example:
```
LLM_URL=https://your-llm-api.example.com/v1/chat/completions BOT_USERNAME=MyBot node bot.js
```

### Direct Commands

If the LLM is unavailable or you prefer direct control, use these commands in Minecraft chat:

- `!follow [player_name]` - Follow a player (defaults to the player who sent the command)
- `!mine <block_type> [quantity]` - Mine specified blocks (e.g., `!mine dirt 5`)
- `!move <x> <y> <z>` - Move to specific coordinates
- `!look <x> <y> <z>` - Look at specific coordinates
- `!inventory` or `!inv` - Show the bot's inventory
- `!help` - Display available commands

### Natural Language Commands (requires LLM)

When the LLM is enabled, the bot can understand natural language commands like:

- "Follow me"
- "Mine some diamonds"
- "Get 5 dirt blocks"
- "Go to the house"
- "What do you have in your inventory?"

## Advanced Configuration

You can modify the code to add more features or change the behavior of the bot:

- Change the auto-eat settings in the spawn event handler
- Add more commands to the direct command handler
- Modify the LLM prompt to customize the AI's behavior
