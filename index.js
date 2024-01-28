
// import formData from 'form-data';
// import Mailgun from 'mailgun.js';
const formData = require('form-data')
const Mailgun = require('mailgun.js')
const express = require('express')
const cors = require('cors')
const app = express()
const port = process.env.PORT || 5000
const jwt = require('jsonwebtoken')

const API_KEY = '03142e710759f815c9589eb0d6e3cfeb-30b58138-b5bd0099';
const DOMAIN = 'sandbox253c6d2b8e0744f2bea10d6b5d61dfd6.mailgun.org';
const mailgun = new Mailgun(formData);
const Aclient = mailgun.client({ username: 'api', key: API_KEY });




const userName = 'FinalProject'
const password = 'fUi2aOviVuofrSiG'
const secret = '7f70dce608c2eb374801b3de150286d4669de6e46c79df608d420a0d949e22fd2e06422d0eea919c38d2ee9630d60300dd8f5b58a076999fccb2e05c078ed09a'

const STRIPE_SECRET_KEY = 'sk_test_51OECZ3CBbyKi0L0qAeob6WVZcSfWEPNzhbXzIYXSWS6t8cHRQ4JsG3zEElM93XekPX7NKsdwtZvzNd2yYoFQ05tK00icTRIjJI'
const stripe = require('stripe')(STRIPE_SECRET_KEY)


app.use(cors())
app.use(express.json())





const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const uri = `mongodb+srv://${userName}:${password}@cluster0.v00ay55.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});


async function run() {
    try {
        // client.connect();

        const menuCollection = client.db('BistroDB').collection('Menu')
        const reviewCollection = client.db('BistroDB').collection('Reviews')
        const cartCollection = client.db('BistroDB').collection('Cart')
        const usersCollection = client.db('BistroDB').collection('Users')
        const paymentsCollection = client.db('BistroDB').collection('Payments')

        // JWT related api
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, secret, { expiresIn: '10h' })
            res.send({ token })
        })
        // Middlewares
        const verify = (req, res, next) => {
            if (!req?.headers.authorization) {
                return res.status(401).send({ message: "Forbidden access" })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, secret, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'Forbidden access' })
                }
                req.decoded = decoded
                next()
            })
            // next()
        }
        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const filter = { email: email }
            const user = await usersCollection.findOne(filter)
            console.log(user);
            if (user?.role !== 'admin') { return res.status(403).send({ message: 'firbidden Access' }) }
            next()
        }


        // users realted api
        app.get('/users/admin/:email', verify, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                res.status(403).send({ message: "Unauthorized access" })
            }
            const filter = { email: email }
            let isAdmin = false;
            const user = await usersCollection.findOne(filter)
            if (user) {
                isAdmin = user?.role === 'admin'
            }
            res.send({ isAdmin })

        })

        app.post('/users', async (req, res) => {
            const user = req.body
            const filter = { email: user.email }
            const existingUser = await usersCollection.findOne(filter)
            if (existingUser) { return res.send({ message: "user Already Exists", insertedId: null }) }

            const result = await usersCollection.insertOne(user)
            res.send(result)
        })

        app.get('/users', verify, verifyAdmin, async (req, res) => {
            const result = await usersCollection.find().toArray()
            res.send(result)
        })

        app.delete('/users/:id', verify, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await usersCollection.deleteOne(filter)
            res.send(result)
        })

        app.patch('/users/admin/:id', verify, verifyAdmin, async (req, res) => {
            const id = req.params.id

            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        // menu related api

        app.get('/menu', async (req, res) => {
            const result = await menuCollection.find().toArray()
            res.send(result)
        })

        app.get('/menu/:id', async (req, res) => {
            const id = req?.params?.id
            const filter = { _id: id }  //Problem in DB
            const result = await menuCollection.findOne(filter)
            res.send(result)
        })

        app.post('/menu', verify, verifyAdmin, async (req, res) => {  // this verify should not work!!!(ref 78)No email sent..
            const menuItem = req.body
            console.log(menuItem);
            const result = await menuCollection.insertOne(menuItem)
            res.send(result)
        })

        app.patch('/menu/:id', verify, verifyAdmin, async (req, res) => {
            const item = req.body;
            const id = req.params.id
            const filter = { _id: id }   //Problem in DB
            const newItem = {
                $set: {
                    name: item.name,
                    category: item.category,
                    price: item.price,
                    recipe: item.recipe,
                    image: item.image
                }
            }
            const result = await menuCollection.updateOne(filter, newItem)
            res.send(result)
        })

        app.delete('/menu/:id', verify, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: id }
            const result = await menuCollection.deleteOne(filter)
            res.send(result)
        })

        app.get('/reviews', async (req, res) => {
            const result = await reviewCollection.find().toArray()
            res.send(result)
        })

        app.get('/cart', async (req, res) => {
            const user = req?.query?.email
            // console.log(user);
            const result = await cartCollection.find({ email: user }).toArray()
            res.send(result)
        })

        app.post('/addToCart', async (req, res) => {
            const cart = req.body
            const result = await cartCollection.insertOne(cart)
            res.send(result)
        })

        app.delete('/cart/:id', async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const result = await cartCollection.deleteOne(filter)
            res.send(result)
        })

        // Payment intent  & payment related
        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body
            const amount = (parseFloat(price) * 100)
            if (!amount) { return console.log("Zero amount"); }
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: 'usd',
                payment_method_types: ["card"],
            })
            res.send({
                clientSecret: paymentIntent.client_secret
            })
        })

        app.get('/payments/:email', verify, async (req, res) => {
            const filter = { email: req.params.email }
            if (req.params.email !== req.decoded.email) {
                return res.status(403).send({ message: "Forbidden access" })
            }

            const result = await paymentsCollection.find(filter).toArray()
            res.send(result)

        })

        app.post('/payments', async (req, res) => {
            const payment = req.body
            const paymentResult = await paymentsCollection.insertOne(payment)

            const filter = {
                _id: {
                    $in: payment.cartIDs.map(id => new ObjectId(id))
                }
            }
            const deleteResult = await cartCollection.deleteMany(filter)
            const messageData = {
                from: 'Excited User <me@samples.mailgun.org>',
                to: 'shahriyerfahim2012@gmail.com',
                subject: 'Hello',
                text: 'Testing some Mailgun awesomeness!',
                html: `
                <div>
                <h2>Thank yo for your order.</h2>
                <h4>Your Transaction id: ${payment.transactionId}</h4>
                </div>
                `
            };

            Aclient.messages.create(DOMAIN, messageData)
                .then((res) => {
                    console.log(res);
                })
                .catch((err) => {
                    console.error(err);
                });
            res.send({ paymentResult, deleteResult })

        })

        // Stats or analytics
        app.get('/admin-stats', verify, verifyAdmin, async (req, res) => {
            const users = await usersCollection.estimatedDocumentCount()
            const menuItems = await menuCollection.estimatedDocumentCount()
            const orders = await paymentsCollection.estimatedDocumentCount()
            const payments = await paymentsCollection.find().toArray()

            const sums = await paymentsCollection.aggregate([
                {
                    $group: {
                        _id: null,
                        price: { $sum: "$price" }
                    }
                }
            ]).toArray()

            const totalRevenue = sums.length > 0 ? sums[0].price : 0;

            console.log(totalRevenue);

            res.send({
                users,
                menuItems,
                orders,
                totalRevenue,
            })
        })


        // Using aggregate pipeline:
        app.get('/order-stats', verify, verifyAdmin, async (req, res) => {
            const result = await paymentsCollection.aggregate([
                { $unwind: '$menuIDs' },
                {
                    $lookup: {
                        from: 'Menu',
                        localField: 'menuIDs',
                        foreignField: '_id',
                        as: 'menuItem'
                    }
                },
                { $unwind: '$menuItem' },
                {
                    $group: {
                        _id: '$menuItem.category',
                        quantity: { $sum: 1 },
                        revenue: { $sum: "$menuItem.price" }
                    }
                },
                {
                    $project: {
                        _id: 0,
                        category: "$_id",
                        quantity: '$quantity',
                        revenue: '$revenue'
                    }
                }


            ]).toArray()

            res.send(result)
        })

        // await client.db("admin").command({ ping: 1 });
        // console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);



app.get('/', (req, res) => {
    res.send("Server runnign")
})

app.listen(port, () => {
    console.log('Bistro is runnign on port ', port);
})

