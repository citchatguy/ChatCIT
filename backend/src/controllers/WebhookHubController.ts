import { Request, Response } from "express";
import Whatsapp from "../models/Whatsapp";
import HubMessageListener from "../services/WbotNotificame/HubMessageListener";
import { logger } from "../utils/logger";

export const listen = async (
  req: Request,
  res: Response
): Promise<Response> => {
  logger.info("Webhook received");
  const medias = req.files as Express.Multer.File[];
  const { number } = req.params;

  const whatsapp = await Whatsapp.findOne({
    where: { number: number }
  });

  if (!whatsapp) {
    return res.status(404).json({ message: "Whatsapp channel not found" });
  }

  try {
    await HubMessageListener(req.body, whatsapp, medias);

    return res.status(200).json({ message: "Webhook received" });
  } catch (error) {
    return res.status(400).json({ message: error });
  }
};