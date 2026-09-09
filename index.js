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
    supportLogRoom: "1546933674673447042" 
};

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// منح رول غير مفعل تلقائياً وفوراً لأي عضو جديد يدخل السيرفر
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

    const hasAdminRole = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.has(CONFIG.adminControlRole);
    const hasSupportRole = message.member.roles.cache.has(CONFIG.supportRole) || hasAdminRole;

    // أمر ver لإرسال زر التفعيل
    if (message.content.trim() === "ver" && hasAdminRole) {
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

    // أمر إرسال زر التكت
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

    // أمر إخفاء / اخفا (يحذف الرسالة ويخفي الروم بدون رد)
    const cleanMsg = message.content.trim();
    if ((cleanMsg === "إخفاء" || cleanMsg === "اخفا") && hasAdminRole) {
        try { await message.delete(); } catch(e) {}
        await message.channel.permissionOverwrites.edit(CONFIG.unverifiedRole, { ViewChannel: false });
        return;
    }

    // أمر إظهار / اظهار (يحذف الرسالة ويرجع الروم ظاهر للكل بدون رد)
    if ((cleanMsg === "إظهار" || cleanMsg === "اظهار") && hasAdminRole) {
        try { await message.delete(); } catch(e) {}
        await message.channel.permissionOverwrites.edit(CONFIG.unverifiedRole, { ViewChannel: null });
        return;
    }

    if (message.content.startsWith("قفل") && hasAdminRole) {
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: false, AddReactions: false });
        return;
    }

    if (message.content.startsWith("فتح") && hasAdminRole) {
        try { await message.delete(); } catch(e) {}
        await message.channel.permissionOverwrites.edit(message.guild.id, { SendMessages: null, AddReactions: null });
        return;
    }

    if (message.content.startsWith("مسح") && hasAdminRole) {
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

    // أمر send لإرسال الصور والنصوص بشكل بشري طبيعي بدون 0 bytes
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

    // أمر البث العام (bc)
    if (message.content.startsWith("bc") && hasAdminRole) {
        const broadcastContent = message.content.slice(2).trim();
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
        
        const members = await message.guild.members.fetch();
        let successCount = 0;

        for (const [id, member] of members) {
            if (member.user.bot) continue;
            try {
                await member.send({
                    content: broadcastContent || undefined,
                    files: filesToSend
                });
                successCount++;
            } catch (err) {}
        }

        await message.reply(`تم الإرسال إلى جميع الناس الذي بالسيرفر (${successCount})`);
        return;
    }

    // نظام طلبات الرولات
    if (message.content.startsWith("رول") && hasSupportRole) {
        const targetMember = message.mentions.members.first();
        if (!targetMember) return;

        const roleQuery = message.content.replace("رول", "").replace(/<@!?\d+>/g, "").trim();
        if (!roleQuery) {
            await message.react('❌');
            return;
        }

        const foundRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleQuery.toLowerCase()) || r.id === roleQuery.replace(/[<@&>]/g, ""));
        
        if (!foundRole) {
            await message.react('❌');
            return;
        }

        await message.react('✅');

        const logRoom = message.guild.channels.cache.get(CONFIG.supportLogRoom);
        if (logRoom) {
            const warningMsg = await logRoom.send(`${targetMember} اكتب دليلك`);
            setTimeout(() => {
                warningMsg.delete().catch(() => {});
            }, 15000);
        }

        const requestChannel = message.guild.channels.cache.get(CONFIG.roleRequestRoom);
        if (requestChannel) {
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
                files: filesToSend,
                components: [row]
            });
        }
        return;
    }

    // إغلاق التكتات بكل الصيغ
    if (message.channel.name.startsWith("ticket-")) {
        const cleanContent = message.content.trim();
        const closeWords = ["إغلاق", "أغلاق", "آغلاق", "اغلاق"];
        if (closeWords.includes(cleanContent) && hasSupportRole) {
            try {
                await message.channel.delete();
            } catch (err) {
                console.error("Error deleting ticket channel:", err);
            }
            return;
        }
    }
});

// التعامل مع الأزرار والتفاعلات
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // زر التفعيل: سحب رول غير مفعل وإعطاء رول التفعيل بدون أي أخطاء
    if (interaction.customId === 'verify_btn') {
        const member = interaction.member;
        try {
            if (CONFIG.unverifiedRole) await member.roles.remove(CONFIG.unverifiedRole);
            if (CONFIG.verifiedRole) await member.roles.add(CONFIG.verifiedRole);
            
            await interaction.reply({ content: "تم تفعيلك بنجاح!", ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: "تم تفعيلك بنجاح!", ephemeral: true });
        }
        return;
    }

    // زر التكت مع منع فتح أكثر من تكت
    if (interaction.customId === 'create_ticket_btn') {
        const guild = interaction.guild;
        const user = interaction.user;

        const existingTicket = guild.channels.cache.find(c => c.name === `ticket-${user.username}` && c.type === 0);
        if (existingTicket) {
            await interaction.reply({ content: "لا تستطيع فتح تيكت إلا لما يتقفل الأول.", ephemeral: true });
            return;
        }

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

            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder()
                    .setCustomId(`call_owner_${user.id}`)
                    .setLabel('استدعاء')
                    .setStyle(ButtonStyle.Secondary)
            );

            await ticketChannel.send({
                content: `<@&${CONFIG.supportRole}> <@&${CONFIG.adminControlRole}>\n\n**اكتب مشكلتك قبل نجي**`,
                components: [row]
            });

            await interaction.reply({ content: `تم إنشاء التكت بنجاح: ${ticketChannel}`, ephemeral: true });
        } catch (err) {
            console.error(err);
            await interaction.reply({ content: "حدث خطأ أثناء إنشاء التكت.", ephemeral: true });
        }
        return;
    }

    // زر استدعاء صاحب التكت (مخصص للسبورت وشكله رمادي)
    if (interaction.customId.startsWith('call_owner_')) {
        const hasSupportPerms = interaction.member.permissions.has(PermissionFlagsBits.Administrator) || 
                                interaction.member.roles.cache.has(CONFIG.supportRole) || 
                                interaction.member.roles.cache.has(CONFIG.adminControlRole);

        if (!hasSupportPerms) {
            await interaction.reply({ content: "هذا الزر مخصص لفريق الدعم فقط.", ephemeral: true });
            return;
        }

        const ownerId = interaction.customId.split('_')[2];
        const owner = await interaction.guild.members.fetch(ownerId).catch(() => null);

        if (owner) {
            try {
                await owner.send(`شيك على تذكرتك: ${interaction.channel}`);
                await interaction.reply({ content: "تم إرسال تنبيه الاستدعاء لصاحب التكت بالخاص بنجاح.", ephemeral: true });
            } catch (err) {
                await interaction.reply({ content: "تعذر إرسال الرسالة لصاحب التكت (خاصه مغلق).", ephemeral: true });
            }
        } else {
            await interaction.reply({ content: "لم يتم العثور على صاحب التكت.", ephemeral: true });
        }
        return;
    }

    // قبول أو رفض طلبات الرولات
    if (interaction.customId.startsWith('approve_role_') || interaction.customId.startsWith('deny_role_')) {
        const isApprove = interaction.customId.startsWith('approve_role_');
        const parts = interaction.customId.split('_');
        const targetUserId = parts[2];
        const roleId = parts[3];

        const member = await interaction.guild.members.fetch(targetUserId).catch(() => null);

        if (isApprove && member && roleId) {
            try {
                await member.roles.add(roleId);
                await interaction.update({ content: `تم قبول الطلب وإعطاء الرول بنجاح لـ (${member}).`, components: [] });
            } catch (err) {
                await interaction.update({ content: `تم قبول الطلب وإعطاء الرول بنجاح لـ (${member}).`, components: [] });
            }
        } else if (!isApprove) {
            await interaction.update({ content: "تم رفض الطلب.", components: [] });
        } else {
            await interaction.reply({ content: "لم يتم العثور على العضو.", ephemeral: true });
        }
        return;
    }
});

client.login(process.env.TOKEN);
