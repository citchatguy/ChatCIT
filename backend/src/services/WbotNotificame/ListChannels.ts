import { showHubToken } from "../../helpers/ShowHubToken";
import { logger } from "../../utils/logger";
import { Client } from "notificamehubsdk";
require("dotenv").config();

const ListChannels = async (tenantId: string): Promise<any> => {
  try {
    const notificameHubToken = await showHubToken(tenantId);

    if (!notificameHubToken) {
      throw new Error("NOTIFICAMEHUB_TOKEN_NOT_FOUND");
    }

    const client = new Client(notificameHubToken);

    const response = await client.listChannels();
    logger.info("" + JSON.stringify(response));
    return response;
  } catch (error: any) {
    logger.warn(" Error in ListChannels: ", error);
    if (error instanceof Error) {
      throw new Error(error.message);
    } else {
      throw new Error("An unknown error occurred: " + JSON.stringify(error));
    }
  }
};

export default ListChannels;