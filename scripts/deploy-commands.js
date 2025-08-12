import "dotenv/config";
import { REST, Routes, SlashCommandBuilder } from "discord.js";
const commands = [
    new SlashCommandBuilder().setName("join").setDescription("Join a voice channel"),
    new SlashCommandBuilder()
        .setName("play")
        .setDescription("Play a song by URL or search query")
        .addStringOption(o => o.setName("query").setDescription("YouTube URL o texto").setRequired(true)),
    new SlashCommandBuilder().setName("skip").setDescription("Skip current track"),
    new SlashCommandBuilder().setName("stop").setDescription("Stop and clear queue"),
    new SlashCommandBuilder().setName("pause").setDescription("Pause"),
    new SlashCommandBuilder().setName("resume").setDescription("Resume"),
    new SlashCommandBuilder().setName("np").setDescription("Now playing"),
    new SlashCommandBuilder().setName("queue").setDescription("Show queue"),
    new SlashCommandBuilder().setName("leave").setDescription("Leave the voice channel"),
].map(c => c.toJSON());
const rest = new REST({ version: "10" }).setToken(process.env.DISCORD_TOKEN);
async function main() {
    if (process.env.GUILD_ID) {
        await rest.put(Routes.applicationGuildCommands(process.env.DISCORD_CLIENT_ID, process.env.GUILD_ID), { body: commands });
        console.log("Slash commands registrados en el GUILD de pruebas.");
    }
    else {
        await rest.put(Routes.applicationCommands(process.env.DISCORD_CLIENT_ID), { body: commands });
        console.log("Slash commands registrados globalmente (puede tardar hasta 1h).");
    }
}
main().catch(console.error);
//# sourceMappingURL=deploy-commands.js.map