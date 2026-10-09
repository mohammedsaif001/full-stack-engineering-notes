import express from 'express';
import cors from "cors";
import cookieParser from "cookie-parser";
import { ApiError } from "./utils/api-error.js";

const app = express();

// BASIC CONFIGs
app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: '16kb' }));
app.use(express.static("public"));
app.use(cookieParser());

// CORS Config
app.use(
    cors({
        origin: process.env.CORS_ORIGIN?.split(",") || 'http://localhost:5173',
        credentials: true,
        methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
        allowedHeaders: ["Content-Type", "Authorization"],
    })
);


// Import the routes
import healthCheckRouter from "./routes/healthcheck.routes.js";
import authRouter from "./routes/auth.routes.js";
import projectRouter from "./routes/project.routes.js";
import taskRouter from "./routes/task.routes.js";
import noteRouter from "./routes/note.routes.js";

app.use("/api/v1/healthcheck", healthCheckRouter);
app.use("/api/v1/auth", authRouter);
app.use("/api/v1/projects", projectRouter);
app.use("/api/v1/tasks", taskRouter);
app.use("/api/v1/notes", noteRouter);

app.get('/', (req, res) => {
    res.send("Welcome to Project Management API");
});

// Global Error Handler Middleware
app.use((err, req, res, next) => {
    if (err instanceof ApiError) {
        return res.status(err.statusCode).json({
            statusCode: err.statusCode,
            data: err.data,
            message: err.message,
            success: err.success,
            errors: err.errors,
        });
    }

    return res.status(err.statusCode || 500).json({
        statusCode: err.statusCode || 500,
        message: err.message || "Internal Server Error",
        success: false,
        errors: [],
    });
});

export default app;
