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
    adminControlRole: "1545853891101466746", // رول the rint Fire (الأونرية)
    ticketSupportPingRole: "1545853407825231962",
    
    privateRole: "1547232423522082816", // تم استبعاده نهائياً من التكتات

    roleRequestRoom: "1546928048174014566", 
    supportLogRoom: "1546933674673447042",

    secretRoomSetupChannel: "1545856705110220883",
    secretRoomVoiceLog: "1545857287934054480",
    secretRoomRequestsChannel: "1545859174750224454",

    deleteRoomSetupChannel: "1547232353095778355",
    deleteRoomVoiceLog: "1547232423522082816",
    deleteRoomRequestsChannel: "1547233488418246796",

    secretApprovalChannel: "1545859261526048890",
    topChannelId: "1547705159830863912",
    makhfiApprovalChannel: "1547692687195635813",
    linkRoomTarget: "1547714756222128208",

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
const linkCooldowns = new Map();
const pendingNasharEdits = new Set();
let customNasharLinks = `discord.gg/WzwA2K3hsv`;

const userStats = new Map(); 

function getTodayDate() {
    return new Date().toISOString().split('T')[0];
}

function checkAndResetDaily(userId) {
    const today = getTodayDate();
    if (!userStats.has(userId)) {
        userStats.set(userId, { total: 0, daily: 0, lastReset: today });
    }
    const data = userStats.get(userId);
    if (data.lastReset !== today) {
        data.daily = 0;
        data.lastReset = today;
    }
    return data;
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);

    setInterval(async () => {
        try {
            const channel = await client.channels.fetch(CONFIG.topChannelId).catch(() => null);
            if (!channel) return;

            const sortedUsers = Array.from(userStats.entries())
                .sort((a, b) => b[1].total - a[1].total)
                .slice(0, 100);

            let descText = "";
            if (sortedUsers.length === 0) {
                descText = "لا توجد نقاط مسجلة حتى الآن.";
            } else {
                sortedUsers.forEach(([userId, data], index) => {
                    descText += `- ${index + 1} <@${userId}> ⟶ ${data.total}\n`;
                });
            }

            const embed = new EmbedBuilder()
                .setDescription(descText)
                .setColor(0x2f3136);

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId('my_stats_btn')
                    .setLabel('my stats')
                    .setStyle(ButtonStyle.Secondary)
            );

            const messages = await channel.messages.fetch({ limit: 10 }).catch(() => null);
            const botMsg = messages ? messages.find(m => m.author.id === client.user.id && m.components.length > 0) : null;

            if (botMsg) {
                await botMsg.edit({ embeds: [embed], components: [row] }).catch(() => {});
            } else {
                await channel.send({ embeds: [embed], components: [row] });
            }
        } catch (err) {
            console.error("Error in top interval update:", err);
        }
    }, 30000);
});

client.on('channelCreate', async (channel) => {
    if (!channel.guild) return;
    
    if (channel.parentId === CONFIG.secretRoomVoiceLog || channel.parentId === CONFIG.ticketCategory1 || channel.parentId === CONFIG.ticketCategory2) {
        try {
            const overwrites = [
                {
                    id: channel.guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: CONFIG.adminControlRole,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
                }
            ];

            if (channel.parentId === CONFIG.ticketCategory1 || channel.parentId === CONFIG.ticketCategory2) {
                overwrites.push(
                    {
                        id: CONFIG.ticketSupportPingRole,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    },
                    {
                        id: CONFIG.supportRole,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                    }
                );
            }

            await channel.permissionOverwrites.set(overwrites);
        } catch (err) {
            console.error("Error setting channel permissions:", err);
        }
    }
});

client.on('guildMemberAdd', async (member) => {
    try {
        if (CONFIG.unverifiedRole) {
            await member.roles.add(CONFIG.unverifiedRole);
        }
    } catch (err) {
        console.error("Error handling guildMemberAdd:", err);
    }
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const isOwner = message.author.id === message.guild.ownerId;
    const hasAdminRole = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.has(CONFIG.adminControlRole);
    const hasSupportRole = message.member.roles.cache.has(CONFIG.supportRole) || hasAdminRole;
    const hasTicketSupportRole = message.member.roles.cache.has(CONFIG.ticketSupportPingRole) || hasAdminRole;

    const linkRegex = /(https?:\/\/[^\s]+|discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+)/i;
    if (linkRegex.test(message.content)) {
        if (!message.member.roles.cache.has(CONFIG.adminControlRole) && !hasAdminRole && !isOwner) {
            try {
                await message.delete();
                const warningMsg = await message.channel.send({ content: `${message.author} ممنوع إرسال الروابط هنا!` });
                setTimeout(async () => {
                    try { await warningMsg.delete(); } catch(e) {}
                }, 4000);
            } catch (e) {}
            return;
        }
    }

    if (message.channel.id === CONFIG.linkRoomTarget) {
        try { await message.delete(); } catch(e) {}

        const userId = message.author.id;
        const now = Date.now();
        const cooldownDuration = 3 * 60 * 60 * 1000; 

        if (linkCooldowns.has(userId)) {
            const expirationTime = linkCooldowns.get(userId);
            if (now < expirationTime) {
                const timeLeft = expirationTime - now;
                const hours = Math.floor(timeLeft / (1000 * 60 * 60));
                const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
                const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);
                
                const timeString = `${hours}:${minutes < 10 ? '0' : ''}${minutes}:${seconds < 10 ? '0' : ''}${seconds}`;
                
                const warningMsg = await message.channel.send({ content: `${message.author} لازم تنتظر \`${timeString}\`` });
                setTimeout(async () => {
                    try { await warningMsg.delete(); } catch(e) {}
                }, 5000);
                return;
            }
        }

        linkCooldowns.set(userId, now + cooldownDuration);

        try {
            await message.author.send(`ارسل الرابط لعشرة واستلم البرايفت وقحبة تعرض لك\n\n${customNasharLinks}`);
            
            const successNotice = await message.channel.send({ content: `${message.author} تم إرسال الرابط لك بالخاص.` });
            setTimeout(async () => {
                try { await successNotice.delete(); } catch(e) {}
            }, 5000);

            const publicNotice = await message.channel.send({ content: `تم ارسال الرابط لك بالخاص` });
            setTimeout(async () => {
                try { await publicNotice.delete(); } catch(e) {}
            }, 3000);

        } catch (err) {
            const errNotice = await message.channel.send({ content: `${message.author} يرجى فتح الخاص لتلقي الرابط!` });
            setTimeout(async () => {
                try { await errNotice.delete(); } catch(e) {}
            }, 5000);
        }
        return;
    }

    const msgContentTrimmed = message.content.trim();
    if (msgContentTrimmed === "اغلاق" || msgContentTrimmed === "إغلاق") {
        if (message.member.roles.cache.has(CONFIG.adminControlRole) || hasAdminRole) {
            try { await message.delete(); } catch(e) {}
            setTimeout(async () => {
                try {
                    await message.channel.delete();
                } catch(e) {}
            }, 500);
            return;
        }
    }

    if (hasAdminRole && pendingNasharEdits.has(message.author.id)) {
        pendingNasharEdits.delete(message.author.id);
        customNasharLinks = message.content;
        try { await message.delete(); } catch(e) {}
        const confirmMsg = await message.channel.send("✅ تم تحديث روابط النشر بنجاح!");
        setTimeout(async () => {
            try { await confirmMsg.delete(); } catch(e) {}
        }, 4000);
        return;
    }

    if (hasAdminRole && message.content.trim() === "تعديل نشر") {
        try { await message.delete(); } catch(e) {}
        pendingNasharEdits.add(message.author.id);
        await message.author.send("اكتب الكلام الجديد وأي كلمة تكتبها تصير حق اللي تنرسل لما اكتب نشر.").catch(async () => {
            const fallback = await message.channel.send({ content: `${message.author} اكتب الكلام الجديد وأي كلمة تكتبها تصير حق اللي تنرسل لما اكتب نشر.` });
            setTimeout(async () => {
                try { await fallback.delete(); } catch(e) {}
            }, 10000);
        });
        return;
    }

    if (hasAdminRole && message.content.trim() === "نشر") {
        try { await message.delete(); } catch(e) {}
        
        await message.channel.send(customNasharLinks);

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
            await message.channel.send("**الطريقة تحط الرابط بالبايو وتدخل السيرفرات الي فوق وتنسخ الكلام الطويل وتنشر وتصور وترسل لنا وبيجيك الرول وقحـ،بة تعرض لك**");
        }, 700);

        return;
    }

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

    if ((message.content.startsWith("رسالة") || message.content.startsWith("رساله"))) {
        if (!message.member.roles.cache.has(CONFIG.adminControlRole) && !hasAdminRole) {
            try { await message.delete(); } catch(e) {}
            const errNotice = await message.channel.send({ content: `${message.author} هذا الأمر مخصص فقط لمن يملك رول الأونرية.` });
            setTimeout(async () => {
                try { await errNotice.delete(); } catch(e) {}
            }, 5000);
            return;
        }

        const args = message.content.replace(/^(رسالة|رساله)/, "").trim();
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

        const textToSend = args.length > 0 ? args : "This room is for those over 18 years old";
        const embed = new EmbedBuilder()
            .setDescription(textToSend)
            .setColor(0x2b2d31);

        await message.channel.send({
            embeds: [embed],
            files: filesToSend
        });
        return;
    }

    if (message.channel.name.startsWith("ticket-") && (hasTicketSupportRole || message.member.roles.cache.has(CONFIG.supportRole) || message.member.roles.cache.has(CONFIG.adminControlRole))) {
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

    if (message.content.trim() === "ستيب مخفي") {
        if (!isOwner) {
            try { await message.delete(); } catch(e) {}
            const errNotice = await message.channel.send({ content: `${message.author} هذا الأمر مخصص لصاحب السيرفر (Owner) فقط.` });
            setTimeout(async () => {
                try { await errNotice.delete(); } catch(e) {}
            }, 5000);
            return;
        }

        const targetSetupRoom = "1547690677763055636";
        if (message.channel.id !== targetSetupRoom) {
            await message.reply(`هذا الأمر مخصص فقط للروم <#${targetSetupRoom}>`);
            return;
        }

        const row = new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('open_makhfi_room')
                .setLabel('برايفت')
                .setStyle(ButtonStyle.Secondary)
        );

        const embed = new EmbedBuilder()
            .setDescription("ودك بالبرايفت ؟ ارسل الرابط لعشره وفك من تحت")
            .setColor(0x2b2d31);

        await message.channel.send({
            embeds: [embed],
            components: [row]
        });
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

        await message.reply({ content: `تم إرسال طلبك للإدارة، وإذا تمت الموافقة عليه بينشأ الروم.` });
        setTimeout(async () => {
            try {
                await message.channel.delete();
            } catch(e) {}
        }, 5000);

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

        await message.reply({ content: `تم إرسال طلبك للإدارة، وإذا تمت الموافقة عليه بينحذف.` });
        setTimeout(async () => {
            try {
                await message.channel.delete();
            } catch(e) {}
        }, 5000);

        return;
    }

    if (message.channel.name.startsWith("رول-مخفي-")) {
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

        const requestChannel = message.guild.channels.cache.get(CONFIG.makhfiApprovalChannel);
        if (requestChannel) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`approve_makhfi_${message.author.id}_${message.channel.id}`)
                    .setLabel('✅')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`deny_makhfi_${message.author.id}_${message.channel.id}`)
                    .setLabel('❌')
                    .setStyle(ButtonStyle.Secondary)
            );

            await requestChannel.send({
                content: `طلب رول مخفي من ${message.author}\n\n${userContent}`,
                files: filesToSend,
                components: [row]
            });
        }

        await message.reply({ content: `تم إرسال طلبك للإدارة، انتظر الموافقة ${message.author}` });
        setTimeout(async () => {
            try {
                await message.channel.delete();
            } catch (e) {}
        }, 5000);

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

    if (interaction.customId === 'my_stats_btn') {
        const userId = interaction.user.id;
        const stats = checkAndResetDaily(userId);
        await interaction.reply({
            content: `الرومات الي فكيتها اليوم ⟵ ${stats.daily}\nالرومات الي فكيتها كليا ⟵ ${stats.total}`,
            ephemeral: true
        });
        return;
    }

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

        await guild.channels.fetch();

        const existingTicket = guild.channels.cache.find(c => {
            const isTicketCategory = c.parentId === CONFIG.ticketCategory1 || c.parentId === CONFIG.ticketCategory2 || c.name.startsWith('ticket-');
            if (!isTicketCategory) return false;

            const hasUserOverwrite = c.permissionOverwrites && c.permissionOverwrites.cache.has(user.id);
            const inChannelName = c.name.includes(user.username.toLowerCase()) || c.name.includes(user.id);
            return hasUserOverwrite || inChannelName;
        });

        if (existingTicket) {
            await interaction.reply({ content: `لديك تكت من قبل (${existingTicket}) ولا يمكنك فتح تكت جديد حتى يتم إغلاق تكتك القديمة.`, ephemeral: true });
            return;
        }

        try {
            // التعديل النهائي والصارم: استبعاد رول البرايفت تماماً، وجعل الأذونات حصرياً لصاحب التكت، السبورت، و the rint Fire (adminControlRole)
            const ticketOverwrites = [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                },
                {
                    id: CONFIG.supportRole,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                },
                {
                    id: CONFIG.adminControlRole,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory, PermissionFlagsBits.ManageChannels]
                }
            ];

            const ticketChannel = await guild.channels.create({
                name: `ticket-${user.username}`,
                type: 0,
                parent: CONFIG.ticketCategory1,
                permissionOverwrites: ticketOverwrites
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

        if (!member.roles.cache.has(CONFIG.ticketSupportPingRole) && !member.roles.cache.has(CONFIG.supportRole) && !member.roles.cache.has(CONFIG.adminControlRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
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

        const parts = interaction.customId.split('_');
        const originalOwnerId = parts[2];

        if (originalOwnerId) {
            try {
                const originalOwner = await interaction.guild.members.fetch(originalOwnerId);
                if (originalOwner) {
                    await originalOwner.send(`شيك على تذكرتك ${interaction.channel}`);
                }
            } catch (err) {
                await interaction.followUp({ content: "لم أستطيع إرسال رسالة خاصة لصاحب التكت، يرجى فتح الخاص.", ephemeral: true });
            }
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
            const wefOverwrites = [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ManageMessages
                    ]
                },
                {
                    id: CONFIG.adminControlRole,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ];

            const wefChannel = await guild.channels.create({
                name: `wef-${user.username}`,
                type: 0,
                parent: CONFIG.secretRoomVoiceLog,
                permissionOverwrites: wefOverwrites
            });

            await wefChannel.send(`أرسل صورك ودليلك لإنشاء الروم <@&${CONFIG.adminControlRole}> <@${user.id}>`);
            await interaction.reply({ content: `تم إنشاء روم الطلب الخاص بك: ${wefChannel}`, ephemeral: true });

            setTimeout(async () => {
                try {
                    const channelToCheck = guild.channels.cache.get(wefChannel.id);
                    if (channelToCheck) {
                        await channelToCheck.delete();
                    }
                } catch (e) {}
            }, 600000);

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
            const delOverwrites = [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ManageMessages
                    ]
                },
                {
                    id: CONFIG.adminControlRole,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ];

            const delChannel = await guild.channels.create({
                name: `delete-room-${user.username}`,
                type: 0,
                parent: CONFIG.deleteRoomVoiceLog,
                permissionOverwrites: delOverwrites
            });

            await delChannel.send(`أرسل صورك ودليلك لحذف الروم <@&${CONFIG.adminControlRole}> <@${user.id}>`);
            await interaction.reply({ content: `تم إنشاء روم طلب الحذف: ${delChannel}`, ephemeral: true });

            setTimeout(async () => {
                try {
                    const channelToCheck = guild.channels.cache.get(delChannel.id);
                    if (channelToCheck) {
                        await channelToCheck.delete();
                    }
                } catch (e) {}
            }, 600000);

        } catch (err) {
            await interaction.reply({ content: "حدث خطأ أثناء إنشاء الروم.", ephemeral: true });
        }
        return;
    }

    if (interaction.customId === 'open_makhfi_room') {
        const guild = interaction.guild;
        const user = interaction.user;

        const existingMakhfi = guild.channels.cache.find(c => c.name === `رول-مخفي-${user.username}` && c.type === 0);
        if (existingMakhfi) {
            await interaction.reply({ content: "لديك روم مخفي مفتوح بالفعل.", ephemeral: true });
            return;
        }

        try {
            const makhfiOverwrites = [
                {
                    id: guild.id,
                    deny: [PermissionFlagsBits.ViewChannel]
                },
                {
                    id: user.id,
                    allow: [
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.SendMessages,
                        PermissionFlagsBits.ReadMessageHistory,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.ManageMessages
                    ]
                },
                {
                    id: CONFIG.adminControlRole,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ];

            const makhfiChannel = await guild.channels.create({
                name: `رول-مخفي-${user.username}`,
                type: 0,
                parent: "1547691348168155297",
                permissionOverwrites: makhfiOverwrites
            });

            await makhfiChannel.send(`ارسل دليلك من صور وبينرسل طلبك للادارة <@&${CONFIG.adminControlRole}> <@${user.id}>`);
            await interaction.reply({ content: `تم انشاء الروم: ${makhfiChannel}`, ephemeral: true });

            setTimeout(async () => {
                try {
                    const channelToCheck = guild.channels.cache.get(makhfiChannel.id);
                    if (channelToCheck) {
                        await channelToCheck.delete();
                    }
                } catch (e) {}
            }, 600000);

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
                if (targetUser) await targetUser.send("تم رفض طلب رومك وانرفض الروم");
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

                const roomOverwrites = [
                    {
                        id: guild.id,
                        deny: [PermissionFlagsBits.ViewChannel]
                    },
                    {
                        id: CONFIG.adminControlRole,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    },
                    {
                        id: targetUserId,
                        allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                ];

                const newSecretRoom = await guild.channels.create({
                    name: roomName,
                    type: 0,
                    parent: chosenCategory,
                    permissionOverwrites: roomOverwrites
                });

                if (filesToSend.length > 0) {
                    await newSecretRoom.send({
                        files: filesToSend
                    });
                }

                if (targetUser) {
                    await targetUser.send("تم قبول طلب رومك وإنشاء الروم").catch(() => {});
                    const stats = checkAndResetDaily(targetUserId);
                    stats.total += 1;
                    stats.daily += 1;
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
        const action = parts.length > 0 ? parts[0] : '';
        const targetUserId = parts.length > 2 ? parts[2] : '';
        const originalChannelId = parts.length > 3 ? parts[3] : '';

        const targetUser = targetUserId ? await interaction.guild.members.fetch(targetUserId).catch(() => null) : null;

        if (action === 'deny') {
            try {
                if (targetUser) {
                    await targetUser.send("تم رفض طلبك لحذف الروم");
                }
            } catch(e) {}
            await interaction.update({ content: "تم رفض طلب حذف الروم.", components: [] });
            try { if (originalChannelId) await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
            return;
        }

        if (action === 'append' || action === 'approve') {
            const requestMsg = interaction.message;
            const mentionedChannel = requestMsg.mentions.channels.first();

            if (mentionedChannel) {
                try {
                    await mentionedChannel.delete();
                } catch (e) {}
            }

            if (targetUser) {
                await targetUser.send("تم قبول طلبك لحذف الروم وتم الحذف").catch(() => {} );
                const stats = checkAndResetDaily(targetUserId);
                stats.total += 1;
                stats.daily += 1;
            }

            await interaction.update({ content: `تمت الموافقة وحذف الروم بنجاح.`, components: [] });
            try { if (originalChannelId) await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
        }
        return;
    }

    if (interaction.customId.startsWith('approve_makhfi_') || interaction.customId.startsWith('deny_makhfi_')) {
        const parts = interaction.customId.split('_');
        const action = parts[0];
        const targetUserId = parts[2];
        const originalChannelId = parts.length > 3 ? parts[3] : '';

        const targetUser = await interaction.guild.members.fetch(targetUserId).catch(() => null);

        if (action === 'deny') {
            try {
                if (targetUser) {
                    await targetUser.send("تم رفض طلبك للرول البرايفت");
                }
            } catch(e) {}
            await interaction.update({ content: "تم رفض الطلب.", components: [] });
            try { if (originalChannelId) await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
            return;
        }

        if (action === 'approve') {
            const roleId = "1547161341045776484";
            const role = interaction.guild.roles.cache.get(roleId);

            if (targetUser && role) {
                try {
                    await targetUser.roles.add(role);
                    await targetUser.send("تم قبول طلبك وجاك رول البرايفت").catch(() => {});
                    const stats = checkAndResetDaily(targetUserId);
                    stats.total += 1;
                    stats.daily += 1;
                } catch (err) {
                    console.error(err);
                }
            }

            await interaction.update({ content: "تمت الموافقة وإعطاء الروم بنجاح.", components: [] });
            try { if (originalChannelId) await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
        }
        return;
    }
});

client.login(process.env.TOKEN);
