require("dotenv").config();

const fs = require("fs");

const {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  Events,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ChannelType,
  PermissionsBitField
} = require("discord.js");

// ======================================
// CONFIG
// ======================================

const TOKEN = process.env.TOKEN;
const GUILD_ID = process.env.GUILD_ID;

const MATCH_CHANNEL_ID = "1500602866992414772";
const CATEGORY_ID = "1500602866992414770";
const LOG_CHANNEL_ID = "1505757661566603264";

const BANNER =
  "https://media.discordapp.net/attachments/1500602866992414772/1505738877036400791/92d1d4f3-6301-4faa-885c-22ac10663481.png";

const LOGO =
  "https://media.discordapp.net/attachments/1500602866992414772/1505737584788242685/bbf226a5-47e6-48c7-9cea-2f12dc05c8e6.png";

// ======================================
// CLIENT
// ======================================

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers
  ]
});

// ======================================
// DATABASE
// ======================================

if (!fs.existsSync("./database")) {
  fs.mkdirSync("./database");
}

function ensure(path, data) {
  if (!fs.existsSync(path)) {
    fs.writeFileSync(
      path,
      JSON.stringify(data, null, 2)
    );
  }
}

ensure("./database/users.json", {});
ensure("./database/bans.json", []);
ensure("./database/panels.json", {});
ensure("./database/matches.json", {});

function load(path) {
  return JSON.parse(
    fs.readFileSync(path)
  );
}

function save(path, data) {
  fs.writeFileSync(
    path,
    JSON.stringify(data, null, 2)
  );
}

let users = load("./database/users.json");
let bans = load("./database/bans.json");
let panels = load("./database/panels.json");
let matches = load("./database/matches.json");

function saveAll() {
  save("./database/users.json", users);
  save("./database/bans.json", bans);
  save("./database/panels.json", panels);
  save("./database/matches.json", matches);
}

// ======================================
// HELPERS
// ======================================

function getProfile(id) {

  if (!users[id]) {

    users[id] = {
      wins: 0,
      losses: 0
    };
  }

  return users[id];
}

function isAdmin(member) {

  return member.permissions.has(
    PermissionsBitField.Flags.Administrator
  );
}

function maxPlayers(mode) {

  if (mode === "1vs1") return 1;
  if (mode === "2vs2") return 2;
  if (mode === "3vs3") return 3;
  if (mode === "4vs4") return 4;

  return 1;
}

function teamRender(team) {

  if (team.length === 0) {
    return "Libre";
  }

  return team.map((id, i) => {

    if (i === 0) {
      return `👑 <@${id}>`;
    }

    return `⚔️ <@${id}>`;

  }).join("\n");
}

async function log(guild, text) {

  try {

    const channel =
      guild.channels.cache.get(LOG_CHANNEL_ID);

    if (!channel) return;

    channel.send(text);

  } catch {}
}

// ======================================
// EMBED
// ======================================

function createEmbed(panelId) {

  const panel = panels[panelId];

  return new EmbedBuilder()

    .setColor("#ff0000")

    .setTitle(`🔥 MONEYWAY ${panel.mode} 🔥`)

    .setDescription(`

🎮 FILA 1
🔵 ${teamRender(panel.rows[0].team1)}
🔴 ${teamRender(panel.rows[0].team2)}

━━━━━━━━━━━━━━

🎮 FILA 2
🔵 ${teamRender(panel.rows[1].team1)}
🔴 ${teamRender(panel.rows[1].team2)}

━━━━━━━━━━━━━━

🎮 FILA 3
🔵 ${teamRender(panel.rows[2].team1)}
🔴 ${teamRender(panel.rows[2].team2)}

`)

    .setThumbnail(LOGO)

    .setImage(BANNER)

    .setFooter({
      text: "🔥 MONEYWAY 🔥"
    });
}

// ======================================
// BUTTONS
// ======================================

function createButtons(panelId) {

  return [

    new ActionRowBuilder()

      .addComponents(

        new ButtonBuilder()
          .setCustomId(`${panelId}_1_team1`)
          .setLabel("🔵 EQUIPO 1")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`${panelId}_1_team2`)
          .setLabel("🔴 EQUIPO 2")
          .setStyle(ButtonStyle.Danger)
      ),

    new ActionRowBuilder()

      .addComponents(

        new ButtonBuilder()
          .setCustomId(`${panelId}_2_team1`)
          .setLabel("🔵 EQUIPO 1")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`${panelId}_2_team2`)
          .setLabel("🔴 EQUIPO 2")
          .setStyle(ButtonStyle.Danger)
      ),

    new ActionRowBuilder()

      .addComponents(

        new ButtonBuilder()
          .setCustomId(`${panelId}_3_team1`)
          .setLabel("🔵 EQUIPO 1")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`${panelId}_3_team2`)
          .setLabel("🔴 EQUIPO 2")
          .setStyle(ButtonStyle.Danger)
      ),

    new ActionRowBuilder()

      .addComponents(

        new ButtonBuilder()
          .setCustomId(`${panelId}_leave`)
          .setLabel("🚪 SALIR")
          .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
          .setCustomId(`${panelId}_close`)
          .setLabel("🔒 CERRAR FILA")
          .setStyle(ButtonStyle.Danger)
      )
  ];
}

// ======================================
// COMMANDS
// ======================================

const commands = [

  new SlashCommandBuilder()
    .setName("mwapostado")
    .setDescription("Crear panel"),

  new SlashCommandBuilder()
    .setName("mwperfil")
    .setDescription("Ver perfil")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuario")
        .setRequired(false)
    ),

  new SlashCommandBuilder()
    .setName("mwtop")
    .setDescription("Top wins"),

  new SlashCommandBuilder()
    .setName("mwbanqueue")
    .setDescription("Banear usuario")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuario")
        .setRequired(true)
    ),

  new SlashCommandBuilder()
    .setName("mwunbanqueue")
    .setDescription("Desbanear usuario")
    .addUserOption(option =>
      option
        .setName("usuario")
        .setDescription("Usuario")
        .setRequired(true)
    )

].map(c => c.toJSON());

// ======================================
// READY
// ======================================

client.once(Events.ClientReady, async () => {

  console.log(`✅ ${client.user.tag} ONLINE`);

  const rest = new REST({
    version: "10"
  }).setToken(TOKEN);

  await rest.put(

    Routes.applicationGuildCommands(
      client.user.id,
      GUILD_ID
    ),

    {
      body: commands
    }
  );

  console.log("✅ COMANDOS CARGADOS");
});

// ======================================
// CREATE MATCH
// ======================================

async function createMatch(
  interaction,
  panelId,
  rowNumber
) {

  const panel = panels[panelId];

  const row =
    panel.rows[rowNumber - 1];

  const players = [
    ...row.team1,
    ...row.team2
  ];

  const perms = [

    {
      id: interaction.guild.id,

      deny: [
        PermissionsBitField.Flags.ViewChannel
      ]
    }
  ];

  players.forEach(id => {

    perms.push({

      id,

      allow: [

        PermissionsBitField.Flags.ViewChannel,
        PermissionsBitField.Flags.SendMessages
      ]
    });
  });

  const textChannel =
    await interaction.guild.channels.create({

      name: `🎮-${panel.mode}`,

      type: ChannelType.GuildText,

      parent: CATEGORY_ID,

      permissionOverwrites: perms
    });

  matches[textChannel.id] = {

    team1: row.team1,
    team2: row.team2
  };

  saveAll();

  const controls =
    new ActionRowBuilder()

      .addComponents(

        new ButtonBuilder()
          .setCustomId(`win1_${textChannel.id}`)
          .setLabel("🔵 WIN")
          .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
          .setCustomId(`win2_${textChannel.id}`)
          .setLabel("🔴 WIN")
          .setStyle(ButtonStyle.Danger),

        new ButtonBuilder()
          .setCustomId(`closematch_${textChannel.id}`)
          .setLabel("🗑️ CERRAR")
          .setStyle(ButtonStyle.Secondary)
      );

  await textChannel.send({

    content: `

# 🔥 PARTIDA ENCONTRADA 🔥

🔵 EQUIPO 1
${row.team1.map(id => `<@${id}>`).join("\n")}

━━━━━━━━━━━━━━

🔴 EQUIPO 2
${row.team2.map(id => `<@${id}>`).join("\n")}

━━━━━━━━━━━━━━

💳 Moneyway alias:mway.apos
💳 Link: https://onetouch.astropay.com/payment?external_reference_id=m0lnorFJi4wXnBvLxqvTnsjBgXspE6xK
💳 Binance: 776779482
📸 Mandar captura de comprobante de pago.
📜 Reglas:💸 *REGLAMENTO OFICIAL | APOSTADOS MONEYWAYY*
💰 DECIDIR MONTO $$$$$$
━━━━━━━━━━━━━━

🏆 MONEYWAY
`,

    components: [controls]
  });

  row.team1 = [];
  row.team2 = [];

  saveAll();

  const msg =
    await interaction.channel.messages.fetch(
      panel.messageId
    );

  await msg.edit({

    embeds: [createEmbed(panelId)],

    components: createButtons(panelId)
  });
}

// ======================================
// INTERACTIONS
// ======================================

client.on(
  Events.InteractionCreate,
  async interaction => {

    try {

      // ======================================
      // COMMANDS
      // ======================================

      if (interaction.isChatInputCommand()) {

        // MWAPOSTADO

        if (
          interaction.commandName === "mwapostado"
        ) {

          if (
            interaction.channel.id !==
            MATCH_CHANNEL_ID
          ) {

            return interaction.reply({

              content:
                "❌ Canal incorrecto",

              flags: 64
            });
          }

          const row =
            new ActionRowBuilder()

              .addComponents(

                new ButtonBuilder()
                  .setCustomId("create_1vs1")
                  .setLabel("1vs1")
                  .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                  .setCustomId("create_2vs2")
                  .setLabel("2vs2")
                  .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                  .setCustomId("create_3vs3")
                  .setLabel("3vs3")
                  .setStyle(ButtonStyle.Primary),

                new ButtonBuilder()
                  .setCustomId("create_4vs4")
                  .setLabel("4vs4")
                  .setStyle(ButtonStyle.Primary)
              );

          return interaction.reply({

            content:
              "🎮 Elegí modalidad",

            components: [row]
          });
        }

        // MWPERFIL

        if (
          interaction.commandName === "mwperfil"
        ) {

          const user =
            interaction.options.getUser("usuario")
            || interaction.user;

          const profile =
            getProfile(user.id);

          const total =
            profile.wins + profile.losses;

          const wr =
            total === 0
              ? 0
              : (
                (profile.wins / total) * 100
              ).toFixed(1);

          const embed =
            new EmbedBuilder()

              .setColor("#ff0000")

              .setTitle(
                `📊 ${user.username}`
              )

              .setDescription(`

🏆 Wins: ${profile.wins}
💀 Losses: ${profile.losses}
📈 WinRate: ${wr}%

`)

              .setThumbnail(
                user.displayAvatarURL()
              );

          return interaction.reply({
            embeds: [embed]
          });
        }

        // MWTOP

        if (
          interaction.commandName === "mwtop"
        ) {

          const ranking =
            Object.entries(users)

              .sort(
                (a, b) =>
                  b[1].wins - a[1].wins
              )

              .slice(0, 10);

          const text =
            ranking.map((u, i) => {

              return `#${i + 1} <@${u[0]}> • ${u[1].wins} wins`;

            }).join("\n");

          const embed =
            new EmbedBuilder()

              .setColor("Gold")

              .setTitle(
                "🏆 TOP MONEYWAY 🏆"
              )

              .setDescription(text);

          return interaction.reply({
            embeds: [embed]
          });
        }

        // MWBANQUEUE

        if (
          interaction.commandName === "mwbanqueue"
        ) {

          if (!isAdmin(interaction.member)) {

            return interaction.reply({

              content:
                "❌ Sin permisos",

              flags: 64
            });
          }

          const user =
            interaction.options.getUser(
              "usuario"
            );

          if (!bans.includes(user.id)) {
            bans.push(user.id);
          }

          saveAll();

          return interaction.reply(
            `🚫 ${user.username} baneado`
          );
        }

        // MWUNBANQUEUE

        if (
          interaction.commandName === "mwunbanqueue"
        ) {

          if (!isAdmin(interaction.member)) {

            return interaction.reply({

              content:
                "❌ Sin permisos",

              flags: 64
            });
          }

          const user =
            interaction.options.getUser(
              "usuario"
            );

          bans =
            bans.filter(
              id => id !== user.id
            );

          saveAll();

          return interaction.reply(
            `✅ ${user.username} desbaneado`
          );
        }
      }

      // ======================================
      // BUTTONS
      // ======================================

      if (interaction.isButton()) {

        // CREATE PANEL

        if (
          interaction.customId.startsWith(
            "create_"
          )
        ) {

          const mode =
            interaction.customId.replace(
              "create_",
              ""
            );

          const panelId =
            Date.now().toString();

          panels[panelId] = {

            mode,

            maxPlayers:
              maxPlayers(mode),

            rows: [

              {
                team1: [],
                team2: []
              },

              {
                team1: [],
                team2: []
              },

              {
                team1: [],
                team2: []
              }
            ]
          };

          await interaction.reply({

            embeds: [createEmbed(panelId)],

            components:
              createButtons(panelId)
          });

          const msg =
            await interaction.fetchReply();

          panels[panelId].messageId =
            msg.id;

          saveAll();

          return;
        }

        // LEAVE

        if (
          interaction.customId.endsWith(
            "_leave"
          )
        ) {

          const panelId =
            interaction.customId.split("_")[0];

          const panel = panels[panelId];

          if (!panel) return;

          panel.rows.forEach(row => {

            row.team1 =
              row.team1.filter(
                id =>
                  id !== interaction.user.id
              );

            row.team2 =
              row.team2.filter(
                id =>
                  id !== interaction.user.id
              );
          });

          saveAll();

          return interaction.update({

            embeds: [
              createEmbed(panelId)
            ],

            components:
              createButtons(panelId)
          });
        }

        // CLOSE PANEL

        if (
          interaction.customId.endsWith(
            "_close"
          )
        ) {

          if (!isAdmin(interaction.member)) {

            return interaction.reply({

              content:
                "❌ Solo administradores",

              flags: 64
            });
          }

          const panelId =
            interaction.customId.split("_")[0];

          delete panels[panelId];

          saveAll();

          await interaction.message.delete();

          return log(
            interaction.guild,
            `🔒 Panel cerrado por ${interaction.user.tag}`
          );
        }

        // WIN

        if (
          interaction.customId.startsWith(
            "win1_"
          ) ||

          interaction.customId.startsWith(
            "win2_"
          )
        ) {

          if (!isAdmin(interaction.member)) {

            return interaction.reply({

              content:
                "❌ Solo admins",

              flags: 64
            });
          }

          const [
            type,
            channelId
          ] =
            interaction.customId.split("_");

          const match =
            matches[channelId];

          if (!match) {

            return interaction.reply({

              content:
                "❌ Match no encontrado",

              flags: 64
            });
          }

          const winners =
            type === "win1"
              ? match.team1
              : match.team2;

          const losers =
            type === "win1"
              ? match.team2
              : match.team1;

          winners.forEach(id => {
            getProfile(id).wins++;
          });

          losers.forEach(id => {
            getProfile(id).losses++;
          });

          saveAll();

          try {

            await interaction.channel.permissionOverwrites.edit(

              interaction.guild.roles.everyone,

              {
                ViewChannel: false
              }
            );

          } catch {}

          delete matches[channelId];

          saveAll();

          return interaction.reply(
            "🏆 Victoria registrada"
          );
        }

        // CLOSE MATCH

        if (
          interaction.customId.startsWith(
            "closematch_"
          )
        ) {

          if (!isAdmin(interaction.member)) {

            return interaction.reply({

              content:
                "❌ Solo admins",

              flags: 64
            });
          }

          const channelId =
            interaction.customId.split("_")[1];

          delete matches[channelId];

          saveAll();

          try {

            await interaction.channel.permissionOverwrites.edit(

              interaction.guild.roles.everyone,

              {
                ViewChannel: false
              }
            );

          } catch {}

          return interaction.reply(
            "🗑️ Match cerrado"
          );
        }

        // JOIN

        const split =
          interaction.customId.split("_");

        if (split.length === 3) {

          const [
            panelId,
            rowNumber,
            team
          ] = split;

          const panel =
            panels[panelId];

          if (!panel) return;

          if (
            bans.includes(
              interaction.user.id
            )
          ) {

            return interaction.reply({

              content:
                "🚫 Estás baneado",

              flags: 64
            });
          }

          const row =
            panel.rows[
              Number(rowNumber) - 1
            ];

          if (
            row.team1.includes(
              interaction.user.id
            ) ||

            row.team2.includes(
              interaction.user.id
            )
          ) {

            return interaction.reply({

              content:
                "❌ Ya estás en esta fila",

              flags: 64
            });
          }

          if (
            row[team].length >=
            panel.maxPlayers
          ) {

            return interaction.reply({

              content:
                "❌ Equipo lleno",

              flags: 64
            });
          }

          row[team].push(
            interaction.user.id
          );

          saveAll();

          await interaction.update({

            embeds: [createEmbed(panelId)],

            components:
              createButtons(panelId)
          });

          if (

            row.team1.length ===
            panel.maxPlayers &&

            row.team2.length ===
            panel.maxPlayers

          ) {

            await createMatch(
              interaction,
              panelId,
              rowNumber
            );
          }
        }
      }

    } catch (err) {

      console.log(err);
    }
  }
);

client.login(TOKEN);