import { Router } from "express";
import AuthenticationController from "./controllers.js";

export const authRouter = Router();
const authenticationController = new AuthenticationController();
authRouter.post('/sign-up',authenticationController.handleSignUp.bind(authenticationController));