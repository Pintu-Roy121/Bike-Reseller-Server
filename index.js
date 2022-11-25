const express = require('express');
const cors = require('cors');
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
// stripe secret key........
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);


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
        const paymentsCollection = client.db('BikeReseller').collection('payments');

        // Get all bike breand category.............................
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollections.find(query).toArray();
            res.send(categories);
        })

        // get category products.................................

        app.get('/allproducts', async (req, res) => {
            const query = {}
            const result = await productsCollections.find(query).toArray();
            res.send(result)
        })
        // get personal products for seller.............................
        app.get('/allproducts/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const products = await productsCollections.find(query).toArray();
            res.send(products)
        })

        // insert product to the database........................................
        app.post('/product', async (req, res) => {
            const product = req.body;
            const result = await productsCollections.insertOne(product);
            res.send(result)
        })

        // get specicfic category products..........................
        app.get('/products/:brand', async (req, res) => {
            const brand = req.params.brand;
            const query = { brand_name: brand }
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

        // get reported Products ..........................
        app.get('/products', async (req, res) => {
            const query = { report: 'true' }
            const result = await productsCollections.find(query).toArray()
            res.send(result);
        })

        // save user to database.......................
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })
        // get all sellers.........................................
        app.get('/users/sellers', async (req, res) => {
            const query = { role: 'seller' }
            const sellers = await usersCollection.find(query).toArray()
            res.send(sellers)
        })

        // payment api.....................................
        app.post("/create-payment-intent", async (req, res) => {
            const product = req.body;
            const price = parseInt(product.price);
            const amount = price * 100;
            const paymentIntent = await stripe.paymentIntents.create({
                currency: "usd",
                amount: amount,
                "payment_method_types": [
                    "card"
                ],
            });
            res.send({
                clientSecret: paymentIntent.client_secret,
            });
        })

        // payment document saved........................................
        app.post('/payments', async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const id = payment.bookingId;
            const filter = { _id: ObjectId(id) }
            const updateDoc = {
                $set: {
                    paid: true,
                    transectionId: payment.transectionId
                }
            }
            const updataResult = await bookingCollection.updateOne(filter, updateDoc)
            res.send(result)
        })


        // verifi users............................................
        app.put('/sellers/:id', async (req, res) => {
            const id = req.params.id;
            console.log(id);
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    verify: 'true'
                }
            }
            const result = await usersCollection.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // delete seller from database.........................................
        app.delete('/sellers/:id', async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // delete Buyers form database....................................
        app.delete('/buyers/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await usersCollection.deleteOne(query);
            res.send(result)
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

        // get login user............................
        app.get('/user/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email };
            const user = await usersCollection.findOne(query);
            res.send(user)
        })

        // get user from db........................................
        app.get('/users/seller/:email', async (req, res) => {
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

        app.get('/booked/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const booked = await bookingCollection.findOne(query)
            res.send(booked)
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