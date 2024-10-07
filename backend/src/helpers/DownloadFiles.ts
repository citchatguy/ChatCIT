import axios from "axios";
import { extname, join } from "path";
import { writeFile } from "fs/promises";
import mime from "mime-types";
import { logger } from "../utils/logger";

export const downloadFiles = async (url: string) => {
  try {
    const { data } = await axios.get(url, {
      responseType: "arraybuffer"
    });

    let type

    if (url.includes('com/ig_messaging_cdn')) {
      const { fileTypeFromBuffer } = await (eval(
        'import("file-type")'
      ) as Promise<typeof import("file-type")>);

      const fileTypeResult = await fileTypeFromBuffer(data);

      if (!fileTypeResult) {
          throw new Error('Não foi possível determinar o tipo do arquivo.');
      }

      type = fileTypeResult.ext
    } else {
      type = url.split("?")[0].split(".").pop();
    }

    logger.info("type " + type);

    const filename = `${new Date().getTime()}.${type}`;

    const filePath = `${__dirname}/../../public/${filename}`;

    await writeFile(
      join(__dirname, "..", "..", "public", filename),
      data,
      "base64"
    );

    const mimeType = mime.lookup(filePath);
    const extension = extname(filePath);
    const originalname = url.split("/").pop();

    const media = {
      mimeType,
      extension,
      filename,
      data,
      originalname
    };

    return media;
  } catch (error) {
    logger.warn("e1 " +  error)
    throw error;
  }
};