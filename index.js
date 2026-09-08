const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
    res.send('Bot is running!');
});

app.listen(PORT, () => {
    console.log(`Server is listening on port ${PORT}`);
});

const { 
    Client, 
    GatewayIntentBits, 
    Partials, 
    ActionRowBuilder, 
    ButtonBuilder, 
    ButtonStyle, 
    PermissionFlagsBits 
} = require('discord.js');

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMembers,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.MessageContent,
        GatewayIntentBits.DirectMessages
    ],
    partials: [Partials.Channel, Partials.Message, Partials.GuildMember]
});

// الأيدي والآداب المطلوبة
const CONFIG = {
    verificationRoom: "1545846837192429578",
    verifiedRole: "1545848708921425920", // الرول الذي يوضع بعد التفعيل
    unverifiedRole: "1545848907156820100", // الرول التلقائي عند دخول السيرفر
    
    ticketSetupRoom: "1545847197768360000",
    ticketCategory1: "1545852986188628108", // الكاتيغوري الأول (أقصى حد 50 روم)
    ticketCategory2: "1545853004673196172", // الكاتيغوري الثاني لو امتلى الأول
    
    supportRole: "1545853407825231962", // رول السبورت (يحذف التكت بكلمة إغلاق فوراً)
    adminControlRole: "1545853891101466746" // رول التحكم الكامل
};

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// 1. منح الرول التلقائي عند دخول السيرفر
client.on('guildMemberAdd', async (member) => {
    try {
        if (CONFIG.unverifiedRole) {
            await member.roles.add(CONFIG.unverifiedRole);
        }
    } catch (err) {
        console.error("Error adding join role:", err);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    // أمر إرسال رسالة التحقق والتفعيل
    if (message.content === "!setup_verify" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const channel = message.guild.channels.cache.get(CONFIG.verificationRoom);
        if (channel) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_btn')
                    .setLabel('تفعيل')
                    .setStyle(ButtonStyle.Secondary)
            );
            await channel.send({
                content: "تنويه حنا مجرد سيرفر للفضايح ولا نمس للابتزاز بآي صلة",
                components: [row]
            });
            await message.reply("تم إرسال رسالة التفعيل بنجاح!");
        }
    }

    // أمر إرسال زر فتح التكت بالصيغة المطلوبة والزر الرمادي
    if (message.content === "!setup_ticket" && message.member.permissions.has(PermissionFlagsBits.Administrator)) {
        const channel = message.guild.channels.cache.get(CONFIG.ticketSetupRoom);
        if (channel) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket_btn')
                    .setLabel('فك تكت')
                    .setStyle(ButtonStyle.Secondary)
            );
            await channel.send({
                content: "سوي رومك مع من تحب يصير إذا واجهت أي مشكلة أو تبي المخفي بدون بوست فك تكت من الزر اللي تحت",
                components: [row]
            });
            await message.reply("تم إرسال زر التكت بنجاح!");
        }
    }

    // أوامر الإدارة (قفل، فتح، مسح)
    if (message.content.startsWith("قفل")) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false, AddReactions: false });
        return;
    }

    if (message.content.startsWith("فتح")) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageChannels)) return;
        try { await message.delete(); } catch(e) {}
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null, AddReactions: null });
        return;
    }

    if (message.content.startsWith("مسح")) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const args = message.content.split(" ");
        const count = parseInt(args[1]);
        try { await message.delete(); } catch(e) {}
        if (!isNaN(count)) {
            let fetched = await message.channel.messages.fetch({ limit: Math.min(count, 100) });
            await message.channel.bulkDelete(fetched, true);
        } else {
            let fetched = await message.channel.messages.fetch({ limit: 100 });
            await message.channel.bulkDelete(fetched, true);
        }
        return;
    }

    // أمر send لإرسال الكلام والصور بشكل طبيعي تماماً
    if (message.content.startsWith("send")) {
        if (!message.member.permissions.has(PermissionFlagsBits.ManageMessages)) return;
        const textToSend = message.content.slice(4).trim();
        const attachments = Array.from(message.attachments.values());
        
        try { await message.delete(); } catch(e) {}

        if (textToSend || attachments.length > 0) {
            await message.channel.send({
                content: textToSend || undefined,
                files: attachments
            });
        }
        return;
    }

    // أمر البث العام (bc)
    if (message.content.startsWith("bc")) {
        if (!message.member.permissions.has(PermissionFlagsBits.Administrator)) return;
        const broadcastContent = message.content.slice(2).trim();
        const attachments = Array.from(message.attachments.values());
        
        const members = await message.guild.members.fetch();
        let successCount = 0;

        for (const [id, member] of members) {
            if (member.user.bot) continue;
            try {
                await member.send({
                    content: broadcastContent || undefined,
                    files: attachments
                });
                successCount++;
            } catch (err) {}
        }

        await message.reply(`تم الإرسال إلى جميع الناس الذي بالسيرفر (${successCount})`);
        return;
    }

    // نظام حذف التكت السريع برول السبورت عند كتابة "إغلاق"
    if (message.channel.name.startsWith("ticket-")) {
        if (message.content === "إغلاق") {
            if (message.member.roles.cache.has(CONFIG.supportRole) || message.member.permissions.has(PermissionFlagsBits.Administrator)) {
                try {
                    await message.channel.delete();
                } catch (err) {
                    console.error("Error deleting ticket channel:", err);
                }
                return;
            }
        }
    }
});

// التفاعل مع الأزرار وإنشاء التكتات بالمنطق المطلوب
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // زر التفعيل
    if (interaction.customId === 'verify_btn') {
        const member = interaction.member;
        try {
            if (CONFIG.verifiedRole) await member.roles.add(CONFIG.verifiedRole);
            if (CONFIG.unverifiedRole) await member.roles.remove(CONFIG.unverifiedRole);
            await interaction.reply({ content: "تم تفعيلك بنجاح وإزالة رول الانتظار!", ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: "حدث خطأ أثناء منح الرول.", ephemeral: true });
        }
    }

    // زر فتح التكت
    if (interaction.customId === 'create_ticket_btn') {
        const guild = interaction.guild;
        const user = interaction.user;

        // فحص الكاتيغوري الأول (إذا أقل من 50 روم ينشئ فيه، وإذا وصل 50 ينقل للثاني)
        const cat1 = guild.channels.cache.get(CONFIG.ticketCategory1);
        let chosenCategory = CONFIG.ticketCategory1;

        if (cat1 && cat1.children.cache.size >= 50) {
            chosenCategory = CONFIG.ticketCategory2;
        }

        try {
            const ticketChannel = await guild.channels.create({
                name: `ticket-${user.username}`,
                type: 0, // Guild Text
                parent: chosenCategory,
                permissionOverwrites: [
                    {
                        id: guild.id,
                        Deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: user.id,
                        Allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: CONFIG.supportRole,
                        Allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                ]
            });

            await ticketChannel.send({
                content: `<@&${CONFIG.supportRole}> <@&${CONFIG.adminControlRole}>\n\n**اكتب مشكلتك قبل نجي**`
            });

            await interaction.reply({ content: `تم إنشاء التكت بنجاح: ${ticketChannel}`, ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "حدث خطأ أثناء إنشاء التكت.", ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
