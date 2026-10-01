import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
    res.send('Books Fetched Successfully')
})

export default router;