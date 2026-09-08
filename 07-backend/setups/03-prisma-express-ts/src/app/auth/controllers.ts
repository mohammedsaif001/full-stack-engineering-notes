
import type { Request, Response, NextFunction } from "express";
import { signinPayloadModel, signupPayloadModel } from "./schema.js";
import { db } from "../../db/index.js";
import { usersTable } from "../../db/schema.js";
import { eq } from "drizzle-orm";
import { createHmac, randomBytes } from "node:crypto";
import { createUserToken, type UserTokenPayload } from "./utils/tokens.js";

class AuthenticationController {
    public async handleSignUp(req:Request,res:Response,next:NextFunction) {
        const validationResult = await signupPayloadModel.safeParseAsync(req.body);

        if (!validationResult.success) {
            return res.status(400).json({ message: "Invalid Input Data", error: validationResult.error });
        }

        const { firstName, lastName, email, password } = validationResult.data;

        const userEmailResult = await db.select().from(usersTable).where(eq(usersTable.email, email));

        if (userEmailResult.length > 0) return res.status(400).json({ error: 'duplicate entry', message: `user with email ${email} already exists` });

        const salt = randomBytes(32).toString('hex');
        const hashedPassword = createHmac('sha256', salt).update(password).digest('hex');


        const [result] = await db.insert(usersTable).values({
            firstName,
            lastName,
            email,
            password: hashedPassword,
            salt
        }).returning({ id: usersTable.id })

        return res.status(201).json({ message: 'user has been created successfully', data: { id: result?.id } })
    }

    public async handleSignin(req: Request, res: Response) {
        const validationResult = await signinPayloadModel.safeParseAsync(req.body);

        if (!validationResult.success) {
            return res.status(400).json({ message: "Invalid Input Data", error: validationResult.error });
        }

        const { email, password } = req.body

        const [user] = await db.select().from(usersTable).where(eq(usersTable.email, email));

        if (!user) return res.status(404).json({ message: "User Not Found" });

        const salt = user.salt!;
        const hashedPassword = createHmac('sha256', salt).update(password).digest('hex')

        if (user.password !== hashedPassword) return res.status(401).json({ message: "Invalid Password" });

        const token = createUserToken({ id: user.id });
        return res.json({ message: 'Signin Success', data: { token } })
    }

    public async handleme(req: Request, res: Response) {
        //@ts-ignore
        const { id } = req.user! as UserTokenPayload;
        const [userResult] = await db.select().from(usersTable).where(eq(usersTable.id,id))
        return res.json(
            {
                firstName: userResult?.firstName,
                lastName:userResult?.lastName,
                email:userResult?.email,
            })
    }
}


export default AuthenticationController