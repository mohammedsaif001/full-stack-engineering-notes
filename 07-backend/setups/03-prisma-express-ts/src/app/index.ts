import express from "express"

export const expressApplication = () => {
    const app = express()

    // Middlewares

    // Routes
    app.get('/health', (req, res) => {
        res.status(200).send("Application is Healthy")
    })

    // Error Handling

    // Return Application
    return app
}