require("dotenv").config();
import { Client, FileContent } from "notificamehubsdk";
import Contact from "../../models/Contact";
import CreateMessageService from "./CreateMessageService";
import { showHubToken } from "../../helpers/ShowHubToken";
import { logger } from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import { convertMp3ToMp4 } from "../../helpers/ConvertMp3ToMp4";
import Ticket from "../../models/Ticket";
import socketEmit from "../../helpers/socketEmit";
import { v4 as uuidV4 } from "uuid";

export const SendMediaMessageService = async (
  media: Express.Multer.File,
  message: string,
  ticketId: number,
  contact: Contact,
  whatsapp: any
) => {

  let channel
  let mediaUrl

  const ticket = await Ticket.findOne({
    where: { id: ticketId }
  });

  if(!whatsapp.tenantId || !whatsapp.type || !whatsapp.number){
    channel = await Whatsapp.findOne({
      where: { id: whatsapp.id }
    });
    whatsapp = channel
    // whatsapp.type = channel?.type
  }

  const notificameHubToken = await showHubToken(
    whatsapp.tenantId.toString()
  );

  logger.info("Chamou hub send media");

  const client = new Client(notificameHubToken);

  logger.info("ticket?.channel " + ticket?.channel);

  const channelClient = client.setChannel(ticket?.channel.split('hub_')[1]);

  try{
    message = message.replace(/\n/g, " ");
  } catch(e){
    logger.warn("Replacing newlines: " + e.message);
  }

  logger.info("media " + JSON.stringify(media));

  const backendUrl = process.env.BACKEND_URL;

  const filename = encodeURIComponent(media.filename);
  mediaUrl = `${backendUrl}/public/${filename}`;

  if (media.mimetype.includes("image")) {
    if (ticket?.channel.split('hub_')[1] === "telegram") {
      media.mimetype = "photo";
    } else {
      media.mimetype = "image";
    }
  } else if (
    (ticket?.channel.split('hub_')[1] === "telegram" || ticket?.channel.split('hub_')[1] === "facebook") &&
    media.mimetype.includes("audio")
  ) {
    media.mimetype = "audio";
  } else if (
    (ticket?.channel.split('hub_')[1] === "telegram" || ticket?.channel.split('hub_')[1] === "facebook") &&
    media.mimetype.includes("video")
  ) {
    media.mimetype = "video";
  } else if (ticket?.channel.split('hub_')[1] === "telegram" || ticket?.channel.split('hub_')[1] === "facebook") {
    media.mimetype = "file";
  }

  try {

    if (media.originalname.includes('.mp3') && ticket?.channel.split('hub_')[1] === "instagram") {
      const inputPath = media.path;
      const outputMP4Path = `${media.destination}/${media.filename.split('.')[0]}.mp4`;
      try {
        await convertMp3ToMp4(inputPath, outputMP4Path);
        media.filename = outputMP4Path.split('/').pop() ?? 'default.mp4';
        mediaUrl = `${backendUrl}/public/${media.filename}`;
        media.originalname = media.filename
        media.mimetype = 'audio'
      } catch(e){

      }
    }

    if (media.originalname.includes('.mp4') && ticket?.channel.split('hub_')[1] === "instagram") {
      media.mimetype = 'video'
    }

    const content = new FileContent(
      mediaUrl,
      media.mimetype,
      media.filename,
      media.filename
    );

    let contactNumber

    if(ticket?.channel === 'hub_facebook'){
      contactNumber = contact.messengerId
    }
    if(ticket?.channel === 'hub_instagram'){
      contactNumber = contact.instagramPK
    }

    logger.info("whatsapp.number " + whatsapp.number + " contactNumber "  + contactNumber + " content "  + content + " message "  + message);

    let response = await channelClient.sendMessage(
      whatsapp.number,
      contactNumber,
      content
    );

    logger.info("Hub response: " + JSON.stringify(response));

    let data: any;

    try {
      const jsonStart = response.indexOf("{");
      const jsonResponse = response.substring(jsonStart);
      data = JSON.parse(jsonResponse);
    } catch (error) {
      data = response;
    }

    const newMessage = await CreateMessageService({
      id: data?.id || uuidV4(),
      contactId: contact.id,
      body: `${media.filename}`,
      ticketId,
      fromMe: true,
      tenantId: whatsapp.tenantId,
      fileName: `${media.filename}`,
      mediaType: media.mimetype.split("/")[0] || media.mimetype,
      originalName: media.originalname
    });

    if(ticket){
      await ticket.update({lastMessage: media.filename || '', aswered: true})
      socketEmit({
        tenantId: whatsapp.tenantId,
        type: "ticket:update",
        payload: ticket
      });
    }

    return newMessage;
  } catch (error) {
    logger.warn("e6 " + JSON.stringify(error));
  }
};