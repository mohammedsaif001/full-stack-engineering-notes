import { Router } from "express";
import AuthenticationController from "./controllers.js";
import { restrictToAuthenticatedUser } from "../middleware/auth-middleware.js";

export const authRouter = Router();


const authenticationController = new AuthenticationController();
authRouter.post('/sign-up', authenticationController.handleSignUp.bind(authenticationController));
authRouter.post('/sign-in', authenticationController.handleSignin.bind(authenticationController));
authRouter.get('/me', restrictToAuthenticatedUser(), authenticationController.handleme.bind(authenticationController));