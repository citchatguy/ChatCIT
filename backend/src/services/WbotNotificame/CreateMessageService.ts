import Message from "../../models/Message";
import { logger } from "../../utils/logger";
import socketEmit from "../../helpers/socketEmit";
import { v4 as uuidv4 } from 'uuid';
import Ticket from "../../models/Ticket";

interface MessageData {
  id: string;
  contactId: number;
  body: string;
  ticketId: number;
  fromMe: boolean;
  tenantId: number;
  fileName?: string;
  mediaType?: string;
  originalName?: string;
  scheduleDate?: string | Date;
  ack?: any;
}

const CreateMessageService = async (
  messageData: MessageData
): Promise<Message | undefined> => {
  logger.info("creating message ");
  // logger.info("messageData " + JSON.stringify(messageData));

  const message = await Message.findOne({
    where: {
      messageId: messageData.id,
      tenantId: messageData.tenantId
    }
  });

  if(message){
    logger.info("creating message exists");
    return
  }

  const {
    id,
    contactId,
    body,
    ticketId,
    fromMe,
    tenantId,
    fileName,
    mediaType,
    originalName,
    scheduleDate,
    ack
  } = messageData;

  if ((!body || body === "") && (!fileName || fileName === "")) {
    return;
  }

  const idHub = uuidv4();

  const data: any = {
    contactId,
    body,
    ticketId,
    fromMe,
    tenantId,
    messageId: id,
    ack: 1,
    status: "sended",
    idFront: idHub,
    read: false,
    scheduleDate
  };

  if (fileName) {
    data.mediaUrl = fileName;
    data.mediaType = mediaType === "photo" ? "image" : mediaType;
    data.body = data.mediaUrl;
  }

  // logger.info("creating message data" + JSON.stringify(data));

  try {
    const newMessage = await Message.create(data);

    const messageCreated = await Message.findByPk(newMessage.id, {
      include: [
        {
          model: Ticket,
          as: "ticket",
          where: { tenantId },
          include: ["contact"]
        },
        {
          model: Message,
          as: "quotedMsg",
          include: ["contact"]
        }
      ]
    });

    if (!messageCreated) {
      throw new Error("ERR_CREATING_MESSAGE_SYSTEM 2");
    }

    socketEmit({
      tenantId,
      type: "chat:create",
      payload: messageCreated
    });

    return newMessage;
  } catch (error) {
    logger.warn("e8" + error);
  }
};

export default CreateMessageService;