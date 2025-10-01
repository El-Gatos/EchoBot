const { REST, Routes } = require("discord.js");
const { clientId, guildId, token } = require("./config.json");

// This script is for ONE-TIME use to clear commands.

const rest = new REST().setToken(token);

console.log("Started clearing all application (/) commands for this server.");
rest
  .put(Routes.applicationGuildCommands(clientId, guildId), { body: [] })
  .then(() => console.log("Successfully cleared all guild commands."))
  .catch(console.error);
