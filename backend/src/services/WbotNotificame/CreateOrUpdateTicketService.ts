import { Op } from "sequelize";
import Ticket from "../../models/Ticket";
import Whatsapp from "../../models/Whatsapp";
import { IContent } from "./HubMessageListener";
import { getIO } from "../../libs/socket";
import Tenant from "../../models/Tenant";
import Contact from "../../models/Contact";
import User from "../../models/User";
import { logger } from "../../utils/logger";
import socketEmit from "../../helpers/socketEmit";

interface TicketData {
  contactId: number;
  channel: string;
  contents: IContent[];
  whatsapp: Whatsapp;
}

const CreateOrUpdateTicketService = async (
  ticketData: TicketData
): Promise<Ticket> => {
  logger.info("creating ticket ");
  const { contactId, channel, contents, whatsapp } = ticketData;
  const io = getIO();

  const SettingTenant = await Tenant.findOne({
    where: {  id: whatsapp.tenantId }
  });

  let statusCondition = ["open", "pending"];

  let orderClause: [string, string][] = [];

  const ticketExists = await Ticket.findOne({
    where: {
      status: {
        [Op.or]: statusCondition
        // [Op.or]: ["open", "pending"]
        // // manter historico groupTickets
        // [Op.or]: ["open", "pending", "closed"]
      },
      tenantId: whatsapp.tenantId,
      whatsappId: whatsapp.id,
      contactId: contactId
    },
    order: orderClause.length > 0 ? orderClause : undefined,
    include: [
      {
        model: Contact,
        as: "contact",
        include: [
          "extraInfo",
          "tags",
          {
            association: "wallets",
            attributes: ["id", "name"]
          }
        ]
      },
      {
        model: User,
        as: "user",
        attributes: ["id", "name", "isOnline"]
      },
      {
        association: "whatsapp",
        attributes: ["id", "name", "tokenAPI", "chatFlowId", "status", "bmToken", "wabaVersion"]
      }
    ]
  });

  if (ticketExists) {
    logger.info("ticket exists ");

    let newStatus = ticketExists.status;
    let newQueueId = ticketExists.queueId;

    if (ticketExists.status === "closed") {
      newStatus = "pending";
    }

    await ticketExists.update({
      answered: false,
      lastMessage: contents[0].text,
      status: newStatus,
      queueId: newQueueId
    });

    logger.info("ticket queue updated " + newQueueId);

    await ticketExists.reload({
      include: [
        {
          association: "contact"
        },
        {
          association: "user"
        },
        {
          association: "queue"
        },
        {
          association: "whatsapp"
        }
      ]
    });

    socketEmit({
      tenantId: whatsapp.tenantId,
      type: "ticket:update",
      payload: ticketExists
    });

    return ticketExists;
  }

  const newTicket = await Ticket.create({
    status: "pending",
    channel: "hub_" + channel,
    lastMessage: contents[0].text,
    contactId,
    whatsappId: whatsapp.id,
    tenantId: whatsapp.tenantId,
  });

  await newTicket.reload({
    include: [
      {
        association: "contact"
      },
      {
        association: "user"
      },
      {
        association: "queue"
      },
      {
        association: "whatsapp"
      }
    ]
  });

  socketEmit({
    tenantId: whatsapp.tenantId,
    type: "ticket:update",
    payload: newTicket
  });

  return newTicket;
};

export default CreateOrUpdateTicketService;