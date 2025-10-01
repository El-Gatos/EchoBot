const { SlashCommandBuilder } = require("discord.js");
const { ownerId } = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("[Owner Only] Reloads a command.")
    // REMOVED: .setDefaultMemberPermissions() is not needed for owner commands.
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("The command to reload.")
        .setRequired(true)
    ),
  async execute(interaction) {
    // --- Owner Check ---
    if (interaction.user.id !== ownerId) {
      // CHANGED: reply -> editReply, removed flags
      return interaction.editReply({
        content: "This command is reserved for the bot owner.",
      });
    }

    const commandName = interaction.options
      .getString("command", true)
      .toLowerCase();
    const command = interaction.client.commands.get(commandName);

    if (!command) {
      // CHANGED: reply -> editReply, removed flags
      return interaction.editReply({
        content: `There is no command with name \`${commandName}\`!`,
      });
    }

    try {
      // Clear the old command from the cache
      delete require.cache[require.resolve(command.filePath)];

      // Re-require the new command
      const newCommand = require(command.filePath);

      // Update the command in the client's collection
      interaction.client.commands.set(newCommand.data.name, newCommand);

      // Don't forget to re-attach the filePath for future reloads
      newCommand.filePath = command.filePath;

      // CHANGED: reply -> editReply, removed flags
      await interaction.editReply({
        content: `Command \`${newCommand.data.name}\` was reloaded successfully!`,
      });
    } catch (error) {
      console.error(error);
      // CHANGED: reply -> editReply, removed flags
      await interaction.editReply({
        content: `There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``,
      });
    }
  },
};
