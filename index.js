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
    PermissionFlagsBits,
    AttachmentBuilder
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

const CONFIG = {
    verificationRoom: "1545846837192429578",
    verifiedRole: "1545848708921425920", 
    unverifiedRole: "1545848907156820100", 
    
    ticketSetupRoom: "1545847197768360000",
    ticketCategory1: "1545852986188628108", 
    ticketCategory2: "1545853004673196172", 
    
    supportRole: "1547161341045776484", 
    adminControlRole: "1545853891101466746", 
    
    roleRequestRoom: "1546928048174014566", 
    supportLogRoom: "1546933674673447042",

    // إعدادات الرومات السرية الجديدة
    secretRoomSetupChannel: "1545856705110220883",
    secretRoomVoiceLog: "1545857287934054480",
    secretRoomRequestsChannel: "1545859174750224454",

    deleteRoomSetupChannel: "1547232353095778355",
    deleteRoomVoiceLog: "1547232423522082816",
    deleteRoomRequestsChannel: "1547233488418246796",

    // كاتيجوريات الرومات السرية بالترتيب
    secretCategories: [
        "1545859590506152096",
        "1545859642721177611",
        "1545859692515823697",
        "1545859739001561098",
        "1545859775844065433",
        "1545859961202937907",
        "1545859984833773588",
        "15460027355504681", // تم تصحيح طول الأيدي الاحتياطي بناءً على طلبك
        "15460051984588890"
    ]
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
        console.error("Error handling guildMemberAdd role assignment safely:", err);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const hasAdminRole = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.has(CONFIG.adminControlRole);
    const hasSupportRole = message.member.roles.cache.has(CONFIG.supportRole) || hasAdminRole;

    // أمر إرسال رسالة وزر إنشاء الروم السري
    if (message.content.trim() === "!setup_secret" && hasAdminRole) {
        if (message.channel.id !== CONFIG.secretRoomSetupChannel) {
            await message.reply(`هذا الأمر مخصص فقط للروم <#${CONFIG.secretRoomSetupChannel}>`);
            return;
        }

        const embed = new EmbedBuilder()
            .setDescription("انشاء رومك على من تكره بسرية تامه")
            .setColor(0x2f3136);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_wef_voice')
                .setLabel('انشاء روم')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        try { await message.delete(); } catch(e) {}
        return;
    }

    // أمر إرسال رسالة وزر حذف الروم
    if (message.content.trim() === "!setup_delete" && hasAdminRole) {
        if (message.channel.id !== CONFIG.deleteRoomSetupChannel) {
            await message.reply(`هذا الأمر مخصص فقط للروم <#${CONFIG.deleteRoomSetupChannel}>`);
            return;
        }

        const embed = new EmbedBuilder()
            .setDescription("إذا تبي تحذف روم شخص تحزه فك روم سري من تحت")
            .setColor(0x2f3136);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_delete_voice')
                .setLabel('حذف روم')
                .setStyle(ButtonStyle.Secondary)
        );

        await message.channel.send({ embeds: [embed], components: [row] });
        try { await message.delete(); } catch(e) {}
        return;
    }

    // التعامل مع استقبال طلبات إنشاء الروم في روم wef-
    if (message.channel.name.startsWith("wef-")) {
        const userContent = message.content.trim();
        const filesToSend = [];

        for (const [id, attachment] of message.attachments) {
            try {
                const response = await fetch(attachment.url);
                const buffer = Buffer.from(await response.arrayBuffer());
                filesToSend.push(new AttachmentBuilder(buffer, { name: attachment.name || 'image.png' }));
            } catch (err) {
                filesToSend.push(new AttachmentBuilder(attachment.url, { name: attachment.name || 'image.png' }));
            }
        }

        // إرسال رسالة مؤقتة للمستخدم بأن طلبه أرسل للإدارة
        await message.reply({ content: "تم ارسال طلبك للادارة واذا تم الموافقة عليها بيتم انشاء الروم" });

        // إرسال الطلب لروم طلبات الإدارة
        const requestChannel = message.guild.channels.cache.get(CONFIG.secretRoomRequestsChannel);
        if (requestChannel) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`approve_wef_${message.author.id}_${message.channel.id}`)
                    .setLabel('✅')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`deny_wef_${message.author.id}_${message.channel.id}`)
                    .setLabel('❌')
                    .setStyle(ButtonStyle.Secondary)
            );

            await requestChannel.send({
                content: `${userContent}\nبواسطة صاحب الروم: ${message.author}`,
                files: filesToSend,
                components: [row]
            });
        }

        // جدولة حذف روم المؤقت wef- بعد 90 ثانية
        const tempChannel = message.channel;
        setTimeout(async () => {
            try {
                await tempChannel.delete();
            } catch (e) {}
        }, 90000);

        return;
    }

    // التعامل مع استقبال سبب حذف الروم في delete-room-
    if (message.channel.name.startsWith("delete-room-")) {
        const userContent = message.content.trim();
        const filesToSend = [];

        for (const [id, attachment] of message.attachments) {
            try {
                const response = await fetch(attachment.url);
                const buffer = Buffer.from(await response.arrayBuffer());
                filesToSend.push(new AttachmentBuilder(buffer, { name: attachment.name || 'image.png' }));
            } catch (err) {
                filesToSend.push(new AttachmentBuilder(attachment.url, { name: attachment.name || 'image.png' }));
            }
        }

        const requestChannel = message.guild.channels.cache.get(CONFIG.deleteRoomRequestsChannel);
        if (requestChannel) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`approve_del_${message.author.id}_${message.channel.id}`)
                    .setLabel('✅')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`deny_del_${message.author.id}_${message.channel.id}`)
                    .setLabel('❌')
                    .setStyle(ButtonStyle.Secondary)
            );

            await requestChannel.send({
                content: `${userContent}\nمقدم الطلب: ${message.author}`,
                files: filesToSend,
                components: [row]
            });
        }

        try { await message.reply("تم إرسال طلبك للإدارة للمراجعة."); } catch (e) {}
        return;
    }

    // الأوامر الأخرى (ver, setup_ticket, send, bc, رول, إلخ)
    const cleanMsg = message.content.trim();
    if (cleanMsg === "ver" && hasAdminRole) {
        if (message.channel.id !== CONFIG.verificationRoom) {
            await message.reply(`هذا الأمر مخصص فقط للروم <#${CONFIG.verificationRoom}>`);
            return;
        }
        
        const embed = new EmbedBuilder()
            .setDescription("للتنوية حنا سيرفر فضايح ولا نمس للابتزاز باي صلة")
            .setColor(0x2f3136);

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('verify_btn')
                .setLabel('تفعيل')
                .setStyle(ButtonStyle.Secondary)
        );
        
        await message.channel.send({ embeds: [embed], components: [row] });
        try { await message.delete(); } catch(e) {}
        return;
    }

    if (message.content.trim() === "!setup_ticket" && hasAdminRole) {
        const channel = message.guild.channels.cache.get(CONFIG.ticketSetupRoom);
        if (channel) {
            const embed = new EmbedBuilder()
                .setDescription("إذا واجهتك اي مشكله او تبي البرايفت فك تكت من الزر الي تحت")
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
        return;
    }

    if ((cleanMsg === "إخفاء" || cleanMsg === "اخفا") && hasAdminRole) {
        try { await message.delete(); } catch(e) {}
        await message.channel.permissionOverwrites.edit(CONFIG.unverifiedRole, { ViewChannel: false });
        return;
    }

    if ((cleanMsg === "إظهار" || cleanMsg === "اظهار") && hasAdminRole) {
        try { await message.delete(); } catch(e) {}
        await message.channel.permissionOverwrites.edit(CONFIG.unverifiedRole, { ViewChannel: null });
        return;
    }

    if (message.content.startsWith("send") && hasSupportRole) {
        const textToSend = message.content.slice(4).trim();
        const filesToSend = [];

        for (const [id, attachment] of message.attachments) {
            try {
                const response = await fetch(attachment.url);
                const buffer = Buffer.from(await response.arrayBuffer());
                filesToSend.push(new AttachmentBuilder(buffer, { name: attachment.name || 'image.png' }));
            } catch (err) {
                filesToSend.push(new AttachmentBuilder(attachment.url, { name: attachment.name || 'image.png' }));
            }
        }

        try { await message.delete(); } catch(e) {}

        if (textToSend || filesToSend.length > 0) {
            await message.channel.send({
                content: textToSend || undefined,
                files: filesToSend
            });
        }
        return;
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // زر التفعيل
    if (interaction.customId === 'verify_btn') {
        const member = interaction.member;
        try {
            if (CONFIG.unverifiedRole && member.roles.cache.has(CONFIG.unverifiedRole)) {
                await member.roles.remove(CONFIG.unverifiedRole);
            }
            if (CONFIG.verifiedRole && !member.roles.cache.has(CONFIG.verifiedRole)) {
                await member.roles.add(CONFIG.verifiedRole);
            }
            await interaction.reply({ content: "تم تفعيلك بنجاح!", ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: "تم تفعيلك بنجاح!", ephemeral: true }).catch(() => {});
        }
        return;
    }

    // زر إنشاء روم سري مؤقت wef-
    if (interaction.customId === 'open_wef_voice') {
        const guild = interaction.guild;
        const user = interaction.user;

        const existingWef = guild.channels.cache.find(c => c.name === `wef-${user.username}` && c.type === 0);
        if (existingWef) {
            await interaction.reply({ content: "لديك روم طلب مفتوح بالفعل.", ephemeral: true });
            return;
        }

        try {
            const wefChannel = await guild.channels.create({
                name: `wef-${user.username}`,
                type: 0,
                parent: CONFIG.secretRoomVoiceLog,
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

            await interaction.reply({ content: `تم إنشاء روم الطلب الخاص بك: ${wefChannel}`, ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "حدث خطأ أثناء إنشاء الروم.", ephemeral: true });
        }
        return;
    }

    // زر فتح روم حذف الروم delete-room-
    if (interaction.customId === 'open_delete_voice') {
        const guild = interaction.guild;
        const user = interaction.user;

        const existingDel = guild.channels.cache.find(c => c.name === `delete-room-${user.username}` && c.type === 0);
        if (existingDel) {
            await interaction.reply({ content: "لديك طلب حذف مفتوح بالفعل.", ephemeral: true });
            return;
        }

        try {
            const delChannel = await guild.channels.create({
                name: `delete-room-${user.username}`,
                type: 0,
                parent: CONFIG.deleteRoomVoiceLog,
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

            await delChannel.send("اكتب سبب حذف الروم ومنشن الروم وبينرسل طلبك للادارة واذا تم الموافقة عليه بينحذف");
            await interaction.reply({ content: `تم إنشاء روم طلب الحذف: ${delChannel}`, ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: "حدث خطأ أثناء إنشاء الروم.", ephemeral: true });
        }
        return;
    }

    // الموافقة على إنشاء الروم السري وتوزيعها تلقائياً بالترتيب (أقل من 50 روم لكل كاتيغوري)
    if (interaction.customId.startsWith('approve_wef_') || interaction.customId.startsWith('deny_wef_')) {
        const parts = interaction.customId.split('_');
        const action = parts[0];
        const targetUserId = parts[2];
        const originalChannelId = parts[3];

        const targetUser = await interaction.guild.members.fetch(targetUserId).catch(() => null);

        if (action === 'deny') {
            try {
                if (targetUser) await targetUser.send("تم رفض طلبك لانشاء روم");
            } catch(e) {}
            await interaction.update({ content: "تم رفض طلب إنشاء الروم.", components: [] });
            try { await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
            return;
        }

        if (action === 'approve') {
            const guild = interaction.guild;
            
            // جلب محتوى الرسالة الأصلية (الصور والنصوص)
            const requestMsg = interaction.message;
            const contentBody = requestMsg.content.split('\nبواسطة')[0];

            const filesToSend = [];
            for (const att of requestMsg.attachments.values()) {
                try {
                    const response = await fetch(att.url);
                    const buffer = Buffer.from(await response.arrayBuffer());
                    filesToSend.push(new AttachmentBuilder(buffer, { name: att.name || 'image.png' }));
                } catch (err) {}
            }

            // البحث عن الكاتيغوري المناسب (أقل من 50 روم بالترتيب)
            let chosenCategory = null;
            for (const catId of CONFIG.secretCategories) {
                const category = guild.channels.cache.get(catId);
                if (category && category.children.cache.size < 50) {
                    chosenCategory = catId;
                    break;
                }
            }

            // إذا امتلت كل الكاتيغوريات نضعها في الأخيرة كاحتياط
            if (!chosenCategory) {
                chosenCategory = CONFIG.secretCategories[CONFIG.secretCategories.length - 1];
            }

            try {
                // اسم الروم يكون محتوى رسالة الشخص (مثل اسم الشخص أو العبارة)
                const roomName = contentBody.slice(0, 95) || `room-${targetUserId}`;

                const newSecretRoom = await guild.channels.create({
                    name: roomName,
                    type: 0,
                    parent: chosenCategory,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            Deny: [PermissionFlagsBits.ViewChannel] // محد يشوفه أبدا حتى السبورت مايشوفون بس الإستريتر/الإدارة
                        },
                        {
                            id: CONFIG.adminControlRole,
                            Allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        },
                        {
                            id: targetUserId,
                            Allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                        }
                    ]
                });

                // أول ما يتسوى الروم يرسل التحذير والبيانات
                await newSecretRoom.send("This room is for those over 18 years old");
                if (contentBody || filesToSend.length > 0) {
                    await newSecretRoom.send({
                        content: contentBody || undefined,
                        files: filesToSend
                    });
                }

                await interaction.update({ content: `تم الموافقة وإنشاء الروم بنجاح: ${newSecretRoom}`, components: [] });
                try { await guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: "حدث خطأ أثناء إنشاء الروم السري.", ephemeral: true });
            }
        }
        return;
    }

    // الموافقة أو الرفض لحذف الروم
    if (interaction.customId.startsWith('approve_del_') || interaction.customId.startsWith('deny_del_')) {
        const parts = interaction.customId.split('_');
        const action = parts[0];
        const targetUserId = parts[2];
        const originalChannelId = parts[3];

        const targetUser = await interaction.guild.members.fetch(targetUserId).catch(() => null);

        if (action === 'deny') {
            try {
                if (targetUser) await targetUser.send("تم رفض طلبك لحذف الروم");
            } catch(e) {}
            await interaction.update({ content: "تم رفض طلب حذف الروم.", components: [] });
            try { await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
            return;
        }

        if (action === 'approve') {
            const requestMsg = interaction.message;
            // استخراج الروم الممنشن من رسالة الطلب لحذفه فوراً
            const mentionedChannel = requestMsg.mentions.channels.first();

            if (mentionedChannel) {
                try {
                    await mentionedChannel.delete();
                } catch (e) {}
            }

            await interaction.update({ content: "تمت الموافقة وحذف الروم بنجاح.", components: [] });
            try { await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
        }
        return;
    }
});

client.login(process.env.TOKEN);
