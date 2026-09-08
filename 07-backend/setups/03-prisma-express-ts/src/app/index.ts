import express from "express"
import { authRouter } from "./auth/route.js"

export const expressApplication = () => {
    const app = express()

    // Middlewares
    app.use(express.json())
    app.use(express.urlencoded({ extended: true }))

    // Routes
    app.get('/health', (req, res) => {
        res.status(200).send("Application is Healthy")
    })

    app.use('/auth', authRouter)

    // Error Handling

    // Return Application
    return app
}