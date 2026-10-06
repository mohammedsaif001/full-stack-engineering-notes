import express from 'express'
import cors from "cors"
import cookieParser from "cookie-parser"

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


app.get('/', (req, res) => {
    res.send("Welcome to Project Management API")
})

export default app

