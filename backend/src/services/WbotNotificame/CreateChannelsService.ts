import Tenant from "../../models/Tenant";
import AppError from "../../errors/AppError";
import Whatsapp from "../../models/Whatsapp";
import { IChannel } from "../../controllers/ChannelHubController";
import { getIO } from "../../libs/socket";

interface Request {
  tenantId: number;
  channels: IChannel[];
}

interface Response {
  whatsapps: Whatsapp[];
}

const CreateChannelsService = async ({
  tenantId,
  channels = []
}: Request): Promise<Response> => {
  const tenant = await Tenant.findOne({
    where: {
      id: tenantId
    }
  });

  if (tenant !== null) {
    let whatsappCount = await Whatsapp.count({
      where: {
        tenantId
      }
    });

    whatsappCount += channels.length;
  }

  channels = channels.map(channel => {
    return {
      ...channel,
      status: "CONNECTED",
      tenantId
    };
  });

  const whatsapps = await Whatsapp.bulkCreate(channels, {
    ignoreDuplicates: true
  });

  return { whatsapps };
};

export default CreateChannelsService;