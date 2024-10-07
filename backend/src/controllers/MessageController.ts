/* eslint-disable no-await-in-loop */
/* eslint-disable no-restricted-syntax */
import { Request, Response } from "express";
import AppError from "../errors/AppError";
import DeleteMessageSystem from "../helpers/DeleteMessageSystem";
// import GetTicketWbot from "../helpers/GetTicketWbot";

import SetTicketMessagesAsRead from "../helpers/SetTicketMessagesAsRead";
import Message from "../models/Message";
import CreateForwardMessageService from "../services/MessageServices/CreateForwardMessageService";
// import CreateMessageOffilineService from "../services/MessageServices/CreateMessageOfflineService";
import CreateMessageSystemService from "../services/MessageServices/CreateMessageSystemService";

import ListMessagesService from "../services/MessageServices/ListMessagesService";
import ShowTicketService from "../services/TicketServices/ShowTicketService";
import DeleteWhatsAppMessage from "../services/WbotServices/DeleteWhatsAppMessage";
import { logger } from "../utils/logger";
// import SendWhatsAppMedia from "../services/WbotServices/SendWhatsAppMedia";
// import SendWhatsAppMessage from "../services/WbotServices/SendWhatsAppMessage";
import EditWhatsAppMessage from "../services/WbotServices/EditWhatsAppMessage";

type IndexQuery = {
  pageNumber: string;
};

type MessageData = {
  body: string;
  fromMe: boolean;
  read: boolean;
  sendType?: string;
  scheduleDate?: string | Date;
  quotedMsg?: Message;
  idFront?: string;
};

export const index = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { pageNumber } = req.query as IndexQuery;
  const { tenantId } = req.user;

  const { count, messages, messagesOffLine, ticket, hasMore } =
    await ListMessagesService({
      pageNumber,
      ticketId,
      tenantId
    });

  try {
    SetTicketMessagesAsRead(ticket);
  } catch (error) {
    console.log("SetTicketMessagesAsRead", error);
  }

  return res.json({ count, messages, messagesOffLine, ticket, hasMore });
};

export const store = async (req: Request, res: Response): Promise<Response> => {
  const { ticketId } = req.params;
  const { tenantId, id: userId } = req.user;
  const messageData: MessageData = req.body;
  const medias = req.files as Express.Multer.File[];
  const ticket = await ShowTicketService({ id: ticketId, tenantId });

  try {
    SetTicketMessagesAsRead(ticket);
  } catch (error) {
    console.log("SetTicketMessagesAsRead", error);
  }

  await CreateMessageSystemService({
    msg: messageData,
    tenantId,
    medias,
    ticket,
    userId,
    scheduleDate: messageData.scheduleDate,
    sendType: messageData.sendType || "chat",
    status: "pending",
    idFront: messageData.idFront
  });

  return res.send();
};

export const remove = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { tenantId } = req.user;
  try {
    await DeleteMessageSystem(req.body.id, messageId, tenantId);
  } catch (error) {
    console.error("ERR_DELETE_SYSTEM_MSG", error.message);
    throw new AppError("ERR_DELETE_SYSTEM_MSG");
  }

  return res.send();
};

export const forward = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const data = req.body;
  const { user } = req;

  for (const message of data.messages) {
    await CreateForwardMessageService({
      userId: user.id,
      tenantId: user.tenantId,
      message,
      contact: data.contact,
      ticketIdOrigin: message.ticketId
    });
  }

  return res.send();
};

export const edit = async (
  req: Request,
  res: Response
): Promise<Response> => {
  const { messageId } = req.params;
  const { tenantId } = req.user;
  const { body }: MessageData = req.body;
  try {
    await EditWhatsAppMessage(req.body.id, messageId, tenantId, body);
  } catch (error) {
    if (error instanceof AppError && error.message === "ERR_EDITING_WAPP_MSG") {
      return res.status(400).json({ error: error.message });
    }
    throw error;
  }

  return res.send();
};
