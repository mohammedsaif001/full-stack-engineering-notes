import express from "express";

const app = express();


app.get('/health',(req,res) => {
    res.send('OK')
})



app.listen(8000, () => {
    console.log("Server is running on port 8000")
})