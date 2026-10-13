import express from "express";
import multer from "multer";
import path from "node:path";
import fs from "node:fs";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";
import { config } from "./config/index.js";
import { enqueueIndexingJob, enqueueQueryJob, queryQueue } from "./redis-queue/queue.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadDir = path.join(__dirname, "..", "uploads");

// Ensure the uploads directory exists.
fs.mkdirSync(uploadDir, { recursive: true });


// --- Multer config: store PDFs on disk with a unique name ---
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const unique = `${Date.now()}-${crypto.randomUUID()}`;
    cb(null, `${unique}${path.extname(file.originalname)}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === "application/pdf") return cb(null, true);
    cb(new Error("Only PDF files are allowed"));
  },
});

const app = express();
app.use(express.json());

app.get("/health", (_req, res) => res.json({ status: "ok" }));


app.listen(config.port, () => {
  console.log(`🚀 Server listening on http://localhost:${config.port}`);
});
