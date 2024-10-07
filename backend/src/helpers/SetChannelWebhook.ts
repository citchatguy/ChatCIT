import Whatsapp from "../models/Whatsapp";
import { IChannel } from "../controllers/ChannelHubController";
import { showHubToken } from "./ShowHubToken";

import { Client, MessageSubscription } from "notificamehubsdk";
import { logger } from "../utils/logger";

export const setChannelWebhook = async (
  whatsapp: IChannel,
  whatsappId: string
) => {
  const notificameHubToken = await showHubToken(whatsapp.tenantId.toString());

  const client = new Client(notificameHubToken);

  const url = `${process.env.BACKEND_URL}/hub-webhook/${whatsapp.number}`;


  const subscription = new MessageSubscription(
    {
      url
    },
    {
      channel: whatsapp.number
    }
  );

  client
    .createSubscription(subscription)
    .then((response: any) => {
      logger.info("Webhook subscribed " + response);
    })
    .catch((error: any) => {
      logger.warn("Webhook subscribed e " + error);
    });

  await Whatsapp.update(
    {
      status: "CONNECTED"
    },
    {
      where: {
        id: whatsappId
      }
    }
  );
};