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
    EmbedBuilder, 
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
    verifiedRole: "1545848708921425920", 
    unverifiedRole: "1545848907156820100", 
    
    ticketSetupRoom: "1545847197768360000",
    ticketCategory1: "1545852986188628108", 
    ticketCategory2: "1545853004673196172", 
    
    supportRole: "1545853407825231962", // رول السبورت
    adminControlRole: "1545853891101466746", // رول الإدارة الكاملة
    
    roleRequestRoom: "1546928048174014566" // روم طلبات الرولات الجديد
};

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

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

    // التحقق من الصلاحيات العامة (فقط الإدارة تقدر تسوي إعدادات أو قفل/فتح/مسح/bc)
    const isAdmin = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.has(CONFIG.adminControlRole);
    const isSupport = message.member.roles.cache.has(CONFIG.supportRole) || isAdmin;

    // أمر إرسال رسالة التحقق والتفعيل (خلفية سوداء عبر Embed بدون عنوان)
    if (message.content === "!setup_verify" && isAdmin) {
        const channel = message.guild.channels.cache.get(CONFIG.verificationRoom);
        if (channel) {
            const embed = new EmbedBuilder()
                .setDescription("تنويه حنا مجرد سيرفر للفضايح ولا نمس للابتزاز بآي صلة")
                .setColor(0x2f3136); // لون داكن ليعطي مظهر الخلفية السوداء

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('verify_btn')
                    .setLabel('تفعيل')
                    .setStyle(ButtonStyle.Secondary)
            );
            await channel.send({ embeds: [embed], components: [row] });
            await message.reply("تم إرسال رسالة التفعيل بنجاح!");
        }
    }

    // أمر إرسال زر التكت بالخلفية السوداء المطلوبة (Embed بدون عنوان)
    if (message.content === "!setup_ticket" && isAdmin) {
        const channel = message.guild.channels.cache.get(CONFIG.ticketSetupRoom);
        if (channel) {
            const embed = new EmbedBuilder()
                .setDescription("سوي رومك مع من تحب يصير إذا واجهت أي مشكلة أو تبي المخفي بدون بوست فك تكت من الزر اللي تحت")
                .setColor(0x2f3136);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('create_ticket_btn')
                    .setLabel('فك تكت')
                    .setStyle(ButtonStyle.Secondary)
            );
            await channel.send({ embeds: [embed], components: [row] });
            await message.reply("تم إرسال زر التكت بنجاح!");
        }
    }

    // أوامر الإدارة العامة (قفل، فتح، مسح، bc) - مخصصة للإدارة فقط
    if (message.content.startsWith("قفل") && isAdmin) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false, AddReactions: false });
        return;
    }

    if (message.content.startsWith("فتح") && isAdmin) {
        try { await message.delete(); } catch(e) {}
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null, AddReactions: null });
        return;
    }

    if (message.content.startsWith("مسح") && isAdmin) {
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

    // أمر send (متاح للسبورت والإدارة فقط)
    if (message.content.startsWith("send") && isSupport) {
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

    // أمر البث العام (bc) - للإدارة فقط
    if (message.content.startsWith("bc") && isAdmin) {
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

    // نظام طلب إعطاء الرولات (رول [منشن] [اسم الرول])
    if (message.content.startsWith("رول") && isSupport) {
        const args = message.content.split(" ");
        const targetMember = message.mentions.members.first();
        
        if (!targetMember) {
            return message.reply("يرجى منشن الشخص المراد إعطاؤه الرول بشكل صحيح.");
        }

        // استخراج اسم الرول (كل ما بعد المنشن)
        const roleQuery = message.content.replace("رول", "").replace(/<@!?\d+>/g, "").trim();
        
        if (!roleQuery) {
            return message.reply("يرجى كتابة اسم الرول أو أول حرفين منه.");
        }

        // البحث عن الرول في السيرفر (يطابق الاسم أو يبدأ به)
        const foundRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleQuery.toLowerCase()));

        if (!foundRole) {
            return message.reply(`لم يتم العثور على رول مطابق لـ "${roleQuery}".`);
        }

        // الرد على رسالة المستخدم بطلب كتابة الدليل لحالها أولاً
        await message.reply("اكتب رسالتك اكتب رسالتك مع دليلك لحالها.");

        // إرسال الطلب إلى الروم المخصص للطلبات (1546928048174014566)
        const requestChannel = message.guild.channels.cache.get(CONFIG.roleRequestRoom);
        if (requestChannel) {
            const attachments = Array.from(message.attachments.values());
            
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`approve_role_${targetMember.id}_${foundRole.id}`)
                    .setLabel('صح')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`deny_role_${targetMember.id}`)
                    .setLabel('خطأ')
                    .setStyle(ButtonStyle.Danger)
            );

            await requestChannel.send({
                content: `طلب إعطاء رول (${foundRole.name}) للعضو: ${targetMember}\nبواسطة: ${message.author}`,
                files: attachments,
                components: [row]
            });
        }
        return;
    }

    // نظام حذف التكت السريع (أقل من ثانية) - مخصص للسبورت فقط عند كتابة "إغلاق" داخل التكت
    if (message.channel.name.startsWith("ticket-")) {
        if (message.content === "إغلاق" && isSupport) {
            try {
                await message.channel.delete();
            } catch (err) {
                console.error("Error deleting ticket channel:", err);
            }
            return;
        }
    }
});

// التفاعل مع الأزرار
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

        const cat1 = guild.channels.cache.get(CONFIG.ticketCategory1);
        let chosenCategory = CONFIG.ticketCategory1;

        if (cat1 && cat1.children.cache.size >= 50) {
            chosenCategory = CONFIG.ticketCategory2;
        }

        try {
            const ticketChannel = await guild.channels.create({
                name: `ticket-${user.username}`,
                type: 0, 
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

    // أزرار قبول أو رفض طلب الرول
    if (interaction.customId.startsWith('approve_role_') || interaction.customId.startsWith('deny_role_')) {
        const isApprove = interaction.customId.startsWith('approve_role_');
        const parts = interaction.customId.split('_');
        const targetUserId = parts[2];
        const roleId = parts[3];

        const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);

        if (isApprove && member && roleId) {
            try {
                await member.roles.add(roleId);
                await interaction.update({ content: `تم إعطاء الرول بنجاح إلى ${member}`, components: [] });
            } catch (err) {
                await interaction.reply({ content: "حدث خطأ أثناء منح الرول للمستخدم.", ephemeral: true });
            }
        } else if (!isApprove) {
            await interaction.update({ content: "لم يتم إعطاء الشخص المحدد الرول.", components: [] });
        } else {
            await interaction.reply({ content: "لم يتم العثور على العضو.", ephemeral: true });
        }
    }
});

client.login(process.env.TOKEN);
