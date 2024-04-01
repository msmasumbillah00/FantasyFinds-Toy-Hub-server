const express = require('express')
const app = express()
const port = process.env.PORT || 5000;
var jwt = require('jsonwebtoken');
require('dotenv').config()
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');


app.use(cors({
    origin: '*', // Allow requests from this origin
    // You can also set other CORS options here if needed
}));
app.use(express.json());



const uri = `mongodb+srv://${process.env.user_name}:${process.env.user_password}@cluster0.pf0bweu.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});
const verifyJWT = (req, res, next) => {
    const authoration = req.headers.authorization;
    if (!authoration) {
        res.status(401).send({ error: true, message: "Unauthorized user" });
    }
    const token = authoration.split(" ")[1];
    jwt.verify(token, process.env.jwt_token, (error, decoded) => {
        if (error) {
            res.status(403).send({ error: true, message: "Unauthorized user" });
        }
        req.decoded = decoded;
        next();
    })
    // console.log(token)
}

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        client.connect();

        const catagoriColloction = await client.db("fantasyFindsToyHub").collection("toyCatagories");
        const productsColloction = await client.db("fantasyFindsToyHub").collection("toyProducts");
        const ordersColloction = await client.db("fantasyFindsToyHub").collection("toyOrders");
        const chartColloction = await client.db("fantasyFindsToyHub").collection("myToyes");


        app.post("/jwt", (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.jwt_token, { expiresIn: "1d" })
            // console.log(token)
            res.send(JSON.stringify(token))

        })

        app.get('/catagories', async (req, res) => {
            const cursor = catagoriColloction.find();
            const result = await cursor.toArray();
            res.send(result)

        })
        app.post('/products', async (req, res) => {
            // console.log(req.body)
            const result = await productsColloction.insertOne(req.body);
            res.send(result)

        })
        app.get('/products', async (req, res) => {
            const page = Number(req.query.page) || 0;
            const limit = Number(req.query.limit) || 12;
            const skip = (page - 1) * limit;
            console.log(skip)
            const query = {};
            const option = {
                projection: { title: 1, image: 1, price: 1, rating: 1 },
            }
            const cursor = productsColloction.find(query, option).skip(skip).limit(limit);
            const result = await cursor.toArray();
            res.send(result)

        })

        app.get('/search', async (req, res) => {
            const query = req.query.word.split(" ");

            const orConditions = query.map(word => ({
                $or: [
                    { group: { $elemMatch: { $regex: word, $options: 'i' } } },
                    { colors_family: { $elemMatch: { $regex: word, $options: 'i' } } },
                    { title: { $regex: word, $options: 'i' } },
                    { discrip: { $regex: word, $options: 'i' } }
                ]
            }));
            const cursor = productsColloction.find({ $or: orConditions });
            const results = await cursor.toArray()
            // console.log(results)
            res.send(results);

        })

        app.get("/products/:Id", async (req, res) => {
            const query = { _id: new ObjectId(req.params.Id) }
            const result = await productsColloction.findOne(query);
            res.send(result)
        })

        app.post("/myToys", async (req, res) => {
            const doc = req.body;
            let result = await chartColloction.insertMany(doc)
            res.send(result)

        });
        app.get("/myToys", verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            // console.log("comebac after verify", decoded)
            // console.log(req.headers.authorization)

            if (decoded.uid !== req.query.user) {
                res.status(403).send({ error: true, message: "Unauthorized user" });

            }
            const query = { "user.uid": req.query.user };
            const result = await chartColloction.find(query).toArray();
            res.send(result)

            // console.log(result)
        });
        app.put("/myToys/:id", async (req, res) => {
            const filter = { _id: new ObjectId(req.params.id) };
            const options = { upsert: true };
            const updateDoc = {
                $set: {
                    quntity: req.body.quntity
                },
            };
            const result = await chartColloction.updateOne(filter, updateDoc, options);
            // console.log(result)

        });
        app.delete("/myToys", async (req, res) => {
            const query = { _id: new ObjectId(req.query.id) };
            console.log(query)
            const result = await chartColloction.deleteOne(query);
            // console.log(result)
        });
        app.post("/checkoutProducts", async (req, res) => {
            // console.log(req.body)
            const arrayOfIds = req.body.map(ele => ele.title);
            const result = await productsColloction.find({ title: { $in: arrayOfIds } }).toArray();
            // console.log(result)
            res.send(result)

        });

        app.get("/orders", verifyJWT, async (req, res) => {
            const decoded = req.decoded;
            // console.log(decoded)
            // console.log("comebac after verify", decoded)
            // console.log(req.headers.authorization)

            if (decoded.uid !== req.query.user) {
                res.status(403).send({ error: true, message: "Unauthorized user" });

            }
            const query = { "user.uid": req.query.user };
            const result = await ordersColloction.find(query).toArray();
            res.send(result)

            // console.log(result)
        });
        app.post("/orders", async (req, res) => {
            const doc = req.body;
            let result = await ordersColloction.insertMany(doc)
            res.send(result)

        });
        app.delete("/orders", async (req, res) => {
            const query = { _id: new ObjectId(req.query.id) };
            // console.log(query)
            const result = await ordersColloction.deleteOne(query);
            res.send(result)
        });
        app.get("/orders/:id", async (req, res) => {
            const query = { _id: new ObjectId(req.params.id) };
            const result = await ordersColloction.findOne(query);
            res.send(result)

            // console.log(result)
        });

        app.get('/allproducts', async (req, res) => {

            const cursor = productsColloction.find();
            const result = await cursor.toArray();
            res.send(result)

        })
        app.get('/catagories/:id', async (req, res) => {
            // console.log(req.params.id);
            const catagoriquary = { _id: new ObjectId(req.params.id) }
            const catagoriDetails = await catagoriColloction.findOne(catagoriquary);


            const query = { catagori_id: req.params.id };
            const option = {
                projection: { title: 1, image: 1, price: 1, rating: 1 },
            }
            const cursor = productsColloction.find(query, option);
            const result = await cursor.toArray();
            res.send({ result, catagoriDetails })

        })





        app.get('/', (req, res) => {
            res.send("running my foot")
        })
        app.get('/masum', (req, res) => {
            res.send("running masum")
        })







        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);




app.listen(port, () => {
    console.log(`Example app listening on port ${port}`)
})