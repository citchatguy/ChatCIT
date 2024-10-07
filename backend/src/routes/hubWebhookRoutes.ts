import express from "express";
import uploadConfig from "../config/upload";

import * as WebhookController from "../controllers/WebhookHubController";
import multer from "multer";

const hubWebhookRoutes = express.Router();
const upload = multer(uploadConfig);

hubWebhookRoutes.post(
  "/hub-webhook/:number",
  upload.array("medias"),
  WebhookController.listen
);

export default hubWebhookRoutes;