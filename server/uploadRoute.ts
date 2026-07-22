import type { Express, Request, Response } from "express";
import multer from "multer";
import { storagePut } from "./storage";

const upload = multer({ storage: multer.memoryStorage(), limits: { fileSize: 500 * 1024 * 1024 } });

export function registerUploadRoute(app: Express) {
  app.post("/api/upload", upload.single("video"), async (req: Request, res: Response) => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "No file provided" });
        return;
      }
      const fileKey = `videos/${Date.now()}-${file.originalname.replace(/[^a-zA-Z0-9._-]/g, "_")}`;
      const { key, url } = await storagePut(fileKey, file.buffer, file.mimetype);
      res.json({ fileKey: key, url });
    } catch (error) {
      console.error("[Upload] Failed:", error);
      res.status(500).json({ error: "Upload failed" });
    }
  });
}
