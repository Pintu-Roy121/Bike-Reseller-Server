const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const app = express()

// middleware.......................
app.use(cors());
app.use(express());


// Database connection........................

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASSWORD}@cluster0.geiv5ao.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {
        const categoriesCollections = client.db('BikeReseller').collection('categories');
        const productsCollections = client.db('BikeReseller').collection('products')

        // Get all bike breand category.............................
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollections.find(query).toArray();
            res.send(categories);
        })

        // get category products.................................

        app.get('/products', async (req, res) => {
            const query = {}
            const result = await productsCollections.find(query).toArray();
            res.send(result)
        })

        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { category_id: id }
            const result = await productsCollections.find(query).toArray();
            res.send(result)
        })


    }
    finally {

    }

}
run().catch(console.error)


// basic setup.....................
app.get('/', async (req, res) => {
    res.send('Bike Server is running');
})


app.listen(port, () => {
    console.log(`server is running on port ${port}`);
})