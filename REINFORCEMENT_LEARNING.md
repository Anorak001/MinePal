# MinePal Reinforcement Learning System

## Overview

MinePal now features a reinforcement learning system that allows the bot to learn from interactions and become more autonomous over time. This document explains the key components and how they work together.

## Key Features

1. **Natural Language Action Detection**
   - The bot can now understand natural language commands instead of requiring strict JSON formatting
   - Actions are detected based on keyword matching and context analysis
   - Supports multiple action types: follow, mine, move, look, inventory, analyze, craft, and place

2. **Persistent Memory System**
   - Remembers past interactions with players
   - Tracks success rates of different actions
   - Stores player preferences for personalized interactions
   - Periodically saves memory to disk to survive bot restarts

3. **Reinforcement Learning**
   - Learns from positive and negative feedback
   - Adjusts behavior based on past success rates
   - Remembers player preferences to provide better responses
   - Uses a dynamic learning rate based on action history

## System Components

### memory_system.js
Handles persistent storage and retrieval of bot memory, including:
- Past interactions
- Action success rates
- Player preferences
- Memory saving and loading

### reinforcement_learning.js
Implements the learning mechanisms:
- Natural language action interpretation
- Feedback processing
- Learning rate calculation

### bot.js
The main bot code, which now:
- Uses the memory system to enhance responses
- Implements the reinforcement learning system
- Provides more natural, conversational responses

## How to Use

1. **Natural Commands**: Just talk to the bot in natural language! For example:
   - "Can you mine some iron ore for me?"
   - "Follow me please"
   - "Go to coordinates 100 64 -200"

2. **Feedback**: The bot learns from your feedback. Simply respond with phrases like:
   - Positive: "good job", "thanks", "well done"
   - Negative: "no", "that's wrong", "stop"

3. **Memory Persistence**: The bot's memory is saved to `bot_memory.json` and will be loaded on restart.

## Implementation Notes

The bot uses a combination of:
- Natural language processing for action detection
- Memory-based learning for improving responses
- Contextual understanding of player preferences

Each interaction is recorded with success/failure metrics that influence future behavior.
