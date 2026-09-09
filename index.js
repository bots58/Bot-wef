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

const { createCanvas, loadImage } = require('canvas');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

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

    secretRoomSetupChannel: "1545856705110220883",
    secretRoomVoiceLog: "1545857287934054480",
    secretRoomRequestsChannel: "1545859261526048890",

    deleteRoomSetupChannel: "1547232353095778355",
    deleteRoomVoiceLog: "1547232423522082816",
    deleteRoomRequestsChannel: "1547233488418246796",

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

async function addWatermarkToImage(inputBuffer) {
    try {
        const image = await loadImage(inputBuffer);
        const canvas = createCanvas(image.width, image.height);
        const ctx = canvas.getContext('2d');
        
        ctx.drawImage(image, 0, 0, image.width, image.height);
        
        ctx.font = `bold ${Math.floor(image.width / 12)}px sans-serif`;
        ctx.fillStyle = 'rgba(255, 255, 255, 0.35)';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';

        const positions = [
            { x: image.width * 0.5, y: image.height * 0.3 },
            { x: image.width * 0.5, y: image.height * 0.55 },
            { x: image.width * 0.5, y: image.height * 0.8 },
            { x: image.width * 0.5, y: image.height * 0.9 }
        ];

        for (const pos of positions) {
            ctx.save();
            ctx.translate(pos.x, pos.y);
            ctx.fillText("Fire Files", 0, 0);
            ctx.restore();
        }

        return canvas.toBuffer('image/png');
    } catch (e) {
        return inputBuffer;
    }
}

async function addWatermarkToVideo(inputPath, outputPath) {
    return new Promise((resolve, reject) => {
        const drawTextFilter = 
            "drawtext=text='Fire Files':fontcolor=white@0.35:fontsize=h/12:x=(w-text_w)/2:y=h*0.3," +
            "drawtext=text='Fire Files':fontcolor=white@0.35:fontsize=h/12:x=(w-text_w)/2:y=h*0.55," +
            "drawtext=text='Fire Files':fontcolor=white@0.35:fontsize=h/12:x=(w-text_w)/2:y=h*0.8," +
            "drawtext=text='Fire Files':fontcolor=white@0.35:fontsize=h/12:x=(w-text_w)/2:y=h*0.9";

        ffmpeg(inputPath)
            .outputOptions('-vf', drawTextFilter)
            .save(outputPath)
            .on('end', () => resolve(outputPath))
            .on('error', (err) => reject(err));
    });
}

client.once('ready', async () => {
    console.log(`Logged in as ${client.user.tag}!`);
    
    try {
        const secretChannel = client.channels.cache.get(CONFIG.secretRoomSetupChannel);
        if (secretChannel) {
            const messages = await secretChannel.messages.fetch({ limit: 5 });
            if (!messages.some(m => m.author.id === client.user.id)) {
                const embed = new EmbedBuilder().setDescription("انشاء رومك على من تكره بسرية تامه").setColor(0x2f3136);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('open_wef_voice').setLabel('انشاء روم').setStyle(ButtonStyle.Secondary)
                );
                await secretChannel.send({ embeds: [embed], components: [row] });
            }
        }

        const deleteChannel = client.channels.cache.get(CONFIG.deleteRoomSetupChannel);
        if (deleteChannel) {
            const messages = await deleteChannel.messages.fetch({ limit: 5 });
            if (!messages.some(m => m.author.id === client.user.id)) {
                const embed = new EmbedBuilder().setDescription("إذا تبي تحذف روم شخص تعزه فك روم سري من تحت").setColor(0x2f3136);
                const row = new ActionRowBuilder().addComponents(
                    new ButtonBuilder().setCustomId('open_delete_voice').setLabel('حذف روم').setStyle(ButtonStyle.Secondary)
                );
                await deleteChannel.send({ embeds: [embed], components: [row] });
            }
        }
    } catch (e) {
        console.error("Auto setup error:", e);
    }
});

client.on('guildMemberAdd', async (member) => {
    try {
        if (CONFIG.unverifiedRole) {
            await member.roles.add(CONFIG.unverifiedRole);
        }
    } catch (err) {}
});

client.on('messageCreate', async (message) => {
    if (message.author.bot) return;

    const hasAdminRole = message.member.permissions.has(PermissionFlagsBits.Administrator) || message.member.roles.cache.has(CONFIG.adminControlRole);
    const hasSupportRole = message.member.roles.cache.has(CONFIG.supportRole) || hasAdminRole;

    if (message.channel.name.startsWith("wef-")) {
        const userContent = message.content.trim();
        const filesToSend = [];

        for (const [id, attachment] of message.attachments) {
            try {
                const response = await fetch(attachment.url);
                const buffer = Buffer.from(await response.arrayBuffer());
                filesToSend.push(new AttachmentBuilder(buffer, { name: attachment.name || 'file.png' }));
            } catch (err) {}
        }

        await message.reply({ content: "تم ارسال طلبك للادارة واذا تم الموافقة عليها بيتم انشاء الروم" });

        const requestChannel = message.guild.channels.cache.get(CONFIG.secretRoomRequestsChannel);
        if (requestChannel) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`approve_wef_${message.author.id}_${message.channel.id}`).setLabel('✅').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`deny_wef_${message.author.id}_${message.channel.id}`).setLabel('❌').setStyle(ButtonStyle.Secondary)
            );

            await requestChannel.send({
                content: `${userContent}\nبواسطة صاحب الروم: ${message.author}`,
                files: filesToSend,
                components: [row]
            });
        }

        const tempChannel = message.channel;
        setTimeout(async () => {
            try { await tempChannel.delete(); } catch (e) {}
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
                filesToSend.push(new AttachmentBuilder(buffer, { name: attachment.name || 'file.png' }));
            } catch (err) {}
        }

        const requestChannel = message.guild.channels.cache.get(CONFIG.deleteRoomRequestsChannel);
        if (requestChannel) {
            const row = new ActionRowBuilder().addComponents(
                new ButtonBuilder().setCustomId(`approve_del_${message.author.id}_${message.channel.id}`).setLabel('✅').setStyle(ButtonStyle.Secondary),
                new ButtonBuilder().setCustomId(`deny_del_${message.author.id}_${message.channel.id}`).setLabel('❌').setStyle(ButtonStyle.Secondary)
            );

            await requestChannel.send({
                content: `${userContent}\nمقدم الطلب: ${message.author}`,
                files: filesToSend,
                components: [row]
            });
        }

        try { await message.reply("تم إرسال طلبك للإدارة للمراجعة."); } catch (e) {}
        
        // حذف روم الشخص المؤقت بعد 90 ثانية من إرسال الطلب
        const tempDelChannel = message.channel;
        setTimeout(async () => {
            try { await tempDelChannel.delete(); } catch (e) {}
        }, 90000);

        return;
    }

    const cleanMsg = message.content.trim();
    if (cleanMsg === "ver" && hasAdminRole) {
        if (message.channel.id !== CONFIG.verificationRoom) return;
        const embed = new EmbedBuilder().setDescription("للتنوية حنا سيرفر فضايح ولا نمس للابتزاز باي صلة").setColor(0x2f3136);
        const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('verify_btn').setLabel('تفعيل').setStyle(ButtonStyle.Secondary));
        await message.channel.send({ embeds: [embed], components: [row] });
        try { await message.delete(); } catch(e) {}
        return;
    }

    if (cleanMsg === "!setup_ticket" && hasAdminRole) {
        const channel = message.guild.channels.cache.get(CONFIG.ticketSetupRoom);
        if (channel) {
            const embed = new EmbedBuilder().setDescription("إذا واجهتك اي مشكله او تبي البرايفت فك تكت من الزر الي تحت").setColor(0x2f3136);
            const row = new ActionRowBuilder().addComponents(new ButtonBuilder().setCustomId('create_ticket_btn').setLabel('فك تكت').setStyle(ButtonStyle.Secondary));
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
        try { await message.delete(); } catch(e) {}
        if (textToSend) await message.channel.send({ content: textToSend });
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
                    { id: guild.id, Deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, Allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: CONFIG.supportRole, Allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
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
                    { id: guild.id, Deny: [PermissionFlagsBits.ViewChannel] },
                    { id: user.id, Allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] },
                    { id: CONFIG.supportRole, Allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages, PermissionFlagsBits.ReadMessageHistory] }
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
            try { if (targetUser) await targetUser.send("تم رفض طلبك لانشاء روم"); } catch(e) {}
            await interaction.update({ content: "تم رفض طلب إنشاء الروم.", components: [] });
            try { await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
            return;
        }

        if (action === 'approve') {
            const guild = interaction.guild;
            const requestMsg = interaction.message;
            const contentBody = requestMsg.content.split('\nبواسطة')[0];

            const processedFiles = [];
            for (const att of requestMsg.attachments.values()) {
                try {
                    const response = await fetch(att.url);
                    const buffer = Buffer.from(await response.arrayBuffer());
                    const fileName = att.name || 'media.png';
                    const isVideo = fileName.endsWith('.mp4') || fileName.endsWith('.mov') || fileName.endsWith('.webm') || att.contentType?.startsWith('video');

                    if (isVideo) {
                        const inputPath = path.join('/tmp', `input_${Date.now()}_${fileName}`);
                        const outputPath = path.join('/tmp', `output_${Date.now()}_${fileName}`);
                        fs.writeFileSync(inputPath, buffer);

                        await addWatermarkToVideo(inputPath, outputPath);
                        const watermarkedBuffer = fs.readFileSync(outputPath);
                        processedFiles.push(new AttachmentBuilder(watermarkedBuffer, { name: fileName }));

                        try { fs.unlinkSync(inputPath); fs.unlinkSync(outputPath); } catch(e) {}
                    } else {
                        const watermarkedBuffer = await addWatermarkToImage(buffer);
                        processedFiles.push(new AttachmentBuilder(watermarkedBuffer, { name: fileName }));
                    }
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
                        { id: guild.id, Deny: [PermissionFlagsBits.ViewChannel] },
                        { id: CONFIG.adminControlRole, Allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
                        { id: targetUserId, Allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
                    ]
                });

                await newSecretRoom.send("This room is for those over 18 years old");
                if (contentBody || processedFiles.length > 0) {
                    await newSecretRoom.send({
                        content: contentBody || undefined,
                        files: processedFiles
                    });
                }

                await interaction.update({ content: `تم الموافقة وإنشاء الروم بنجاح: ${newSecretRoom}`, components: [] });
                try { await guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
            } catch (err) {
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
            try { if (targetUser) await targetUser.send("تم رفض طلبك لحذف الروم"); } catch(e) {}
            await interaction.update({ content: "تم رفض طلب حذف الروم.", components: [] });
            try { await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
            return;
        }

        if (action === 'approve') {
            const requestMsg = interaction.message;
            const mentionedChannel = requestMsg.mentions.channels.first();
            if (mentionedChannel) {
                try { await mentionedChannel.delete(); } catch (e) {}
            }
            await interaction.update({ content: "تمت الموافقة وحذف الروم بنجاح.", components: [] });
            try { await interaction.guild.channels.cache.get(originalChannelId)?.delete(); } catch(e) {}
        }
        return;
    }
});

client.login(process.env.TOKEN);
