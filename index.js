const express = require('express');
const ObjectId = require('mongodb').ObjectId;
const app = express();
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const user = process.env.DB_USER;
const password = process.env.DB_PASS;


const uri = `mongodb+srv://${user}:${password}@cluster0.9s5sc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });

async function run() {
    try {
        await client.connect();

        const database = client.db('productsDB');
        const productsCollection = database.collection('products');

        // get products depending on page number
        app.get('/', async (req, res) => {
            const cursor = productsCollection.find({}); // all products
            const totalProducts = await cursor.count(); // number of products

            const page = parseInt(req.query.page) || 0; // page number
            // number of products in each page
            const itemsOnPage = parseInt(req.query.itemsOnPage) || totalProducts;
            const totalPage = Math.ceil(totalProducts / itemsOnPage); // total page number

            // arrange products depending on page number
            const products = await cursor.skip(page * itemsOnPage).limit(itemsOnPage).toArray();
            res.send({ products, totalPage });
        })

        // add product to DB
        app.post('/products/add', async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.json(result);
        })

        // get single product details
        app.get('/product/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const product = await productsCollection.findOne(query);
            res.send(product);
        })

        // update product info
        app.post('/product/update/:id', async (req, res) => {
            const id = req.params.id;
            const updatedProduct = req.body;
            const query = { _id: ObjectId(id) };
            const updateDoc = {
                $set: { ...updatedProduct }
            }
            const options = { upsert: true };
            const result = await productsCollection.updateOne(query, updateDoc, options);
            res.json(result)
        })

        // search products by product name
        app.get('/products/search', async (req, res) => {
            const searchText = req.query.name; // searched name
            const page = parseInt(req.query.page) || 0; // page number

            // all products
            const cursor = await productsCollection.find({}).toArray();
            // filter products by name
            const result = cursor.filter(product => product.name.toLowerCase().includes(searchText));

            const totalProducts = result.length; // number of filtered products
            const itemsOnPage = parseInt(req.query.itemsOnPage) || totalProducts;
            const totalPage = Math.ceil(totalProducts / itemsOnPage);

            // arrange products depending on page number
            const products = result.slice(page * itemsOnPage, (page + 1) * itemsOnPage);
            res.send({ products, totalPage });
        })

        // get products by id for cart items
        app.post('/products/byID', async (req, res) => {
            const productIDs = req.body;
            const filter = { _id: { $in: productIDs.map(id => ObjectId(id)) } };
            const result = await productsCollection.find(filter).toArray();
            res.json(result);
        })

    } finally { }
}

run().catch(console.dir);

app.listen(port, () => console.log('listening to port', port));
