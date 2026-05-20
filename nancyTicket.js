require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
    ModalBuilder,
    TextInputBuilder,
    TextInputStyle,
    ButtonBuilder,
    ButtonStyle,
    PermissionsBitField
} = require("discord.js");

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.GuildMembers
    ],
    partials: [Partials.Channel]
});

// ===============================
// CONFIGURATION SERVEUR
// ===============================

const SERVER_ID = "1472637775281918123"; // ID de ton serveur
const PANEL_CHANNEL = "1505943795643060235"; // Salon où envoyer le panel

const serverConfig = {
    categories: {
        question: "1506374094906720387",
        partenariat: "1506374190956281997",
        reportstaff: "1506374327509979186",
        reportjoueur: "1506374389137149982",
        legal: "1505943608832819282",
        illegal: "1505943610141442129",
        fondation: "1506374573535268885"
    },
    staffRoles: {
        question: ["1505943612507295826"],
        partenariat: ["1505943612507295826"],
        reportstaff: ["1505943612507295826"],
        reportjoueur: ["1505943612507295826"],
        legal: ["1505943612507295826"],
        illegal: ["1505943612507295826"],
        fondation: ["1505943603204198400"]
    },
    logs: "1506375933051932753"
};

// ===============================
// EMBED PREMIUM BLEU
// ===============================

function premiumEmbed(title, desc) {
    return new EmbedBuilder()
        .setTitle(`💠 ${title}`)
        .setDescription(desc)
        .setColor("#1A73E8")
        .setFooter({ text: "Nancy Ticket — Premium System" })
        .setTimestamp();
}

// ===============================
// ENVOI DU PANEL AU DÉMARRAGE
// ===============================

client.on("ready", async () => {
    console.log(`Connecté en tant que ${client.user.tag}`);

    const channel = client.channels.cache.get(PANEL_CHANNEL);
    if (!channel) return console.log("❌ Salon du panel introuvable.");

    const embed = premiumEmbed(
        "Centre de Support",
        "Sélectionnez une catégorie ci‑dessous pour ouvrir un ticket.\nUn formulaire apparaîtra automatiquement."
    );

    const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket_menu")
        .setPlaceholder("💠 Choisissez une catégorie")
        .addOptions([
            { label: "💙 Question", value: "question" },
            { label: "💙 Partenariat", value: "partenariat" },
            { label: "💙 Report Staff", value: "reportstaff" },
            { label: "💙 Report Joueur", value: "reportjoueur" },
            { label: "💙 Demande Légal", value: "legal" },
            { label: "💙 Demande Illégal", value: "illegal" },
            { label: "💙 Fondation", value: "fondation" }
        ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await channel.send({ embeds: [embed], components: [row] });
});

// ===============================
// OUVERTURE DU FORMULAIRE
// ===============================

client.on("interactionCreate", async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== "ticket_menu") return;

    const type = interaction.values[0];

    const modal = new ModalBuilder()
        .setCustomId(`modal_${type}`)
        .setTitle(`💠 Ticket : ${type}`);

    const input = new TextInputBuilder()
        .setCustomId("details")
        .setLabel("Explique ta demande")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    const row = new ActionRowBuilder().addComponents(input);
    modal.addComponents(row);

    await interaction.showModal(modal);
});

// ===============================
// CRÉATION DU TICKET APRÈS FORMULAIRE
// ===============================

client.on("interactionCreate", async interaction => {
    if (!interaction.isModalSubmit()) return;

    const type = interaction.customId.replace("modal_", "");
    const details = interaction.fields.getTextInputValue("details");

    const categoryId = serverConfig.categories[type];
    const staffRoles = serverConfig.staffRoles[type];

    const channelName = `🎫・${type}-${interaction.user.username}`;

    const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        parent: categoryId,
        permissionOverwrites: [
            {
                id: interaction.guild.id,
                deny: [PermissionsBitField.Flags.ViewChannel]
            },
            {
                id: interaction.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            },
            {
                id: client.user.id,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            },
            ...staffRoles.map(r => ({
                id: r,
                allow: [
                    PermissionsBitField.Flags.ViewChannel,
                    PermissionsBitField.Flags.SendMessages,
                    PermissionsBitField.Flags.ReadMessageHistory
                ]
            }))
        ]
    });

    const embed = premiumEmbed(
        "Ticket Ouvert",
        `💠 **Type :** ${type}\n💠 **Utilisateur :** ${interaction.user}\n\n📄 **Détails :**\n${details}`
    );

    const closeBtn = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Fermer le ticket")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeBtn);

    await ticketChannel.send({ embeds: [embed], components: [row] });

    await interaction.reply({ content: `🎫 Ticket créé : ${ticketChannel}`, ephemeral: true });

    // Logs
    const logChannel = interaction.guild.channels.cache.get(serverConfig.logs);
    if (logChannel) {
        logChannel.send({
            embeds: [
                premiumEmbed(
                    "Nouveau Ticket",
                    `👤 **Utilisateur :** ${interaction.user}\n📂 **Type :** ${type}\n📁 **Salon :** ${ticketChannel}`
                )
            ]
        });
    }
});

// ===============================
// FERMETURE DU TICKET
// ===============================

client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "close_ticket") return;

    await interaction.reply({
        embeds: [premiumEmbed("Fermeture", "Le ticket sera fermé dans 3 secondes…")]
    });

    setTimeout(() => {
        interaction.channel.delete().catch(() => {});
    }, 3000);
});

// ===============================
// TOKEN
// ===============================

client.login(process.env.TOKEN);

