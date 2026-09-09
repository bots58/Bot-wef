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

// الأيدي المطلوبة بدقة متناهية
const CONFIG = {
    verificationRoom: "1545846837192429578",
    verifiedRole: "1545848708921425920", // رول التفعيل الجديد
    unverifiedRole: "1545848907156820100", // رول غير مفعل
    
    ticketSetupRoom: "1545847197768360000",
    ticketCategory1: "1545852986188628108", 
    ticketCategory2: "1545853004673196172", 
    
    supportRole: "1547161341045776484", // رول السبورت المحدد الجديد
    adminControlRole: "1545853891101466746", // رول الإدارة
    
    roleRequestRoom: "1546928048174014566", // روم طلبات الرولات
    supportLogRoom: "1546933674673447042" // روم تنبيه السبورت ودليلهم
};

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
});

// منح رول غير مفعل تلقائياً لأي عضو جديد يدخل السيرفر
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

    // التحقق من صلاحيات الإدارة والسبورت
    const hasAdminRole = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.has(CONFIG.adminControlRole);
    const hasSupportRole = message.member.roles.cache.has(CONFIG.supportRole) || hasAdminRole;

    // 1. أمر إرسال رسالة التفعيل حصراً في الروم المخصص: 1545846837192429578
    if (message.content.trim() === "!setup_verify" && hasAdminRole) {
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

    // 2. أمر إرسال زر التكت
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

    // 3. أمر "إخفاء" لمنع رول غير مفعل (1545848907156820100) من رؤية الروم
    if (message.content.trim() === "إخفاء" && hasSupportRole) {
        try { await message.delete(); } catch(e) {}
        await message.channel.permissionOverwrites.edit(CONFIG.unverifiedRole, { ViewChannel: false });
        await message.channel.send("تم إخفاء هذا الروم عن رول غير مفعل.");
        return;
    }

    // أوامر الإدارة العامة
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

    // 4. أمر send لإرسال الصور والنصوص بشكل طبيعي
    if (message.content.startsWith("send") && hasSupportRole) {
        const textToSend = message.content.slice(4).trim();
        const filesToSend = Array.from(message.attachments.values());

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
        const filesToSend = Array.from(message.attachments.values());
        
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

    // 5. نظام طلبات الرولات مع التحقق من وجود الرول وإرسال رياكشن خطأ أو صح
    if (message.content.startsWith("رول") && hasSupportRole) {
        const targetMember = message.mentions.members.first();
        if (!targetMember) return;

        const roleQuery = message.content.replace("رول", "").replace(/<@!?\d+>/g, "").trim();
        if (!roleQuery) {
            await message.react('❌');
            return;
        }

        const foundRole = message.guild.roles.cache.find(r => r.name.toLowerCase().includes(roleQuery.toLowerCase()) || r.id === roleQuery.replace(/[<@&>]/g, ""));
        
        // إذا لم يتم العثور على الرول، يضع البوت رياكشن خطأ ولا يرسل شيئاً
        if (!foundRole) {
            await message.react('❌');
            return;
        }

        // إذا وُجد الرول، يضع رياكشن صح ويسوي الطلب
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
            const filesToSend = Array.from(message.attachments.values());
            
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

    // 6. إغلاق التكتات للسبورت حصراً
    if (message.channel.name.startsWith("ticket-")) {
        if (message.content.trim() === "إغلاق" && hasSupportRole) {
            try {
                await message.channel.delete();
            } catch (err) {
                console.error("Error deleting ticket channel:", err);
            }
            return;
        }
    }
});

// التعامل مع الأزرار
client.on('interactionCreate', async (interaction) => {
    if (!interaction.isButton()) return;

    // زر التفعيل: سحب رول غير مفعل وإعطاء رول التفعيل الجديد
    if (interaction.customId === 'verify_btn') {
        const member = interaction.member;
        try {
            if (CONFIG.unverifiedRole) await member.roles.remove(CONFIG.unverifiedRole);
            if (CONFIG.verifiedRole) await member.roles.add(CONFIG.verifiedRole);
            
            await interaction.channel.permissionOverwrites.edit(member.id, { ViewChannel: false });
            await interaction.reply({ content: "تم تفعيلك بنجاح!", ephemeral: true });
        } catch (err) {
            await interaction.reply({ content: "حدث خطأ أثناء منح الرول.", ephemeral: true });
        }
        return;
    }

    // زر التكت
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
                await interaction.update({ content: `تم إعطاء الرول للعضو بنجاح (${member}).`, components: [] });
            } catch (err) {
                await interaction.reply({ content: "حدث خطأ أثناء منح الرول للمستخدم.", ephemeral: true });
            }
        } else if (!isApprove) {
            await interaction.update({ content: "لم يتم إعطاء الرول.", components: [] });
        } else {
            await interaction.reply({ content: "لم يتم العثور على العضو.", ephemeral: true });
        }
        return;
    }
});

client.login(process.env.TOKEN);
