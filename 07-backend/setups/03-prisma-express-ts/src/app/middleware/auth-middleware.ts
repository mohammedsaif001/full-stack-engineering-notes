import type { NextFunction, Request, Response } from "express";
import { verifyUserToken } from "../auth/utils/tokens.js";

export function authenticationMiddleware() {
    return function (req:Request,res:Response,next:NextFunction) {
        const authHeader = req.header('Authorization');

        if (!authHeader) {
            return next()
        }

        if(!authHeader?.startsWith('Bearer ')){
            return res.status(400).json({ message: 'Unauthorized' });
        }

        const token = authHeader.split(' ')[1]

         if (!token) return res.status(400).json({ error: 'authorization header must start with Bearer and followed by token' })

        const user = verifyUserToken(token);

        // @ts-ignore
        req.user = user

        next()

    }
} 

export function restrictToAuthenticatedUser() {
    return function (req: Request, res: Response, next: NextFunction) {
  // @ts-ignore
        if (!req.user) return res.status(401).json({ error: 'Authentication Required, please login to continue' })
        return next();
     }
}