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

// CONFIG
const PANEL_CHANNEL = "1505943795643060235";
const STAFF_ROLE = "1505943612507295826";

const config = {
    categories: {
        question: "1506374094906720387",
        partenariat: "1506374190956281997",
        reportstaff: "1506374327509979186",
        reportjoueur: "1506374389137149982",
        legal: "1505943608832819282",
        illegal: "1505943610141442129",
        fondation: "1506374573535268885"
    },
    logs: "1506375933051932753"
};

// VARIABLES
const activeTickets = new Map();
const claimedTickets = new Map();
const staffPinged = new Set();

client.on("ready", async () => {
    console.log(`Connecté en tant que ${client.user.tag}`);

    const channel = await client.channels.fetch(PANEL_CHANNEL);
    if (!channel) return;

    const embed = new EmbedBuilder()
        .setTitle("🎟️ Support Nancy RP")
        .setDescription(
            "Bienvenue sur le **Support Officiel Nancy RP**.\n\n" +
            "Sélectionnez une catégorie ci‑dessous pour ouvrir un ticket.\n" +
            "Un formulaire apparaîtra automatiquement.\n\n" +
            "🔵 *Notre équipe est là pour vous accompagner.*"
        )
        .setColor("#237FEB");

    const menu = new StringSelectMenuBuilder()
        .setCustomId("ticket_menu")
        .setPlaceholder("🔵 Choisissez une catégorie")
        .addOptions([
            { label: "❓ Question", value: "question" },
            { label: "🤝 Partenariat", value: "partenariat" },
            { label: "🛡️ Report Staff", value: "reportstaff" },
            { label: "⚠️ Report Joueur", value: "reportjoueur" },
            { label: "📘 Demande Légal", value: "legal" },
            { label: "📕 Demande Illégal", value: "illegal" },
            { label: "🏛️ Fondation", value: "fondation" },
            { label: "🚨 Ticket Prioritaire", value: "prioritaire" }
        ]);

    const row = new ActionRowBuilder().addComponents(menu);

    await channel.send({ embeds: [embed], components: [row] });
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isStringSelectMenu()) return;
    if (interaction.customId !== "ticket_menu") return;

    const type = interaction.values[0];

    if (activeTickets.has(`${interaction.user.id}_${type}`)) {
        return interaction.reply({
            content: "❌ Vous avez déjà un ticket ouvert dans cette catégorie.",
            ephemeral: true
        });
    }

    const modal = new ModalBuilder()
        .setCustomId(`modal_${type}`)
        .setTitle(`🔵 Ticket : ${type}`);

    const input = new TextInputBuilder()
        .setCustomId("details")
        .setLabel("Explique ta demande")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

    modal.addComponents(new ActionRowBuilder().addComponents(input));

    await interaction.showModal(modal);
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isModalSubmit()) return;

    const type = interaction.customId.replace("modal_", "");
    const details = interaction.fields.getTextInputValue("details");

    const categoryId = config.categories[type] || config.categories.question;

    const channelName = `🎫・${type}-${interaction.user.username}`;

    const ticketChannel = await interaction.guild.channels.create({
        name: channelName,
        parent: categoryId,
        permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: client.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
            { id: STAFF_ROLE, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
    });

    activeTickets.set(`${interaction.user.id}_${type}`, ticketChannel.id);

    const embed = new EmbedBuilder()
        .setTitle("🎫 Ticket Ouvert — Nancy RP")
        .setDescription(
            `👤 **Utilisateur :** ${interaction.user}\n\n` +
            `📝 **Détails fournis :**\n${details}\n\n` +
            `🔵 Un membre du staff va vous répondre.`
        )
        .setColor("#237FEB");

    const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId("call_staff")
            .setLabel("🔔 Appeler un staff")
            .setStyle(ButtonStyle.Primary),

        new ButtonBuilder()
            .setCustomId("claim_ticket")
            .setLabel("🧷 Claim le ticket")
            .setStyle(ButtonStyle.Success),

        new ButtonBuilder()
            .setCustomId("add_user")
            .setLabel("➕ Ajouter un utilisateur")
            .setStyle(ButtonStyle.Secondary),

        new ButtonBuilder()
            .setCustomId("close_ticket")
            .setLabel("🗑️ Fermer")
            .setStyle(ButtonStyle.Danger)
    );

    await ticketChannel.send({ embeds: [embed], components: [row] });

    await interaction.reply({
        content: `🎫 Ticket créé : ${ticketChannel}`,
        ephemeral: true
    });
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    const channel = interaction.channel;

    // Claim
    if (interaction.customId === "claim_ticket") {
        if (!interaction.member.roles.cache.has(STAFF_ROLE)) {
            return interaction.reply({ content: "❌ Seul un staff peut claim.", ephemeral: true });
        }

        claimedTickets.set(channel.id, interaction.user.id);

        return channel.send(`🧷 **Ticket pris en charge par :** ${interaction.user}`);
    }

    // Appeler staff
    if (interaction.customId === "call_staff") {
        if (staffPinged.has(channel.id)) {
            return interaction.reply({ content: "❌ Un staff a déjà été appelé.", ephemeral: true });
        }

        staffPinged.add(channel.id);

        await channel.send(`<@&${STAFF_ROLE}> 🔔 **Un staff est demandé ici !**`);
        return interaction.reply({ content: "Staff pingé.", ephemeral: true });
    }

    // Ajouter utilisateur
    if (interaction.customId === "add_user") {
        const modal = new ModalBuilder()
            .setCustomId("add_user_modal")
            .setTitle("Ajouter un utilisateur");

        const input = new TextInputBuilder()
            .setCustomId("userid")
            .setLabel("ID de l'utilisateur")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));

        return interaction.showModal(modal);
    }
});

client.on("interactionCreate", async interaction => {
    if (!interaction.isModalSubmit()) return;

    // Ajouter utilisateur
    if (interaction.customId === "add_user_modal") {
        const userId = interaction.fields.getTextInputValue("userid");
        const user = await interaction.guild.members.fetch(userId).catch(() => null);

        if (!user) {
            return interaction.reply({ content: "❌ Utilisateur introuvable.", ephemeral: true });
        }

        await interaction.channel.permissionOverwrites.edit(userId, {
            ViewChannel: true,
            SendMessages: true
        });

        return interaction.reply({ content: `➕ ${user} ajouté au ticket.`, ephemeral: true });
    }

    // Évaluation
    if (interaction.customId === "rating_modal") {
        const rating = interaction.fields.getTextInputValue("rating");

        let transcript = `Transcript du ticket ${interaction.channel.name}\n\n`;

        const messages = await interaction.channel.messages.fetch({ limit: 100 });
        messages.reverse().forEach(msg => {
            transcript += `[${msg.author.tag}] : ${msg.content}\n`;
        });

        const logChannel = interaction.guild.channels.cache.get(config.logs);
        if (logChannel) {
            logChannel.send({
                content: `📄 **Transcript du ticket**\n⭐ **Évaluation :** ${rating}/5`,
                files: [{ attachment: Buffer.from(transcript), name: "transcript.txt" }]
            });
        }

        await interaction.reply({ content: "🗑️ Ticket fermé.", ephemeral: true });

        setTimeout(() => interaction.channel.delete().catch(() => {}), 2000);
    }
});

// Fermeture staff only
client.on("interactionCreate", async interaction => {
    if (!interaction.isButton()) return;

    if (interaction.customId === "close_ticket") {
        if (!interaction.member.roles.cache.has(STAFF_ROLE)) {
            return interaction.reply({ content: "❌ Seul un staff peut fermer ce ticket.", ephemeral: true });
        }

        const modal = new ModalBuilder()
            .setCustomId("rating_modal")
            .setTitle("Évaluation du ticket");

        const input = new TextInputBuilder()
            .setCustomId("rating")
            .setLabel("Notez le support (1 à 5)")
            .setStyle(TextInputStyle.Short)
            .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));

        return interaction.showModal(modal);
    }
});

client.login(process.env.TOKEN);


