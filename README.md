# MinePal - AI-Agent with RL capabilites in a Minecraft world

![MinePal Beta Screenshot](./img/front.png)

A Minecraft bot assistant that uses AI to understand natural language commands and perform actions in the game.

## Features

- Natural language command processing (when connected to an LLM)
- Direct command mode with `!` prefix
- Pathfinding and navigation
- Block mining and collection
- Following players
- Inventory management
- Automatic eating
- Environment analysis
- Item crafting
- Block placement

![CLI](./img/CLI.png)

## Installation

Please refer to the [Installation Steps](./Installation_steps.md).

## Usage

### Start the bot

```
./start.sh [optional_bot_username]
```

Or manually:

```
node bot.js
```

### Environment Variables

You can configure the bot using the following environment variables:

- `BOT_USERNAME`: Set the bot's username (default: 'AI_Assistant')
- `SERVER_HOST`: Minecraft server address (default: 'localhost')
- `SERVER_PORT`: Minecraft server port (default: 25565)
- `LLM_URL`: URL for the AI language model API (default: 'http://localhost:1234')
- `LLM_MODEL`: Model identifier for the LLM (default: 'meta-llama-3.1-8b-instruct')
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
- `!analyze` - Describe the bot's surroundings
- `!craft <item_name> [quantity]` - Craft an item (e.g., `!craft stick 4`)
- `!place <block_type> <x> <y> <z>` - Place a block at coordinates
- `!help` - Display available commands

### Natural Language Commands (requires LLM)

![CLI](./img/LocalLLM.png)

![chat](./img/chat.png) 

When the LLM is enabled, the bot can understand natural language commands like:

- "Follow me"
- "Mine some diamonds"
- "Get 5 dirt blocks"
- "Go to the house"
- "What do you have in your inventory?"
- "Describe your surroundings"
- "What can you see around you?"
- "Craft 4 sticks"
- "Place a torch at coordinates 100, 64, -200"

## Advanced Configuration

You can modify the code to add more features or change the behavior of the bot:

- Change the auto-eat settings in the spawn event handler
- Add more commands to the direct command handler
- Modify the LLM prompt to customize the AI's behavior

![Debug](./img/f3.png)


**PS: I built this as a hobby project, Looking for fellow game devs for active contributions for this project**