
# Minecraft AI Companion with LM Studio + Fabric 1.21 + TLauncher

A step-by-step guide to creating an **offline autonomous Minecraft AI bot**, powered by a **local LLM (LM Studio Meta‑LLaMA‑3.1‑Instruct)**, playing alongside you on a **Fabric 1.21 server** managed with TLauncher.

 

##  Prerequisites

- Java 17+ installed (required for Fabric and Minecraft ≥ 1.18) :contentReference[oaicite:1]{index=1}
- Node.js installed
- TLauncher with Fabric 1.21 profile
- LM Studio v0.3.6+ with **local API** enabled
- Official Fabric Server installer (universal JAR)

 

##  Step 1: Set Up Java

Install Java 17+ and verify with:

```bash
java -version
# Expect something like "openjdk version \"17.x.x\""
```

Minecraft ≥ 1.18 and Fabric ≥ 1.17 **require Java 17+** ([wiki.fabricmc.net][1], [github.com][2]).

 

##  Step 2: Install Fabric Server (1.21)

1. Download the **Fabric Installer JAR** from the Fabric website.
2. In an empty folder, run:

   ```bash
   java -jar fabric-installer.jar
   ```

   * Select **Server**
   * Choose **Minecraft 1.21.x**
   * Click **Install**, generating:

     * `fabric-server-launch.jar`
     * `start.sh`/`start.bat`
     * Dependencies including `server.jar` ([wiki.fabricmc.net][3], [wiki.fabricmc.net][1])

 

##  Step 3: Configure Offline Server

In the server folder, update:

* `eula.txt` → `eula=true`
* `server.properties` →

  ```ini
  online-mode=false
  enable-command-block=true
  ```

These settings allow **TLauncher (cracked)** players to connect ([wiki.fabricmc.net][1], [wiki.fabricmc.net][3]).

 

##  Step 4: Start Fabric Server

* On Windows: run `start.bat`
* On Linux/macOS:

  ```bash
  chmod +x start.sh
  ./start.sh
  ```

The console should show the server is online on port `25565`.

 

##  Step 5: Join with TLauncher

1. Open **TLauncher** with Fabric 1.21 profile.
2. Navigate to **Multiplayer → Direct Connect**
3. Enter:

   ```
   localhost
   ```

You should now join your offline Fabric server world.

 

## Step 6: Set Up LM Studio Local API

1. Install **LM Studio v0.3.6+**.

2. In the **Developer** tab, enable the **OpenAI‑compatible HTTP API** at `http://localhost:1234/v1/…`

3. Test with:

   ```bash
   curl http://localhost:1234/v1/models
   ```

   You should see `"meta-llama-3.1-8b-instruct:2"` listed ([youtube.com][4], [wiki.fabricmc.net][3], [wiki.fabricmc.net][1], [lmstudio.ai][5]).

4. Test tool-calling:

   ```bash
   curl -i http://localhost:1234/v1/chat/completions \
     -H "Content-Type: application/json" \
     -d '{
       "model":"meta-llama-3.1-8b-instruct:2",
       "messages":[{"role":"system","content":"You can call functions."},
                   {"role":"user","content":"Call echo with text \"hello world\""}],
       "functions":[{
         "name":"echo",
         "description":"Returns the same text",
         "parameters":{"type":"object","properties":{"text":{"type":"string"}},"required":["text"]}
       }]
     }'
   ```

   ✅ Confirm response has `tool_calls` JSON .

 

##  Step 7: Create the Bot Project

```bash
mkdir mc-ai-bot
cd mc-ai-bot
npm init -y
npm install mineflayer mineflayer-pathfinder mineflayer-auto-eat mineflayer-collectblock node-fetch minecraft-data
```

Save the complete `bot.js` script (provided in the code block below).

 

##  Step 8: `bot.js` Overview

* Connects to `localhost:25565` and identifies as `LLM_Bot`
* Defines tools `mineBlock` and `followPlayer` for LM to call
* Handles chat:

  * Parses `tool_calls` JSON and runs in-game actions
  * Cleans markdown, supports alternative `action` JSON format
* Sends feedback to LLM to maintain context

*(See code in `bot.js`)*

 

##  Step 9: Launch the Bot

Ensure both server and TLauncher are running, then in your bot directory:

```bash
node bot.js
```

You should see in-game chat:

```
LLM_Bot: Hello! I'm your AI teammate. Chat with me!
```

 

##  Step 10: Test Commands

In the Minecraft chat, type:

* `@LLM_Bot please mine oak_log`
* `@LLM_Bot follow me`

Your bot should **mine logs** and **follow you** accordingly!

 

##  Step 11: Extend Functionality

Add more tools:

* `storeItems`, `eatFood`, `fightMob`, etc.
* Provide contextual feedback (inventory, health).
* Refine prompts or use function-calling for behavior chaining.

 

##  Troubleshooting

| Issue                        | Solution                                                                                                        |
|          - |                                       |
| Fabric server crashes        | Ensure Java 17+ is used ([docs.mcserversoft.com][6], [wiki.fabricmc.net][1], [github.com][7], [youtube.com][8]) |
| Bot fails to parse JSON      | Use `cleanJson()` to strip markdown                                                                             |
| Function calls not triggered | Confirm LM Studio v0.3.6+ supports OpenAI-style API                                                             |

 

## 📂 `bot.js` Code

*Use the one which is present in this repository*

 

##  Conclusion

You’ve set up a fully offline, autonomous AI companion using **TLauncher + Fabric + LM Studio + Mineflayer**, complete with **structured tool-calling** for in-game behaviors. Ready to play and extend!

Happy coding & gaming! ⚔️🚀

