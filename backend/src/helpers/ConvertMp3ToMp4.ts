import ffmpeg from "fluent-ffmpeg";
import { path as ffmpegPath } from "@ffmpeg-installer/ffmpeg";
import fs from "fs";
import { logger } from "../utils/logger";

// CONVERTER MP3 PARA MP4
const convertMp3ToMp4 = (input: string, outputMP4: string): Promise<void> => {
  return new Promise((resolve, reject) => {
    ffmpeg.setFfmpegPath(ffmpegPath);
    logger.info(`Converting ${input} to ${outputMP4}`);

    if (!fs.existsSync(input)) {
      const errorMsg = `Input file does not exist: ${input}`;
      logger.error(errorMsg);
      return reject(new Error(errorMsg));
    }

    ffmpeg(input)
      .inputFormat("mp3")
      .output(outputMP4)
      .outputFormat("mp4")
      .on("start", (commandLine) => {
        logger.info(`Spawned Ffmpeg with command: ${commandLine}`);
      })
      .on("error", (error: Error) => {
        logger.info(`Encoding Error: ${error.message}`);
        reject(error);
      })
      .on("progress", (progress) => {
        logger.info(`Processing: ${progress.percent}% done`);
      })
      .on("end", () => {
        logger.info("Video Transcoding succeeded !");
        resolve();
      })
      .run();
  });
};

export { convertMp3ToMp4 };