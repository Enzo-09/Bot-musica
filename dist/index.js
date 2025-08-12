import "dotenv/config";
import { Client, GatewayIntentBits, EmbedBuilder } from "discord.js";
import { Poru } from "poru";
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates],
});
const nodes = [
    { name: "main", host: process.env.LAVALINK_HOST || "localhost", port: Number(process.env.LAVALINK_PORT) || 2333, password: process.env.LAVALINK_PASSWORD || "youshallnotpass", secure: false },
];
const poru = new Poru(client, nodes, { library: "discord.js", defaultPlatform: "ytsearch" });
poru.on("nodeConnect", node => console.log(`[Lavalink] Conectado a ${node.name}`));
poru.on("nodeError", (node, err) => console.error(`[Lavalink] Error en ${node.name}:`, err));
poru.on("trackStart", (player, track) => {
    const channel = client.channels.cache.get(player.textChannel);
    if (channel && "send" in channel) {
        channel.send({
            embeds: [new EmbedBuilder().setTitle("▶ Reproduciendo").setDescription(`[${track.info.title}](${track.info.uri})`)]
        });
    }
});
client.on("raw", (d) => poru.packetUpdate(d));
client.once("ready", () => { console.log(`✅ Bot conectado como ${client.user?.tag}`); poru.init(); });
client.on("interactionCreate", async (interaction) => {
    if (!interaction.isChatInputCommand())
        return;
    try {
        await handle(interaction);
    }
    catch (e) {
        console.error(e);
        if (!interaction.replied)
            await interaction.reply({ content: "Hubo un error.", ephemeral: true });
    }
});
async function handle(i) {
    const member = await i.guild.members.fetch(i.user.id);
    switch (i.commandName) {
        case "join": {
            const vc = member.voice.channelId;
            if (!vc)
                return i.reply({ content: "Entrá a un canal de voz.", ephemeral: true });
            poru.createConnection({
                guildId: i.guildId,
                voiceChannel: vc,
                textChannel: i.channelId,
                deaf: true,
            });
            return i.reply("Conectado.");
        }
        case "play": {
            const vc = member.voice.channelId;
            if (!vc)
                return i.reply({ content: "Entrá a un canal de voz.", ephemeral: true });
            // Limpiamos posibles residuos como "/play " pegado dentro del argumento
            const raw = i.options.getString("query", true).trim();
            const cleaned = raw.replace(/^\/?play\s+/i, "").trim();
            // Detectamos URL real
            const isUrl = /^https?:\/\//i.test(cleaned);
            // IMPORTANTE: no agregamos "ytsearch:" nosotros
            // Dejamos que Poru/Lavalink usen la fuente "ytsearch" si NO es URL.
            const res = await poru.resolve({
                query: cleaned,
                source: isUrl ? "" : "ytsearch",
                requester: i.user,
            });
            if (!res || res.loadType === "empty" || res.tracks.length === 0) {
                return i.reply("No encontré nada.");
            }
            const player = poru.players.get(i.guildId) ??
                poru.createConnection({
                    guildId: i.guildId,
                    voiceChannel: vc,
                    textChannel: i.channelId,
                    deaf: true,
                });
            if (res.loadType === "playlist") {
                for (const t of res.tracks) {
                    t.info.requester = i.user;
                    player.queue.add(t);
                }
                await i.reply(`Playlist **${res.playlistInfo?.name ?? "sin nombre"}** añadida (${res.tracks.length} temas).`);
            }
            else {
                const t = res.tracks[0];
                t.info.requester = i.user;
                player.queue.add(t);
                await i.reply(`Añadido: **${t.info.title}**`);
            }
            if (!player.isPlaying && player.isConnected) {
                player.play();
            }
            return;
        }
        case "skip": {
            const p = poru.players.get(i.guildId);
            if (!p)
                return i.reply({ content: "Nada sonando.", ephemeral: true });
            await p.skip();
            return i.reply("⏭ Skipped.");
        }
        case "stop": {
            const p = poru.players.get(i.guildId);
            if (!p)
                return i.reply({ content: "Nada que detener.", ephemeral: true });
            p.queue.clear();
            if (p.isPlaying)
                await p.skip();
            return i.reply("⏹ Stop");
        }
        case "pause": {
            const p = poru.players.get(i.guildId);
            if (!p)
                return i.reply({ content: "Nada sonando.", ephemeral: true });
            p.pause(true);
            return i.reply("⏸ Pausado.");
        }
        case "resume": {
            const p = poru.players.get(i.guildId);
            if (!p)
                return i.reply({ content: "Nada sonando.", ephemeral: true });
            p.pause(false);
            return i.reply("▶ Reanudado.");
        }
        case "np": {
            const p = poru.players.get(i.guildId);
            const c = p?.currentTrack;
            if (!c)
                return i.reply({ content: "Nada sonando.", ephemeral: true });
            return i.reply(`[${c.info.title}](${c.info.uri})`);
        }
        case "queue": {
            const p = poru.players.get(i.guildId);
            if (!p || p.queue.length === 0)
                return i.reply({ content: "Cola vacía.", ephemeral: true });
            const lines = p.queue
                .slice(0, 10)
                .map((t, idx) => `${idx + 1}. ${t.info.title}`);
            return i.reply(`**Próximos:**\n${lines.join("\n")}${p.queue.length > 10 ? `\n…y ${p.queue.length - 10} más` : ""}`);
        }
        case "leave": {
            const p = poru.players.get(i.guildId);
            p?.destroy();
            return i.reply("👋 Salí del canal.");
        }
        default:
            return i.reply({ content: "Comando no reconocido.", ephemeral: true });
    }
}
client.login(process.env.DISCORD_TOKEN);
