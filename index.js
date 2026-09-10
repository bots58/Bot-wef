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
    ticketSupportPingRole: "1545853407825231962",
    
    roleRequestRoom: "1546928048174014566", 
    supportLogRoom: "1546933674673447042",

    secretRoomSetupChannel: "1545856705110220883",
    secretRoomVoiceLog: "1545857287934054480",
    secretRoomRequestsChannel: "1545859174750224454",

    deleteRoomSetupChannel: "1547232353095778355",
    deleteRoomVoiceLog: "1547232423522082816",
    deleteRoomRequestsChannel: "1547233488418246796",

    secretApprovalChannel: "1545859261526048890",

    secretCategories: [
        "1545859590506152096",
        "1545859642721177611",
        "1545859692515823697",
        "1545859739001561098",
        "1545859775844065433",
        "1545859961202937907",
        "1545859984833773588",
        "15460027355504681",
        "15460051984588890"
    ]
};

const summonCooldowns = new Map();

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
    const hasTicketSupportRole = message.member.roles.cache.has(CONFIG.ticketSupportPingRole) || hasAdminRole;

    if (hasAdminRole && message.content.trim() === "نشر") {
        try { await message.delete(); } catch(e) {}
        
        await message.channel.send(
`discord.gg/freesecret
discord.gg/diyaabo
discord.gg/rnn
discord.gg/zbr
discord.gg/shaleh
discord.gg/tah`
        );

        setTimeout(async () => {
            await message.channel.send(
`## ازحـ،ف سىيرفر ويفات وفضىايح  وقحـ،بات وسكـ،س بالىبايو @everyone - @here

## ازحـ،ف سىيرفر ويفات وفضىايح  وقحـ،بات وسكـ،س بالىبايو @everyone - @here

## ازحـ،ف سىيرفر ويفات وفضىايح  وقحـ،بات وسكـ،س بالىبايو @everyone - @here

## ازحـ،ف سىيرفر ويفات وفضىايح  وقحـ،بات وسكـ،س بالىبايو @everyone - @here

## ازحـ،ف سىيرفر ويفات وفضىايح  وقحـ،بات وسكـ،س بالىبايو @everyone - @here`
            );
        }, 150);

        setTimeout(async () => {
            await message.channel.send("https://discord.gg/3wxjGdVJT");
        }, 400);

        setTimeout(async () => {
            await message.channel.send("**الطريقة تحط الرابط بالبايو وتدخل السيرفرات الي فوق وتنسخ الكلام الطويل وتنشر وتصور وترسل لنا وبيجيك الرول وقحـ،بة تعرض لك");
        }, 700);

        return;
    }

    // --- أمر البرودكاست (bc) ---
    if (hasAdminRole && message.content.startsWith("bc")) {
        const args = message.content.slice(2).trim();
        const filesToSend = [];

        for (const [id, attachment] of message.attachments) {
            try {
                const response = await fetch(attachment.url);
                const buffer = Buffer.from(await response.arrayBuffer());
                filesToSend.push(new AttachmentBuilder(buffer, { name: attachment.name || 'media.png' }));
            } catch (err) {
                filesToSend.push(new AttachmentBuilder(attachment.url, { name: attachment.name || 'media.png' }));
            }
        }

        try { await message.delete(); } catch(e) {}

        if (args.length > 0 || filesToSend.length > 0) {
            await message.guild.members.fetch();
            let successCount = 0;
            
            for (const member of message.guild.members.cache.values()) {
                if (member.user.bot) continue;
                try {
                    await member.send({
                        content: args.length > 0 ? args : undefined,
                        files: filesToSend
                    });
                    successCount++;
                } catch (e) {}
            }
            
            const feedback = await message.channel.send(`✅ تم إرسال البرودكاست إلى ${successCount} عضواً بنجاح.`);
            setTimeout(async () => {
                try { await feedback.delete(); } catch(e) {}
            }, 5000);
        }
        return;
    }

    // --- أمر "رسالة" لإرسال محتوى مع رسالة الـ 18 سنة في أي روم ---
    if (hasAdminRole && (message.content.startsWith("رسالة") || message.content.startsWith("message"))) {
        const args = message.content.replace(/^(رسالة|message)/, "").trim();
        const filesToSend = [];

        for (const [id, attachment] of message.attachments) {
            try {
                const response = await fetch(attachment.url);
                const buffer = Buffer.from(await response.arrayBuffer());
                filesToSend.push(new AttachmentBuilder(buffer, { name: attachment.name || 'media.png' }));
            } catch (err) {
                filesToSend.push(new AttachmentBuilder(attachment.url, { name: attachment.name || 'media.png' }));
            }
        }

        try { await message.delete(); } catch(e) {}

        const embed18 = new EmbedBuilder()
            .setDescription("This room is for those over 18 years old")
            .setColor(0x2f3136);

        await message.channel.send({
            embeds: [embed18],
            content: args.length > 0 ? args : undefined,
            files: filesToSend
        });
        return;
    }

    if (message.channel.name.startsWith("ticket-") && hasTicketSupportRole) {
        const msgContent = message.content.trim();
        const closeKeywords = ["اغلاق", "إغلاق", "آغلاق", "أغلاق"];
        if (closeKeywords.includes(msgContent)) {
            try { await message.delete(); } catch(e) {}
            setTimeout(async () => {
                try {
                    await message.channel.delete();
                } catch(e) {}
            }, 500);
            return;
        }
    }

    if (message.content.trim() === "قفل" && hasAdminRole) {
        try { await message.delete(); } catch(e) {}
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false });
        return;
    }

    if (message.content.trim() === "فتح" && hasAdminRole) {
        try { await message.delete(); } catch(e) {}
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null });
        return;
    }

    if (message.content.startsWith("مسح") && hasAdminRole) {
        try { await message.delete(); } catch(e) {}
        const args = message.content.split(" ");
        const count = parseInt(args[1]);

        if (isNaN(count)) {
            const fetched = await message.channel.messages.fetch({ limit: 100 });
            await message.channel.bulkDelete(fetched, true).catch(() => {});
        } else {
            let remaining = count;
            while (remaining > 0) {
                const fetchSize = remaining > 100 ? 100 : remaining;
                const fetched = await message.channel.messages.fetch({ limit: fetchSize });
                if (fetched.size === 0) break;
                const deleted = await message.channel.bulkDelete(fetched, true).catch(() => {});
                if (!deleted || deleted.size === 0) break;
                remaining -= deleted.size;
                if (fetched.size < fetchSize) break;
            }
        }
        return;
    }

    if (hasSupportRole && message.content.startsWith("رول")) {
        let targetMember = null;
        let roleSearchText = "";

        const args = message.content.trim().split(" ");
        
        if (message.reference) {
            try {
                const repliedMessage = await message.channel.messages.fetch(message.reference.messageId);
                targetMember = await message.guild.members.fetch(repliedMessage.author.id);
                roleSearchText = args.slice(1).join(" ").trim();
            } catch (e) {}
        }

        if (!targetMember && message.mentions.members.size > 0) {
            targetMember = message.mentions.members.first();
            let cleanContent = message.content.replace("رول", "").trim();
            message.mentions.members.forEach(m => {
                cleanContent = cleanContent.replace(new RegExp(`<@!?${m.id}>`, 'g'), '');
            });
            roleSearchText = cleanContent.trim();
        }

        if (targetMember && roleSearchText.length > 0) {
            const allRoles = message.guild.roles.cache;
            let foundRole = null;

            for (const role of allRoles.values()) {
                if (role.id === message.guild.id) continue;
                const roleName = role.name.trim();
                if (roleName.toLowerCase() === roleSearchText.toLowerCase() || roleName.toLowerCase().startsWith(roleSearchText.toLowerCase())) {
                    foundRole = role;
                    break;
                }
            }

            if (foundRole) {
                const hasRoleAlready = targetMember.roles.cache.has(foundRole.id);
                const actionType = hasRoleAlready ? 'remove' : 'add';

                const logChannel = message.guild.channels.cache.get(CONFIG.roleRequestRoom);
                if (logChannel) {
                    const embed = new EmbedBuilder()
                        .setTitle(actionType === 'add' ? "طلب إعطاء رول" : "طلب سحب رول")
                        .setDescription(`المعطا/المسحوب منه: ${targetMember}\nبواسطة السبورت: ${message.author}\nالرول المطلوب: ${foundRole.name}`)
                        .setColor(0x2f3136);

                    const row = new ActionRowBuilder().addComponents(
                        new ButtonBuilder()
                            .setCustomId(`role_accept_${targetMember.id}_${foundRole.id}_${actionType}_${message.author.id}`)
                            .setLabel('✅')
                            .setStyle(ButtonStyle.Secondary),
                        new ButtonBuilder()
                            .setCustomId(`role_deny_${targetMember.id}_${foundRole.id}_${actionType}_${message.author.id}`)
                            .setLabel('❌')
                            .setStyle(ButtonStyle.Secondary)
                    );

                    await logChannel.send({ embeds: [embed], components: [row] });
                    await message.react('✅').catch(() => {});

                    const guideChannel = message.guild.channels.cache.get(CONFIG.supportLogRoom);
                    if (guideChannel) {
                        const guideMsgContent = actionType === 'add' 
                            ? `${message.author} اكتب دليلك` 
                            : `${message.author} اكتب دليلك لتل الشخص`;
                        
                        const sentGuideMsg = await guideChannel.send({ content: guideMsgContent }).catch(() => null);
                        if (sentGuideMsg) {
                            setTimeout(async () => {
                                try { await sentGuideMsg.delete(); } catch(e) {}
                            }, 15000);
                        }
                    }
                }
                return;
            }
        }
    }

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

    if (message.content.trim() === "!setup_delete" && hasAdminRole) {
        if (message.channel.id !== CONFIG.deleteRoomSetupChannel) {
            await message.reply(`هذا الأمر مخصص فقط للروم <#${CONFIG.deleteRoomSetupChannel}>`);
            return;
        }

        const embed = new EmbedBuilder()
            .setDescription("إذا تبي تحذف روم شخص تعزه فك روم سري من تحت")
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

        await message.reply({ content: "تم ارسال طلبك للادارة واذا تم الموافقة عليها بيتم انشاء الروم" });

        const requestChannel = message.guild.channels.cache.get(CONFIG.secretApprovalChannel);
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

        const tempChannel = message.channel;
        setTimeout(async () => {
            try {
                await tempChannel.delete();
            } catch (e) {}
        }, 90000);

        return;
    }

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

    if (cleanMsg === "!setup_ticket" && hasAdminRole) {
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

    if (interaction.customId === 'create_ticket_btn') {
        const guild = interaction.guild;
        const user = interaction.user;

        const existingTicket = guild.channels.cache.find(c => c.name === `ticket-${user.username.toLowerCase()}` && c.type === 0);
        if (existingTicket) {
            await interaction.reply({ content: "لديك تذكرة مفتوحة بالفعل.", ephemeral: true });
            return;
        }

        try {
            const ticketChannel = await guild.channels.create({
                name: `ticket-${user.username}`,
                type: 0,
                parent: CONFIG.ticketCategory1,
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
                        id: CONFIG.ticketSupportPingRole,
                        Allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory],
                        Deny: [PermissionFlagsBits.AddReactions, PermissionFlagsBits.CreatePublicThreads, PermissionFlagsBits.CreatePrivateThreads]
                    }
                ]
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`summon_ticket_${user.id}`)
                    .setLabel('استدعاء')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('summon_admin')
                    .setLabel('استدعاء الادارة')
                    .setStyle(ButtonStyle.Secondary)
            );

            await ticketChannel.send({
                content: `<@&${CONFIG.ticketSupportPingRole}> <@&${CONFIG.adminControlRole}>\n\n**اكتب مشكلتك قبل نجي**`,
                components: [row]
            });

            await interaction.reply({ content: `تم إنشاء تذكرتك بنجاح: ${ticketChannel}`, ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "حدث خطأ أثناء إنشاء التكت.", ephemeral: true });
        }
        return;
    }

    if (interaction.customId.startsWith('summon_ticket_')) {
        const member = interaction.member;

        if (!member.roles.cache.has(CONFIG.ticketSupportPingRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: "ما معك رول الادارة/السبورت المخول بذلك.", ephemeral: true });
            return;
        }

        const channelId = interaction.channel.id;
        const now = Date.now();
        const cooldownTime = 5 * 60 * 1000;

        if (summonCooldowns.has(channelId)) {
            const expirationTime = summonCooldowns.get(channelId);
            if (now < expirationTime) {
                const timeLeft = expirationTime - now;
                const minutes = Math.floor(timeLeft / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);
                await interaction.reply({ 
                    content: `لازم تنتظر ${minutes}:${seconds < 10 ? '0' : ''}${seconds}`, 
                    ephemeral: true 
                });
                return;
            }
        }

        summonCooldowns.set(channelId, now + cooldownTime);

        await interaction.reply({ content: "تم إرسال التنبيه بنجاح.", ephemeral: true });

        try {
            await member.send({ content: `شيك على تذكرتك ${interaction.channel}` });
        } catch (err) {
            await interaction.followUp({ content: "لم أستطيع إرسال رسالة خاصة لك، يرجى فتح الخاص.", ephemeral: true });
        }
        return;
    }

    if (interaction.customId === 'summon_admin') {
        const sentMsg = await interaction.channel.send({ content: `<@&${CONFIG.ticketSupportPingRole}> <@&${CONFIG.adminControlRole}>` });
        setTimeout(async () => {
            try { await sentMsg.delete(); } catch(e) {}
        }, 3000);

        await interaction.reply({ content: "تم منشن الإدارة بنجاح.", ephemeral: true });
        return;
    }

    if (interaction.customId.startsWith('role_accept_') || interaction.customId.startsWith('role_deny_')) {
        const parts = interaction.customId.split('_');
        const actionStatus = parts[1];
        const targetUserId = parts[2];
        const roleId = parts[3];
        const actionType = parts[4];
        const supportUserId = parts[5];

        const targetMember = await interaction.guild.members.fetch(targetUserId).catch(() => null);
        const supportMember = await interaction.guild.members.fetch(supportUserId).catch(() => null);
        const role = interaction.guild.roles.cache.get(roleId);

        if (actionStatus === 'deny') {
            try {
                if (supportMember) {
                    await supportMember.send(`تم رفض طلبك لتل/إعطاء رول لـ <@${targetUserId}> من قبل الإدارة.`);
                }
            } catch(e) {}
            await interaction.update({ content: "تم رفض الطلب.", components: [] });
            return;
        }

        if (actionStatus === 'accept') {
            if (targetMember && role) {
                try {
                    if (actionType === 'add') {
                        await targetMember.roles.add(role);
                        if (targetMember) await targetMember.send(`تم قبول طلبك وتم إعطاؤك الرول بنجاح!`).catch(() => {});
                    } else {
                        await targetMember.roles.remove(role);
                        if (targetMember) await targetMember.send(`تم قبول طلبك وتم سحب الرول منك.`).catch(() => {});
                    }
                } catch (err) {
                    console.error(err);
                }
            }
            await interaction.update({ content: "تمت الموافقة وتطبيق الإجراء بنجاح.", components: [] });
            return;
        }
        return;
    }

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
            await interaction.reply({ content: "حدث خطأ أثناء إنشاء الروم.", ephemeral: true });
        }
        return;
    }

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
                    },
                    {
                        id: "1545853891101466746",
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
            const requestMsg = interaction.message;
            const contentBody = requestMsg.content.split('\nبواسطة')[0].trim();

            const filesToSend = [];
            for (const att of requestMsg.attachments.values()) {
                try {
                    const response = await fetch(att.url);
                    const buffer = Buffer.from(await response.arrayBuffer());
                    filesToSend.push(new AttachmentBuilder(buffer, { name: att.name || 'media.png' }));
                } catch (err) {}
            }

            let chosenCategory = null;
            for (const catId of CONFIG.secretCategories) {
                const category = guild.channels.cache.get(catId);
                if (category && category.children.cache.size < 50) {
                    chosenCategory = catId;
                    break;
                }
            }

            if (!chosenCategory) {
                chosenCategory = CONFIG.secretCategories[CONFIG.secretCategories.length - 1];
            }

            try {
                const roomName = contentBody.slice(0, 95) || `room-${targetUserId}`;

                const newSecretRoom = await guild.channels.create({
                    name: roomName,
                    type: 0,
                    parent: chosenCategory,
                    permissionOverwrites: [
                        {
                            id: guild.id,
                            Deny: [PermissionFlagsBits.ViewChannel]
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

                const embed18 = new EmbedBuilder()
                    .setDescription("This room is for those over 18 years old")
                    .setColor(0x2f3136);

                await newSecretRoom.send({ embeds: [embed18] });

                if (filesToSend.length > 0) {
                    await newSecretRoom.send({
                        files: filesToSend
                    });
                }

                await interaction.update({ content: `تم الموافقة وإنشاء الروم بنجاح: ${newSecretRoom}`, components: [] });
                try { await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
            } catch (err) {
                console.error(err);
                await interaction.reply({ content: "حدث خطأ أثناء إنشاء الروم السري.", ephemeral: true });
            }
        }
        return;
    }

    if (interaction.customId.startsWith('approve_del_') || interaction.customId.startsWith('deny_del_')) {
        const parts = interaction.customId.split('_');
        const action = parts[0];
        const targetUserId = parts[2];
        const originalChannelId = parts[3];

        const targetUser = await interaction.guild.members.fetch(targetUserId).catch(() => null);

        if (action === 'deny') {
            try {
                if (targetUser) {
                    await targetUser.send("تم رفض طلبك لحذف الروم");
                }
            } catch(e) {}
            await interaction.update({ content: "تم رفض طلب حذف الروم.", components: [] });
            try { await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
            return;
        }

        if (action === 'approve') {
            const requestMsg = interaction.message;
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
