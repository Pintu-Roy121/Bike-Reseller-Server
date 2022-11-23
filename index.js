const express = require('express');
const cors = require('cors');
require('dotenv').config();

const port = process.env.PORT || 5000;

const app = express()

// middleware.......................
app.use(cors());
app.use(express());

app.get('/', async (req, res) => {
    res.send('Bike Server is running');
})


app.listen(port, () => {
    console.log(`Bikereselle is running on port ${port}`);
})