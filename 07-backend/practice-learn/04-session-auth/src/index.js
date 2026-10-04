import 'dotenv/config';
import express from 'express';
import crypto from 'crypto';
import db from './db/index.js';
import { usersTable } from './db/schema.js';

const app = express();
app.use(express.json())


app.get('/health', (req,res)=>{
    return res.send("OK")
})      

app.post('/signup', async (req, res) => {
    const { name, email, password } = req.body;
    if(!name || !email || !password){
        return res.status(400).json({ message: 'All fields are required' });
    }

    const salt = await crypto.randomBytes(16).toString('hex');
    const hashedPassword = await crypto.createHmac('sha256', salt)
               .update(password)
        .digest('hex');
    
    const [user] = await db.insert(usersTable).values({
        name,
        email,
        password: hashedPassword,
        salt,
        role:'user',
    }).returning({ id: usersTable.id });
    
    return res.status(201).json({ user, message: 'User Created Successfully' })
    
})


app.listen(process.env.PORT,(err)=>{
    if(err){
        console.log(err);
        return;
    }
    console.log(`Server is running on port ${process.env.PORT}`);
})