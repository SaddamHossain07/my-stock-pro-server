const express = require('express');
require('dotenv').config()
const cors = require('cors');
const jwt = require('jsonwebtoken')
const app = express()
const port = process.env.PORT || 5000

// middleware =======================
app.use(cors())
app.use(express.json())

// myStockPro
// FhJUtU1b3VMH4JOW


const { MongoClient, ServerApiVersion } = require('mongodb');
// const uri = "mongodb+srv://<username>:<password>@cluster0.0db2mvq.mongodb.net/?retryWrites=true&w=majority";
const uri = `mongodb+srv://${process.env.USER_ID}:${process.env.USER_PASS}@cluster0.0db2mvq.mongodb.net/?retryWrites=true&w=majority`;

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
        // Connect the client to the server	(optional starting in v4.7)
        // await client.connect();
        // Send a ping to confirm a successful connection

        // All collection goes here ========================================
        const userCollection = client.db('restaurantDB').collection('users')

        // jwt web token api ==================================
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        app.post('/users', async (req, res) => {
            const user = req.body
            const query = { email: user.email }
            const existingUser = await userCollection.findOne(query)
            if (existingUser) {
                return res.send({ message: 'The user is already registered.', insertedId: null })
            }
            const result = await userCollection.insertOne(user)
            res.send(result)
        })

        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


app.get('/', (req, res) => {
    res.send('server is running')
})

app.listen(port, (req, res) => {
    console.log(`The server is running on port : ${port}`)
})