import express from "express";
import { authenticationMiddleware } from "../middleware/auth.middleware.js";

const app = express();
app.use(express.json());
app.use(authenticationMiddleware);

export default app;

