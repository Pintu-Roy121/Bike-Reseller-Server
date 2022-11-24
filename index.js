const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const port = process.env.PORT || 5000;

const app = express()

// middleware.......................
app.use(cors());
app.use(express.json());


// Database connection........................

const uri = `mongodb+srv://${process.env.DB_USER_NAME}:${process.env.DB_PASSWORD}@cluster0.geiv5ao.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });

async function run() {

    try {
        const categoriesCollections = client.db('BikeReseller').collection('categories');
        const productsCollections = client.db('BikeReseller').collection('products');
        const usersCollection = client.db('BikeReseller').collection('users');
        const bookingCollection = client.db('BikeReseller').collection('bookings');

        // Get all bike breand category.............................
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollections.find(query).toArray();
            res.send(categories);
        })

        // get category products.................................

        // app.get('/products', async (req, res) => {
        //     const query = {}
        //     const result = await productsCollections.find(query).toArray();
        //     res.send(result)
        // })



        // get specicfic category products..........................
        app.get('/products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { category_id: id }
            const result = await productsCollections.find(query).toArray();
            res.send(result)
        })

        // get specific Product..............................
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const product = await productsCollections.findOne(query);
            res.send(product)
        })

        // save user to database.......................
        app.post('/users', async (req, res) => {
            const user = req.body;
            console.log(user);
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })
        // get all sellers.........................................
        app.get('/users/sellers', async (req, res) => {
            const query = { role: 'seller' }
            const sellers = await usersCollection.find(query).toArray()
            res.send(sellers)
        })
        // get all buyers.........................................
        app.get('/users/buyers', async (req, res) => {
            const query = { role: 'buyer' }
            const buyers = await usersCollection.find(query).toArray()
            res.send(buyers)
        })

        // get user from db........................................
        app.get('/users/buyer/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            res.send(user)
        })

        // save Booking to the db.......................................
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const result = await bookingCollection.insertOne(booking);
            res.send(result)
        })

        // get all bookings of user.....................
        app.get('/bookings/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email }
            const bookings = await bookingCollection.find(query).toArray()
            res.send(bookings)
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