const {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
} = require("discord.js");
const { ownerId } = require("../../config.json");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("reload")
    .setDescription("[Owner Only] Reloads a command.")
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addStringOption((option) =>
      option
        .setName("command")
        .setDescription("The command to reload.")
        .setRequired(true)
    ),
  async execute(interaction) {
    // --- Owner Check ---
    if (interaction.user.id !== ownerId) {
      return interaction.reply({
        content: "This command is reserved for the bot owner.",
        flags: MessageFlags.Ephemeral,
      });
    }

    const commandName = interaction.options
      .getString("command", true)
      .toLowerCase();
    const command = interaction.client.commands.get(commandName);

    if (!command) {
      return interaction.reply({
        content: `There is no command with name \`${commandName}\`!`,
        flags: MessageFlags.Ephemeral,
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

      await interaction.reply({
        content: `Command \`${newCommand.data.name}\` was reloaded successfully!`,
        flags: MessageFlags.Ephemeral,
      });
    } catch (error) {
      console.error(error);
      await interaction.reply({
        content: `There was an error while reloading a command \`${command.data.name}\`:\n\`${error.message}\``,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
