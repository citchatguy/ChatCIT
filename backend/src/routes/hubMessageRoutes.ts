import express from "express";
import uploadConfig from "../config/upload";

import * as MessageController from "../controllers/MessageHubController";
import isAuth from "../middleware/isAuth";
import multer from "multer";

const hubMessageRoutes = express.Router();
const upload = multer(uploadConfig);

hubMessageRoutes.post(
  "/hub-message/:ticketId",
  isAuth,
  upload.array("medias"),
  MessageController.send
);

export default hubMessageRoutes;