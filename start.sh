#!/bin/bash
# Start the MinePal bot with LM Studio integration

# Check if LM Studio is running (simplified check)
if ! curl -s "http://127.0.0.1:1234/v1/models" > /dev/null; then
  echo "⚠️ Warning: LM Studio doesn't appear to be running at http://127.0.0.1:1234"
  echo "Make sure LM Studio is running with the meta-llama-3.1-8b-instruct model loaded"
  echo "Press Enter to continue anyway, or Ctrl+C to cancel"
  read
fi

# Set environment variables
export LLM_URL="http://127.0.0.1:1234"
export LLM_MODEL="meta-llama-3.1-8b-instruct"
export ENABLE_LLM="true"

# Default bot username
export BOT_USERNAME="Onimaru"

# Allow custom username from command line
if [ ! -z "$1" ]; then
  export BOT_USERNAME="$1"
  echo "Setting bot username to: $BOT_USERNAME"
fi

# Run the bot
echo "Starting MinePal bot..."
node bot.js
