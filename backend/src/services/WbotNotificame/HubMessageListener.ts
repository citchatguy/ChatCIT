import Whatsapp from "../../models/Whatsapp";

import socketEmit from "../../helpers/socketEmit";
import { downloadFiles } from "../../helpers/DownloadFiles";

import { logger } from "../../utils/logger";

import CreateMessageService from "./CreateMessageService";
import FindOrCreateContactService from "./FindOrCreateContactService";
import { UpdateMessageAck } from "./UpdateMessageAck";
import FindOrCreateTicketService from "../TicketServices/FindOrCreateTicketService";

export interface HubInMessage {
  type: "MESSAGE";
  id: string;
  timestamp: string;
  subscriptionId: string;
  channel: "telegram" | "whatsapp" | "facebook" | "instagram" | "sms" | "email";
  direction: "IN";
  message: {
    id: string;
    from: string;
    to: string;
    direction: "IN";
    channel:
      | "telegram"
      | "whatsapp"
      | "facebook"
      | "instagram"
      | "sms"
      | "email";
    visitor: {
      name: string;
      firstName: string;
      lastName: string;
      picture: string;
    };
    contents: IContent[];
    timestamp: string;
  };
}

export interface IContent {
  type: "text" | "image" | "audio" | "video" | "file" | "location";
  text?: string;
  url?: string;
  fileUrl?: string;
  latitude?: number;
  longitude?: number;
  filename?: string;
  fileSize?: number;
  fileMimeType?: string;
}

export interface HubConfirmationSentMessage {
  type: "MESSAGE_STATUS";
  timestamp: string;
  subscriptionId: string;
  channel: "telegram" | "whatsapp" | "facebook" | "instagram" | "sms" | "email";
  messageId: string;
  contentIndex: number;
  messageStatus: {
    timestamp: string;
    code: "SENT" | "REJECTED";
    description: string;
  };
}

const verifySentMessageStatus = (message: HubConfirmationSentMessage) => {
  const {
    messageStatus: { code }
  } = message;

  const isMessageSent = code === "SENT";

  if (isMessageSent) {
    return true;
  }

  return false;
};

const HubMessageListener = async (
  message: any | HubInMessage | HubConfirmationSentMessage,
  whatsapp: Whatsapp,
  medias: Express.Multer.File[]
) => {
  logger.info("HubMessageListener " + JSON.stringify(message));


  if(message.direction === 'IN'){
    message.fromMe = false
  }

  // const ignoreEvent =
  //   message?.message.visitor?.name === "" || !message?.message.visitor?.name;
  const ignoreEvent = message.direction === 'OUT'
  if (ignoreEvent) {
    return;
  }

  const isMessageFromMe = message.type === "MESSAGE_STATUS";

  logger.info("HubMessageListener MESSAGE_STATUS " + isMessageFromMe)

  if (isMessageFromMe) {
    const isMessageSent = verifySentMessageStatus(
      message as HubConfirmationSentMessage
    );

    if (isMessageSent) {
      logger.info("HubMessageListener: message sent ");
      UpdateMessageAck(message.messageId);
    } else {
      logger.info("HubMessageListener: message not sent " + message.messageStatus.code + " - " + message.messageStatus.description);
    }

    return;
  }

  const {
    message: { id, from, channel, contents, visitor }
  } = message as HubInMessage;

  try {
    const contact = await FindOrCreateContactService({
      ...visitor,
      from,
      whatsapp,
      channel
    });

    const unreadMessages = 1

    message.body = contents[0].text

    const ticket = await FindOrCreateTicketService({
      contact,
      whatsappId: whatsapp.id!,
      unreadMessages,
      tenantId: whatsapp.tenantId,
      groupContact: undefined,
      msg: message,
      channel: 'hub_' + channel
    });

    if (contents[0]?.type === "text") {
      await CreateMessageService({
        id,
        contactId: contact.id,
        body: contents[0].text || '',
        ticketId: ticket.id,
        fromMe: false,
        tenantId: whatsapp.tenantId
      });
      await ticket.update({lastMessage: contents[0].text})
      socketEmit({
        tenantId: whatsapp.tenantId,
        type: "ticket:update",
        payload: ticket
      });
    } else if (contents[0]?.fileUrl) {
      const media = await downloadFiles(contents[0].fileUrl);

      if (typeof media.mimeType === "string") {
        await CreateMessageService({
          id,
          contactId: contact.id,
          body: contents[0].text || '',
          ticketId: ticket.id,
          fromMe: false,
          tenantId: whatsapp.tenantId,
          fileName: `${media.filename}`,
          mediaType: media.mimeType.split("/")[0],
          originalName: media.originalname
        });
        await ticket.update({lastMessage: media.filename || ''})
        socketEmit({
          tenantId: whatsapp.tenantId,
          type: "ticket:update",
          payload: ticket
        });
      } else {
        // Lidar com o caso em que mimeType é false, se necessário
        logger.warn("Unable to determine the media type")
      }
    }

    if (ticket?.isFarewellMessage) {
      return;
    }

  } catch (error: any) {
    logger.warn("e4 " + error)
  }

};

export default HubMessageListener;