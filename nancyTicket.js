
require("dotenv").config();
const {
    Client,
    GatewayIntentBits,
    Partials,
    EmbedBuilder,
    ActionRowBuilder,
    StringSelectMenuBuilder,
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
// CONFIGURATION PAR SERVEUR
// ===============================

const serverConfig = {
    "1472637775281918123": {
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
    }
};

// ===============================
// ANTI-SPAM
// ===============================

const ticketCooldown = new Map();

// ===============================
// MESSAGES AUTOMATIQUES
// ===============================

const autoMessages = {
    question: "🔹 Merci d’avoir ouvert un ticket **Question**.\nUn membre du staff va vous répondre rapidement.",
    partenariat: "🔹 Merci pour votre intérêt pour un **Partenariat**.\nNotre équipe va étudier votre demande.",
    reportstaff: "🔹 Vous avez ouvert un **Report Staff**.\nMerci de fournir un maximum de preuves (vidéos, captures).",
    reportjoueur: "🔹 Vous avez ouvert un **Report Joueur**.\nMerci d’expliquer la situation clairement et d’envoyer vos preuves.",
    legal: "🔹 Vous avez ouvert une **Demande Légal**.\nMerci de détailler votre requête.",
    illegal: "🔹 Vous avez ouvert une **Demande Illégal**.\nExpliquez votre demande, un membre de la fondation vous répondra.",
    fondation: "🔹 Vous contactez la **Fondation**.\nExpliquez votre situation, nous revenons vers vous rapidement."
};

// ===============================
// EMBED PREMIUM
// ===============================

function createStyledEmbed(title, description) {
    return new EmbedBuilder()
        .setTitle(`🔹 ${title}`)
        .setDescription(description)
        .setColor("#0A3D62")
        .setFooter({ text: "Nancy Ticket — Système Premium" })
        .setTimestamp();
}

// ===============================
// PANEL DE TICKET
// ===============================

client.on("interactionCreate", async interaction => {
    if (!interaction.isChatInputCommand()) return;

    if (interaction.commandName === "panel") {
        const menu = new StringSelectMenuBuilder()
            .setCustomId("ticket_menu")
            .setPlaceholder("🔹 Choisissez un type de ticket")
            .addOptions([
                { label: "❓ Question", value: "question" },
                { label: "🤝 Partenariat", value: "partenariat" },
                { label: "🛡️ Report Staff", value: "reportstaff" },
                { label: "⚠️ Report Joueur", value: "reportjoueur" },
                { label: "📘 Demande Légal", value: "legal" },
                { label: "📕 Demande Illégal", value: "illegal" },
                { label: "🏛️ Contacter la fondation", value: "fondation" }
            ]);

        const row = new ActionRowBuilder().addComponents(menu);

        const embed = createStyledEmbed(
            "Ouverture de ticket",
            "Sélectionnez une catégorie pour ouvrir un ticket."
        );

        await interaction.reply({ embeds: [embed], components: [row] });
    }
});

// ===============================
// OUVERTURE DU TICKET
// ===============================

client.on("interactionCreate", async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== "ticket_menu") return;

    const userId = interaction.user.id;
    const now = Date.now();

    // Anti-spam 30 sec
    if (ticketCooldown.has(userId)) {
        const last = ticketCooldown.get(userId);
        if (now - last < 30000) {
            const remaining = Math.ceil((30000 - (now - last)) / 1000);
            return interaction.reply({
                content: `⛔ Vous devez attendre **${remaining}s** avant d’ouvrir un nouveau ticket.`,
                ephemeral: true
            });
        }
    }

    ticketCooldown.set(userId, now);

    const guildId = interaction.guild.id;
    const config = serverConfig[guildId];
    const type = interaction.values[0];

    const categoryId = config.categories[type];
    const staffRoles = config.staffRoles[type];

    const channelName = `・🎫・${type}-${interaction.user.username}`;

    const channel = await interaction.guild.channels.create({
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


    const embed = createStyledEmbed("Ticket ouvert", autoMessages[type]);

    const closeButton = new ButtonBuilder()
        .setCustomId("close_ticket")
        .setLabel("Fermer le ticket")
        .setStyle(ButtonStyle.Danger);

    const row = new ActionRowBuilder().addComponents(closeButton);

    await channel.send({ embeds: [embed], components: [row] });

    await interaction.reply({ content: `🎫 Ticket ouvert : ${channel}`, ephemeral: true });

const fixedChannel = interaction.guild.channels.cache.get("1505943795643060235");
if (fixedChannel) {
    fixedChannel.send({
        embeds: [
            createStyledEmbed(
                "Nouveau ticket",
                `👤 **Utilisateur :** ${interaction.user}\n📂 **Type :** ${type}\n📁 **Salon :** ${channel}`
            )
        ]
    });
}
    // Logs
    const logChannel = interaction.guild.channels.cache.get(config.logs);
    if (logChannel) {
        const logEmbed = createStyledEmbed(
            "Nouveau ticket",
            `👤 **Utilisateur :** ${interaction.user}\n📂 **Type :** ${type}\n📁 **Salon :** ${channel}`
        );
        logChannel.send({ embeds: [logEmbed] });
    }
});

// ===============================
// FERMETURE DU TICKET
// ===============================

client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;
    if (interaction.customId !== "close_ticket") return;

    const guildId = interaction.guild.id;
    const config = serverConfig[guildId];

    const closingEmbed = createStyledEmbed(
        "Fermeture du ticket",
        `🔹 Le ticket sera fermé dans **3 secondes**.\nMerci d’avoir utilisé Nancy Ticket.`
    );

    await interaction.reply({ embeds: [closingEmbed] });

    const logChannel = interaction.guild.channels.cache.get(config.logs);
    if (logChannel) {
        const logEmbed = createStyledEmbed(
            "Ticket fermé",
            `📁 **Salon :** ${interaction.channel.name}\n👤 **Fermé par :** ${interaction.user}`
        );
        logChannel.send({ embeds: [logEmbed] });
    }

    setTimeout(() => {
        interaction.channel.delete().catch(() => {});
    }, 3000);
});

// ===============================
// TOKEN
// ===============================

client.login(process.env.TOKEN);

