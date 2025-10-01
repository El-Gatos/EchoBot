const admin = require("firebase-admin");
const serviceAccount = require("./serviceaccount.json");
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});
const db = admin.firestore();

const fs = require("node:fs");
const path = require("node:path");
const { Client, Collection, Events, GatewayIntentBits } = require("discord.js");
const { token } = require("./config.json");

// Create a new client instance
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
  ],
});
client.db = db;
client.activeGames = new Map();
client.snipes = new Map();

// --- Command Handler ---
client.commands = new Collection();
const foldersPath = path.join(__dirname, "commands");
const commandFolders = fs.readdirSync(foldersPath);

for (const folder of commandFolders) {
  const commandsPath = path.join(foldersPath, folder);
  const commandFiles = fs
    .readdirSync(commandsPath)
    .filter((file) => file.endsWith(".js"));
  for (const file of commandFiles) {
    const filePath = path.join(commandsPath, file);
    const command = require(filePath);
    if ("data" in command && "execute" in command) {
      client.commands.set(command.data.name, command);
      command.filePath = filePath; // For the reload command
    } else {
      console.log(
        `[WARNING] The command at ${filePath} is missing a required "data" or "execute" property.`
      );
    }
  }
}

// --- Event Handler ---
const eventsPath = path.join(__dirname, "events");
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((file) => file.endsWith(".js"));

for (const file of eventFiles) {
  const filePath = path.join(eventsPath, file);
  const event = require(filePath);
  if (event.once) {
    client.once(event.name, (...args) => event.execute(...args, client));
  } else {
    client.on(event.name, (...args) => event.execute(...args, client));
  }
}

// --- Giveaway Background Task ---
const { endGiveaway } = require("./utils/giveawayManager");
const GIVEAWAY_CHECK_INTERVAL = 30000; // Check every 30 seconds

setInterval(async () => {
  const now = new Date();
  const query = db
    .collectionGroup("giveaways")
    .where("ended", "==", false)
    .where("endTime", "<=", now);

  const expiredGiveaways = await query.get();
  expiredGiveaways.forEach((doc) => {
    console.log(`[Giveaway] Ending giveaway ${doc.id}`);
    endGiveaway(client, doc);
  });
}, GIVEAWAY_CHECK_INTERVAL);

// Log in to Discord with your client's token
client.login(token);
