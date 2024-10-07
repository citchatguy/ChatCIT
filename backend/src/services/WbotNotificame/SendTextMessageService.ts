require("dotenv").config();
import { Client, TextContent } from "notificamehubsdk";
import Contact from "../../models/Contact";
import CreateMessageService from "./CreateMessageService";
import { showHubToken } from "../../helpers/ShowHubToken";
import { logger } from "../../utils/logger";
import Whatsapp from "../../models/Whatsapp";
import Ticket from "../../models/Ticket";
import socketEmit from "../../helpers/socketEmit";
import { pupa } from "../../utils/pupa";
import User from "../../models/User";

export const SendTextMessageService = async (
  message: string,
  ticketId: number,
  contact: Contact,
  whatsapp: any
) => {

  let channel

  const ticket = await Ticket.findOne({
    where: { id: ticketId },
    include: [
      {
        model: Contact
      },
      {
        model: User
      }
    ]
  });

  let body = pupa(message || "", {
    protocol: ticket?.protocol || '',
    name: ticket?.contact?.name || '',
  });

  if(!whatsapp.tenantId || !whatsapp.type || !whatsapp.number){
    channel = await Whatsapp.findOne({
      where: { number: whatsapp.number }
    });
    whatsapp = channel
  }

  const notificameHubToken = await showHubToken(
    whatsapp.tenantId.toString()
  );

  const client = new Client(notificameHubToken);

  logger.info("ticket?.channel " + ticket?.channel);

  const channelClient = client.setChannel(ticket?.channel.split('hub_')[1]);

  const content = new TextContent(body);

  let contactNumber

  if(ticket?.channel === 'hub_facebook'){
    contactNumber = contact.messengerId
  }
  if(ticket?.channel === 'hub_instagram'){
    contactNumber = contact.instagramPK
  }

  try {
    logger.info("whatsapp.number " + whatsapp.number + " contactNumber "  + contactNumber + " content "  + content + " message "  + body);

    let response = await channelClient.sendMessage(
      whatsapp.number,
      contactNumber,
      content
    );

    logger.info("" + JSON.stringify(response));

    let data: any;

    try {
      const jsonStart = response.indexOf("{");
      const jsonResponse = response.substring(jsonStart);
      data = JSON.parse(jsonResponse);
    } catch (error) {
      data = response;
    }

    const newMessage = await CreateMessageService({
      id: data.id,
      contactId: contact.id,
      body: body,
      ticketId,
      fromMe: true,
      tenantId: whatsapp.tenantId
    });

    if(ticket){
      await ticket.update({lastMessage: body || '', aswered: true})
      socketEmit({
        tenantId: whatsapp.tenantId,
        type: "ticket:update",
        payload: ticket
      });
    }

    return newMessage;
  } catch (error) {
    logger.warn("e7 " + JSON.stringify(error));
  }
};