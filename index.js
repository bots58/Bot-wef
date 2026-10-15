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
    verifiedRole: "1558819214595194950",   // رول مفعل
    unverifiedRole: "1558819050908418058", // رول غير مفعل عند الدخول
    
    ticketSetupRoom: "1545847197768360000",
    ticketCategory1: "1558830581473738772", 
    ticketCategory2: "1545853004673196172", 
    
    supportRole: "1558819326952345600", 
    adminControlRole: "1558819326952345600", // رول التحكم/الأونرية المحدد
    ticketSupportPingRole: "1558832820732821607", 
    
    privateRole: "1547232423522082816", 
    makhfiRole: "1558819288133926972",  // رول البرايفت عند الموافقة

    roleRequestRoom: "1558833018670424104", 
    supportLogRoom: "1558833303421849630", 

    secretRoomVoiceLog: "1558828949658931290",       // كاتجوري إنشاء روم
    secretApprovalChannel: "1558829128445337743",    // قبول/رفض إنشاء روم

    deleteRoomVoiceLog: "1558829425351729212",       // كاتجوري حذف روم
    deleteRoomRequestsChannel: "1558829580205166632", // قبول/رفض حذف روم

    makhfiCategory: "1558827346172190810",           // كاتجوري طلب البرايفت
    makhfiApprovalChannel: "1558828242389962875",     // قبول/رفض طلب البرايفت

    topChannelId: "1547705159830863912",
    linkRoomTarget: "1558834241549242469"
};

function getValidParent(guild, parentId) {
    if (!parentId) return null;
    const channel = guild.channels.cache.get(parentId);
    return (channel && channel.type === 4) ? parentId : null;
}

const summonCooldowns = new Map();
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
    const hasAdminRole = message.member.roles.cache.has(CONFIG.adminControlRole) || message.member.permissions.has(PermissionFlagsBits.Administrator) || isOwner;
    const hasSupportRole = message.member.roles.cache.has(CONFIG.supportRole) || hasAdminRole;
    const hasTicketSupportRole = message.member.roles.cache.has(CONFIG.ticketSupportPingRole) || hasAdminRole;

    // حماية الروابط العامة
    const linkRegex = /(https?:\/\/[^\s]+|discord\.gg\/[^\s]+|discord\.com\/invite\/[^\s]+)/i;
    if (linkRegex.test(message.content)) {
        if (!hasAdminRole) {
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

    // روم الروابط المحدد
    if (message.channel.id === CONFIG.linkRoomTarget) {
        try { await message.delete(); } catch(e) {}

        try {
            await message.author.send(`**ارسل الرابط لعشرة واستلم البرايفت وقحبتك**\nhttps://discord.gg/6KDs2d7By`);
        } catch (err) {}

        const publicNotice = await message.channel.send({ content: `تم ارسال الرابط لك بالخاص` });
        setTimeout(async () => {
            try { await publicNotice.delete(); } catch(e) {}
        }, 3000);
        return;
    }

    // أمر اغلاق الرومات
    const msgContentTrimmed = message.content.trim();
    if (msgContentTrimmed === "اغلاق" || msgContentTrimmed === "إغلاق") {
        if (hasSupportRole) {
            try { await message.delete(); } catch(e) {}
            setTimeout(async () => {
                try {
                    await message.channel.delete();
                } catch(e) {}
            }, 500);
            return;
        }
    }

    // تعديل وتطبيق أمر النشر (حصري لرول الأدمن)
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

    // أمر البرودكاست bc (حصري لرول الأدمن)
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

    // أمر رسالة (المطلوب مع الإمبيد الداكن) - (حصري لرول الأدمن)
    if ((message.content.startsWith("رسالة") || message.content.startsWith("رساله"))) {
        if (!hasAdminRole) {
            try { await message.delete(); } catch(e) {}
            const errNotice = await message.channel.send({ content: `${message.author} هذا الأمر مخصص فقط لمن يملك رول التحكم.` });
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

    // أوامر قفل وفتح ومسح (حصري لرول الأدمن)
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

    // نظام طلب رول (مخصص للسبورت)
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
            await message.guild.roles.fetch();
            const allRoles = message.guild.roles.cache;
            let foundRole = null;
            const search = roleSearchText.toLowerCase();

            for (const role of allRoles.values()) {
                if (role.id === message.guild.id) continue;
                const roleName = role.name.trim().toLowerCase();
                if (roleName === search || roleName.includes(search) || roleName.startsWith(search)) {
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
                        .setDescription(`العضو: ${targetMember}\nبواسطة السبورت: ${message.author}\nالرول المطلوب: ${foundRole.name}`)
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
                }
                return;
            }
        }
    }

    // إعدادات اللوحات (حصري لرول الأدمن)
    if (message.content.trim() === "!setup_secret" && hasAdminRole) {
        try { await message.delete(); } catch(e) {}
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
        return;
    }

    if (message.content.trim() === "!setup_delete" && hasAdminRole) {
        try { await message.delete(); } catch(e) {}
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
        return;
    }

    if (message.content.trim() === "ستيب مخفي" && hasAdminRole) {
        try { await message.delete(); } catch(e) {}
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
        return;
    }

    // طلبات إنشاء الروم
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

            let msgPayload = { components: [row] };
            let fullText = userContent ? `${userContent}\nبواسطة صاحب الروم: ${message.author}` : `بواسطة صاحب الروم: ${message.author}`;
            msgPayload.content = fullText;

            if (filesToSend.length > 0) {
                msgPayload.files = filesToSend;
            }

            await requestChannel.send(msgPayload);
        }

        await message.reply({ content: `تم إرسال طلبك للإدارة، وإذا تمت الموافقة عليه بينشأ الروم.` });
        setTimeout(async () => {
            try {
                await message.channel.delete();
            } catch(e) {}
        }, 3000);

        return;
    }

    // طلبات حذف الروم
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

            let msgPayload = { components: [row] };
            let fullText = userContent ? `${userContent}\nمقدم الطلب: ${message.author}` : `مقدم الطلب: ${message.author}`;
            msgPayload.content = fullText;

            if (filesToSend.length > 0) {
                msgPayload.files = filesToSend;
            }

            await requestChannel.send(msgPayload);
        }

        await message.reply({ content: `تم إرسال طلبك للإدارة، وإذا تمت الموافقة عليه بينحذف.` });
        setTimeout(async () => {
            try {
                await message.channel.delete();
            } catch(e) {}
        }, 3000);

        return;
    }

    // طلبات البرايفت
    if (message.channel.name.startsWith("برايفت-")) {
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

            let msgPayload = { components: [row] };
            let fullText = userContent ? `${userContent}\nطلب برايفت من العضو: ${message.author}` : `طلب برايفت من العضو: ${message.author}`;
            msgPayload.content = fullText;

            if (filesToSend.length > 0) {
                msgPayload.files = filesToSend;
            }

            await requestChannel.send(msgPayload);
        }

        await message.reply({ content: `تم إرسال طلبك للإدارة، انتظر الموافقة ${message.author}` });
        setTimeout(async () => {
            try {
                await message.channel.delete();
            } catch (e) {}
        }, 3000);

        return;
    }

    // أمر send
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

    const cleanMsg = message.content.trim();
    if (cleanMsg === "ver" && hasAdminRole) {
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
        const channel = message.channel;
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
        try { await message.delete(); } catch(e) {}
        return;
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    if (interaction.customId === 'create_ticket_btn') {
        const guild = interaction.guild;
        const user = interaction.user;

        await guild.channels.fetch();

        const existingTicket = guild.channels.cache.find(c => {
            const isTicketCategory = c.parentId === CONFIG.ticketCategory1 || c.name.startsWith('ticket-');
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
                    id: CONFIG.ticketSupportPingRole,
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
                parent: getValidParent(guild, CONFIG.ticketCategory1),
                permissionOverwrites: ticketOverwrites
            });

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`ticket_summon_owner_${user.id}`)
                    .setLabel('استدعا')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId(`ticket_summon_member_${user.id}`)
                    .setLabel('استدعا العضو')
                    .setStyle(ButtonStyle.Secondary)
            );

            await ticketChannel.send({
                content: `<@&1558832820732821607> - <@&1558819326952345600>\n\n**حياك الله اكتب مشكلتك قبل لانجي**`,
                components: [row]
            });

            await interaction.reply({ content: `تم إنشاء تذكرتك بنجاح: ${ticketChannel}`, ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "حدث خطأ أثناء إنشاء التكت.", ephemeral: true });
        }
        return;
    }

    if (interaction.customId.startsWith('ticket_summon_owner_')) {
        const userId = interaction.user.id;
        const channelId = interaction.channel.id;
        const now = Date.now();
        const cooldownTime = 3 * 60 * 1000;

        if (summonCooldowns.has(channelId)) {
            const expirationTime = summonCooldowns.get(channelId);
            if (now < expirationTime) {
                const timeLeft = expirationTime - now;
                const minutes = Math.floor(timeLeft / 60000);
                const seconds = Math.floor((timeLeft % 60000) / 1000);
                await interaction.reply({ 
                    content: `انتظر \`${minutes}:${seconds < 10 ? '0' : ''}${seconds}\` دقيقة قبل استخدام الزر مرة أخرى.`, 
                    ephemeral: true 
                });
                return;
            }
        }

        summonCooldowns.set(channelId, now + cooldownTime);

        await interaction.reply({ content: "تم إرسال التنبيه.", ephemeral: true });
        
        const sentMsg = await interaction.channel.send({ content: `<@&1558832820732821607>` });
        setTimeout(async () => {
            try { await sentMsg.delete(); } catch(e) {}
        }, 2000);

        return;
    }

    if (interaction.customId.startsWith('ticket_summon_member_')) {
        const member = interaction.member;

        if (!member.roles.cache.has(CONFIG.supportRole) && !member.roles.cache.has(CONFIG.ticketSupportPingRole) && !member.permissions.has(PermissionFlagsBits.Administrator)) {
            await interaction.reply({ content: "هذا الزر مخصص للسبورت فقط.", ephemeral: true });
            return;
        }

        const targetUserId = interaction.customId.split('_')[3];
        try {
            const targetUser = await interaction.guild.members.fetch(targetUserId);
            if (targetUser) {
                await targetUser.send(`شيك على تذكرتك ${interaction.channel}`);
                await interaction.reply({ content: "✅ تم إرسال تنبيه بالخاص لصاحب التكت بنجاح.", ephemeral: true });
            } else {
                await interaction.reply({ content: "لم يتم العثور على صاحب التكت.", ephemeral: true });
            }
        } catch (err) {
            await interaction.reply({ content: "فشل إرسال رسالة خاصة لصاحب التكت (ربما الخاص مغلق).", ephemeral: true });
        }
        return;
    }

    // انشاء روم ويف
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
                    id: CONFIG.supportRole,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ];

            const wefChannel = await guild.channels.create({
                name: `wef-${user.username}`,
                type: 0,
                parent: getValidParent(guild, CONFIG.secretRoomVoiceLog),
                permissionOverwrites: wefOverwrites
            });

            await wefChannel.send(`ارسل صورك والمقاطع واسم الروم\nوبيجينا طالب في حال وافقنا بينفك الروم`);
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
            console.error("Error creating wef channel:", err);
            await interaction.reply({ content: "حدث خطأ أثناء إنشاء الروم.", ephemeral: true });
        }
        return;
    }

    // فتح روم طلب حذف روم
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
                    id: CONFIG.supportRole,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ];

            const delChannel = await guild.channels.create({
                name: `delete-room-${user.username}`,
                type: 0,
                parent: getValidParent(guild, CONFIG.deleteRoomVoiceLog),
                permissionOverwrites: delOverwrites
            });

            await delChannel.send(`حياك الله اكتب دليلك لحذف الروم - مقاطع او كتابه وبينحذف`);
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
            console.error("Error creating delete channel:", err);
            await interaction.reply({ content: "حدث خطأ أثناء إنشاء الروم.", ephemeral: true });
        }
        return;
    }

    // فتح روم طلب البرايفت
    if (interaction.customId === 'open_makhfi_room') {
        const guild = interaction.guild;
        const user = interaction.user;

        const existingMakhfi = guild.channels.cache.find(c => c.name === `برايفت-${user.username}` && c.type === 0);
        if (existingMakhfi) {
            await interaction.reply({ content: "لديك روم برايفت مفتوح بالفعل.", ephemeral: true });
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
                    id: CONFIG.supportRole,
                    allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory]
                }
            ];

            const makhfiChannel = await guild.channels.create({
                name: `برايفت-${user.username}`,
                type: 0,
                parent: getValidParent(guild, CONFIG.makhfiCategory),
                permissionOverwrites: makhfiOverwrites
            });

            await makhfiChannel.send(`حياك الله اكتب دليلك`);
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
            console.error("Error creating makhfi channel:", err);
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

            let chosenCategory = CONFIG.secretRoomVoiceLog;

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
                    },
                    {
                        id: CONFIG.privateRole,
                        deny: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages]
                    }
                ];

                const newSecretRoom = await guild.channels.create({
                    name: roomName,
                    type: 0,
                    parent: getValidParent(guild, chosenCategory),
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

                setTimeout(async () => {
                    try {
                        const channelToDelete = guild.channels.cache.get(newSecretRoom.id);
                        if (channelToDelete) {
                            await channelToDelete.delete();
                        }
                    } catch (e) {}
                }, 600000);

                await interaction.update({ content: `تم الموافقة وإنشاء الروم بنجاح (سينحذف تلقائياً بعد 10 دقائق): ${newSecretRoom}`, components: [] });
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
                await targetUser.send("تم قبول طلبك لحذف الروم وتم الحذف").catch(() => {});
                const stats = checkAndResetDaily(targetUserId);
                stats.total += 1;
                stats.daily += 1;
            }

            await interaction.update({ content: "تمت الموافقة وحذف الروم بنجاح.", components: [] });
            try { 
                if (originalChannelId) {
                    await interaction.guild.channels.cache.get(originalChannelId)?.delete();
                }
            } catch(e) {}
        }
        return;
    }

    // الموافقة أو الرفض على طلب البرايفت وإعطاء الرول الجديد
    if (interaction.customId.startsWith('approve_makhfi_') || interaction.customId.startsWith('deny_makhfi_')) {
        const parts = interaction.customId.split('_');
        const action = parts[0];
        const targetUserId = parts.length > 2 ? parts[2] : '';
        const originalChannelId = parts.length > 3 ? parts[3] : '';

        const targetUser = targetUserId ? await interaction.guild.members.fetch(targetUserId).catch(() => { return null; }) : null;

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
            const roleId = CONFIG.makhfiRole;
            const role = interaction.guild.roles.cache.get(roleId);

            if (targetUser && role) {
                try {
                    await targetUser.roles.add(role);
                    await targetUser.send("تم قبول طلبك وتم إعطاؤك رول البرايفت بنجاح!").catch(() => {});
                    const stats = checkAndResetDaily(targetUserId);
                    stats.total += 1;
                    stats.daily += 1;
                } catch (err) {
                    console.error(err);
                }
            }

            await interaction.update({ content: "تمت الموافقة وإعطاء رول البرايفت بنجاح.", components: [] });
            try { if (originalChannelId) await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
        }
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
                    await supportMember.send(`تم رفض طلبك لـ/من رول لـ <@${targetUserId}> من قبل الإدارة.`);
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
});

client.login(process.env.TOKEN);
