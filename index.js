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


const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
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
        const userCollection = client.db('myStockDb').collection('users')
        const shopCollection = client.db('myStockDb').collection('shops')
        const productCollection = client.db('myStockDb').collection('products')
        const cartCollection = client.db('myStockDb').collection('carts')
        const saleCollection = client.db('myStockDb').collection('sales')

        // jwt web token api ==================================
        app.post('/jwt', async (req, res) => {
            const user = req.body
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' })
            res.send({ token })
        })

        const verifyToken = (req, res, next) => {
            if (!req.headers.authorization) {
                return res.status(401).send({ message: 'unauthorized access' })
            }
            const token = req.headers.authorization.split(' ')[1]
            jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {
                if (err) {
                    return res.status(401).send({ message: 'unauthorized access' })
                }
                req.decoded = decoded
                next()
            })
        }

        const verifyAdmin = async (req, res, next) => {
            const email = req.decoded.email
            const query = { email: email }
            const user = await userCollection.findOne(query)
            const isAdmin = user?.role === 'admin'
            if (!isAdmin) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            next()
        }

        // user collection api =================================
        app.get('/users', verifyToken, verifyAdmin, async (req, res) => {
            const result = await userCollection.find().toArray()
            res.send(result)
        })

        app.get('/users/admin/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            if (email !== req.decoded.email) {
                return res.status(403).send({ message: 'forbidden access' })
            }
            const query = { email: email }
            const user = await userCollection.findOne(query)
            let admin = false
            if (user) {
                admin = user?.role === 'admin'
            }
            res.send({ admin })
        })

        app.get('/users/:email', verifyToken, async (req, res) => {
            const query = { email: req.params.email }
            const result = await userCollection.findOne(query)
            res.send(result)
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

        app.delete('/users/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await userCollection.deleteOne(query)
            res.send(result)
        })

        app.patch('/users/admin/:id', verifyToken, verifyAdmin, async (req, res) => {
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await userCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        // shop collection ================================
        app.get('/shops/:email', async (req, res) => {
            const query = { ownerEmail: req.params.email }
            const result = await shopCollection.findOne(query)
            res.send(result)
        })

        app.post('/shops', verifyToken, async (req, res) => {
            const shop = req.body;
            const result = await shopCollection.insertOne(shop);

            // Update the user with shop information
            const { insertedId } = result;
            const userEmail = shop.ownerEmail;
            await userCollection.updateOne(
                { email: userEmail },
                {
                    $set: {
                        role: 'manager',
                        shopId: insertedId,
                        shopName: shop.shopName,
                        shopLogo: shop.shopLogo
                    }
                }
            );

            res.send(result);
        });

        // products collection api ====================================
        app.get('/products', async (req, res) => {
            const result = await productCollection.find().toArray()
            res.send(result)
        })

        app.get('/products/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { shopManager: email }
            const result = await productCollection.find(query).toArray()
            res.send(result)
        })

        // app.post('/products/:id', verifyToken, async (req, res) => {
        //     const id = req.params.id
        //     const query = { _id: new ObjectId(id) }
        //     const result = await productCollection.findOne(query)
        //     res.send(result)
        // })
        app.post('/products', verifyToken, async (req, res) => {
            const product = req.body
            const shopId = product.shopId
            const query = { shopId: shopId }

            const existingProducts = await productCollection.find(query).toArray();
            if (existingProducts.length >= 3) {
                return res.send({ message: 'product limit crossed' })
            }

            const result = await productCollection.insertOne(product)
            res.send(result)
        })

        app.patch('/products/update/:id', verifyToken, async (req, res) => {
            const item = req.body
            const id = req.params.id
            const filter = { _id: new ObjectId(id) }
            const updatedDoc = {
                $set: {
                    name: item.name,
                    quantity: item.quantity,
                    buyingPrice: item.buyingPrice,
                    profitMargin: item.profitMargin,
                    discount: item.discount,
                    location: item.location,
                    description: item.description,
                    image: item.image
                }
            }

            const result = await productCollection.updateOne(filter, updatedDoc)
            res.send(result)
        })

        app.delete('/products/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: new ObjectId(id) }
            const result = await productCollection.deleteOne(query)
            res.send(result)
        })


        // carts and checkout functionalities ====================
        app.get('/carts/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { shopManager: email }
            const result = await cartCollection.find(query).toArray()
            res.send(result)
        })

        app.post('/carts', verifyToken, async (req, res) => {
            const item = req.body
            const result = await cartCollection.insertOne(item)
            res.send(result)
        })

        app.delete('/carts/:id', verifyToken, async (req, res) => {
            const id = req.params.id
            const query = { _id: id }
            const result = await cartCollection.deleteOne(query)
            res.send(result)
        })

        // sales collection ==================================
        app.get('/sales/:email', verifyToken, async (req, res) => {
            const email = req.params.email
            const query = { shopManager: email }
            const result = await saleCollection.find(query).toArray()
            res.send(result)
        })

        app.get('/sales', async (req, res) => {
            const result = await saleCollection.aggregate([
                {
                    $sort: { salesDate: -1 }
                },
                {
                    $unwind: '$cartProductIds'
                },
                {
                    $lookup: {
                        from: 'products',
                        localField: 'shopManager',
                        foreignField: 'shopManager',
                        as: 'cartProducts'
                    }
                },
                {
                    $unwind: '$cartProducts'
                },
                {
                    $group: {
                        _id: '$cartProducts.shopManager',
                        buyingPrice: { $sum: '$cartProducts.buyingPrice' },
                        sellingPrice: { $sum: '$cartProducts.sellingPrice' },

                    }
                },
                {
                    $project: {
                        _id: 0,
                        buyingPrice: '$buyingPrice',
                        sellingPrice: '$sellingPrice',
                    }
                }

            ]).toArray()
            res.send(result)
        })

        app.post('/sales', verifyToken, async (req, res) => {
            const sales = req.body
            const salesResult = await saleCollection.insertOne(sales)

            // Increase the sales count and decrease the quantity of that product
            const filter = {
                _id: {
                    $in: sales.cartProductIds.map(id => new ObjectId(id))
                }
            };
            const updateDoc = {
                $inc: {
                    saleCount: 1,
                    quantity: -1
                }
            };
            const productResult = await productCollection.updateMany(filter, updateDoc)

            // clear the carts data after get paid
            const query = {
                _id: {
                    $in: sales.cartIds.map(id => new ObjectId(id))
                }
            }
            const deleteResult = await cartCollection.deleteMany(query)

            const safeSalesResult = JSON.stringify(salesResult, getCircularReplacer());
            const safeProductResult = JSON.stringify(productResult, getCircularReplacer());
            res.send({ salesResult: safeSalesResult, deleteResult, productResult: safeProductResult });

        })


        // Helper function to handle circular structures
        function getCircularReplacer() {
            const seen = new WeakSet();
            return (key, value) => {
                if (typeof value === "object" && value !== null) {
                    if (seen.has(value)) {
                        return "[Circular Reference]";
                    }
                    seen.add(value);
                }
                return value;
            };
        }
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