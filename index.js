const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
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

// verify jwt token.............................
const verifyjwt = (req, res, next) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send('Unauthorized Access');
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN, function (error, decoded) {
        if (error) {
            return res.status(403).send({ message: 'Forbidden access' })
        }
        req.decoded = decoded;
        next()
    })

}


async function run() {

    try {
        const categoriesCollections = client.db('BikeReseller').collection('categories');
        const productsCollections = client.db('BikeReseller').collection('products');
        const usersCollection = client.db('BikeReseller').collection('users');
        const bookingCollection = client.db('BikeReseller').collection('bookings');
        const paymentsCollection = client.db('BikeReseller').collection('payments');
        const advertiseCollection = client.db('BikeReseller').collection('advertise');


        // Create secret token.....................................
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '6d' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: ' ' })
        })


        // verify admin....................................
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await usersCollection.findOne(query);

            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden Access' })
            }
            next()
        }

        // Get all bike breand category.............................
        app.get('/categories', async (req, res) => {
            const query = {};
            const categories = await categoriesCollections.find(query).toArray();
            res.send(categories);
        })

        // get category products.................................
        app.get('/allproducts', async (req, res) => {
            const query = {}
            const cursor = productsCollections.find(query).sort({ date: -1 })
            const AllProducts = await cursor.toArray();
            const Available = AllProducts.filter(product => product.sold !== 'true');
            // console.log(Available);
            res.send(Available)
        })

        // get personal products for seller.............................
        app.get('/allproducts/:email', verifyjwt, async (req, res) => {
            const email = req.params.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            const query = { email: email }
            const cursor = productsCollections.find(query).sort({ sold: 1, advertise: 1 })
            const products = await cursor.toArray();
            res.send(products)
        })

        // insert product to the database........................................
        app.post('/product', verifyjwt, async (req, res) => {
            const product = req.body;
            const result = await productsCollections.insertOne(product);
            res.send(result)
        })

        // delete a Product..........................................
        app.delete('/delete/:id', verifyjwt, async (req, res) => {
            const id = req.params.id;
            const query = {
                _id: ObjectId(id)
            }
            const result = await productsCollections.deleteOne(query);
            res.send(result)
        })
        //save Advertise ..................................
        // ...................................................
        app.post('/advertise', verifyjwt, async (req, res) => {
            const product = req.body;
            const query = {
                _id: product._id
            }
            // update product to advertise product................................................
            const productQuery = {
                _id: ObjectId(product._id)
            }
            const updateDoc = {
                $set: {
                    advertise: 'true'
                }
            }
            const adproduct = await productsCollections.findOne(productQuery);
            if (adproduct) {
                const updateProduct = await productsCollections.updateOne(productQuery, updateDoc)
            }

            // get product to addvertist..........................
            const addedProduct = await advertiseCollection.findOne(query);
            if (addedProduct) {
                return res.send({ message: 'Already Advertise' })
            }

            const result = await advertiseCollection.insertOne(product);
            res.send(result)
        })
        // get Advertise .......................
        app.get('/advertise', async (req, res) => {
            const query = {};
            const advertises = await advertiseCollection.find(query).toArray();
            const advertisedData = advertises.filter(product => product.sold !== 'true');
            res.send(advertisedData);
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
        app.get('/reported/products', verifyjwt, verifyAdmin, async (req, res) => {
            const query = { report: 'true' }
            const result = await productsCollections.find(query).toArray()
            res.send(result);
        })

        // set product as Reported............................
        app.put('/reported/products/:id', verifyjwt, async (req, res) => {
            const id = req.params.id;
            const filter = {
                _id: ObjectId(id)
            }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    report: 'true'
                }
            }
            const result = await productsCollections.updateOne(filter, updateDoc, options)
            res.send(result)
        })

        // Delete Report from product...............................
        app.patch('/reported/product/:id', verifyjwt, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) }
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    report: ''
                }
            }

            const product = await productsCollections.updateOne(filter, updateDoc, options);
            const report = await productsCollections.findOne(filter);
            console.log(report);
            res.send(product);
        })

        // save user to database.....................................
        app.post('/users', async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const savedUser = await usersCollection.findOne(query);
            if (savedUser) {
                return res.send({ message: 'User already saved' });
            }
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })
        // get all sellers.........................................
        app.get('/users/sellers', verifyjwt, verifyAdmin, async (req, res) => {
            const query = { role: 'seller' }
            const sellers = await usersCollection.find(query).toArray()
            res.send(sellers)
        })

        // payment api.....................................
        app.post('/create-payment-intent', verifyjwt, async (req, res) => {
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
            // advertise product update is sold or note.............................
            const advertiseid = payment.productid
            const adproduct = { _id: advertiseid }
            const advertiseupdate = {
                $set: {
                    sold: 'true'
                }
            }
            const adupdate = await advertiseCollection.updateOne(adproduct, advertiseupdate);

            // bookings and productss update...................................
            const productid = payment.productid
            const filter = { _id: ObjectId(id) }
            const query = { _id: ObjectId(productid) }
            const updateDoc = {
                $set: {
                    paid: 'true',
                    transectionId: payment.transectionId
                }
            };
            const updateSold = {
                $set: {
                    sold: 'true'
                }
            };
            const updataBooking = await bookingCollection.updateOne(filter, updateDoc)
            const updateProduct = await productsCollections.updateOne(query, updateSold)
            res.send(result)
        })

        // verify users............................................
        app.put('/sellers/:id', async (req, res) => {
            const id = req.params.id;
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
        app.get('/users/buyers', verifyjwt, verifyAdmin, async (req, res) => {
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

        // Delete bookings............................................
        app.delete('/bookings/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const result = await bookingCollection.deleteOne(query);
            res.send(result)
        })

        app.get('/booked/payment/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) }
            const booked = await bookingCollection.findOne(query)
            res.send(booked)
        })

        // get all bookings of user.....................
        app.get('/bookings', verifyjwt, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;
            if (email !== decodedEmail) {
                return res.status(403).send({ message: 'Not valid access' })
            }
            const query = { email: email }
            const bookings = await bookingCollection.find(query).toArray()
            res.send(bookings)
        })

        // app.get('/bookings/:email', async (req, res) => {
        //     const email = req.params.email;
        //     const query = { email }
        //     const bookings = await bookingCollection.find(query).toArray()
        //     res.send(bookings)
        // })

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