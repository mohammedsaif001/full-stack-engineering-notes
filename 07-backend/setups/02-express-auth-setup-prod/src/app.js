import cookieParser from "cookie-parser";
import express from "express";
import authRoute from "./modules/auth/auth.routes.js";
import multer from "multer";
import ApiResponse from "./common/utils/api-response.js";
import crypto from "crypto";
import path from "node:path";
import ApiError from "./common/utils/api-error.js";

const app = express();

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.get("/health", (req, res) => {
  return res.status(200).json({ message: "Application Health is Fine" });
});

// 1. Basic Mulkter
// const upload = multer();
// app.post("/upload", upload.single("file"), function (req, res, next) {
//   // req.file is the `avatar` file
//   // req.body will hold the text fields, if there were any
//   console.log(req.file);
//   return ApiResponse.ok(res, "Uploaded successfully");
// });

// 2. Disk Storage Multer

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    // add error handling and all
    cb(null, "public/my-uploads");
  },
  filename: function (req, file, cb) {
    crypto.randomBytes(16, function (err, raw) {
      if (err) return cb(err);
      const ext = path.extname(file.originalname);
      cb(null, file.fieldname + "-" + raw.toString("hex") + ext);
    });
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fieldNameSize: 100,
    fileSize: 1024 * 1024 * 5,
    files: 10,
  },
  fileFilter: (req, file, cb) => {
    const allowed = ["image/png", "image/jpeg", "application/pdf"];

    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("File type not supported"), false);
    }
  },
});
app.post("/upload", upload.single("file"), function (req, res, next) {
  // req.file is the `avatar` file
  // req.body will hold the text fields, if there were any
  console.log(req.file); // thjis will come as an array
  return ApiResponse.ok(res, "Uploaded successfully");
});

app.post("/upload-with-error", function (req, res, next) {
  upload.single("file")(res, res, (err) => {
    if (err?.code === "LIMIT_FILE_SIZE") {
      return ApiError.badRequest(`File size is too large`);
    }
    if (err?.code === "LIMIT_FILE_TYPES") {
      return ApiError.badRequest(`File type is not allowed`);
    }
    if (err?.code === "LIMIT_FILE_COUNT") {
      return ApiError.badRequest(`File count is too large`);
    }
    if (err?.code === "LIMIT_FILE_SIZE") {
      return ApiError.badRequest(`File size is too large`);
    }
    if (err?.code === "LIMIT_FILE_SIZE") {
      return ApiError.badRequest(`File size is too large`);
    }
    return ApiResponse.ok(res, "Uploaded successfully");
  });
});

app.post(
  "/upload-multiple",
  upload.array("file", 12),
  function (req, res, next) {
    // req.files is array of `photos` files
    // req.body will contain the text fields, if there were any
    console.log(req.files);
    return ApiResponse.ok(res, "Uploaded successfully");
  },
);

app.post(
  "/upload-different-fields",
  upload.fields([
    { name: "avatar", maxCount: 1 },
    { name: "gallery", maxCount: 8 },
  ]),
  function (req, res, next) {
    // req.files is array of `photos` files
    // req.body will contain the text fields, if there were any
    console.log(req.files); // avatar & gallery will be an array like req.files.avatar[0]
    return ApiResponse.ok(res, "Uploaded successfully");
  },
);

// 3. Memory Storage Multer
// const storage = multer.memoryStorage();
// const upload = multer({ storage: storage });
// app.post("/upload", upload.single("file"), function (req, res, next) {
//   // req.file is the `avatar` file
//   // req.body will hold the text fields, if there were any
//   console.log(req.file.buffer);
//   return ApiResponse.ok(res, "Uploaded successfully");
// });

app.use("/api/auth", authRoute);

// Catch-all for undefined routes
app.all("{*path}", (req, res) => {
  throw ApiError.notfound(`Route ${req.originalUrl} not found`);
});

export default app;