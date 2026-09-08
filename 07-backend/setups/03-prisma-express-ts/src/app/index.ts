import express from "express"
import { authRouter } from "./auth/route.js"
import { authenticationMiddleware } from "./middleware/auth-middleware.js"

export const expressApplication = () => {
    const app = express()

    // Middlewares
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }));
    app.use(authenticationMiddleware())

    // Routes
    app.get('/health', (req, res) => {
        res.status(200).send("Application is Healthy")
    })

    app.use('/auth', authRouter)

    // Error Handling

    // Return Application
    return app
}