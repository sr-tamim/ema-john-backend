const express = require('express');
const ObjectId = require('mongodb').ObjectId;
const app = express();
const { MongoClient } = require('mongodb');
require('dotenv').config();
const cors = require('cors');
const port = process.env.PORT || 5000;

// middlewares
app.use(cors());
app.use(express.json());
const router = express.Router()

router.get('/', (_, res) => res.send(`Ema-John server is ready on port ${port}`));

const user = process.env.DB_USER;
const password = process.env.DB_PASS;


const uri = `mongodb+srv://${user}:${password}@cluster0.9s5sc.mongodb.net/myFirstDatabase?retryWrites=true&w=majority`;

const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true });


// get products depending on page number
router.get('/products', async (req, res) => {
    // connect mongodb client
    (client?.topology?.isConnected() || await client.connect())

    // products collection in database
    const productsCollection = client.db('productsDB').collection('products');

    const cursor = productsCollection.find({}); // all products
    const totalProducts = await cursor.count(); // number of products

    const page = parseInt(req.query.page) || 0; // page number
    // number of products in each page
    const itemsOnPage = parseInt(req.query.itemsOnPage) || totalProducts;
    const totalPage = Math.ceil(totalProducts / itemsOnPage); // total page number

    // arrange products depending on page number
    const products = await cursor.skip(page * itemsOnPage).limit(itemsOnPage).toArray();
    res.json({ products, totalPage });
})

// add product to DB
router.post('/add-product', async (req, res) => {
    // connect mongodb client
    (client?.topology?.isConnected() || await client.connect())

    // products collection in database
    const productsCollection = client.db('productsDB').collection('products');

    const product = req.body;
    const result = await productsCollection.insertOne(product);
    res.json(result);
})

// get single product details
router.get('/product-info/:id', async (req, res) => {
    // connect mongodb client
    (client?.topology?.isConnected() || await client.connect())

    // products collection in database
    const productsCollection = client.db('productsDB').collection('products');

    const id = req.params.id;
    const query = { _id: ObjectId(id) };
    const product = await productsCollection.findOne(query);
    res.json(product);
})

// update product info
router.post('/update-product/:id', async (req, res) => {
    // connect mongodb client
    (client?.topology?.isConnected() || await client.connect())

    // products collection in database
    const productsCollection = client.db('productsDB').collection('products');

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
router.get('/product-search', async (req, res) => {
    // connect mongodb client
    (client?.topology?.isConnected() || await client.connect())

    // products collection in database
    const productsCollection = client.db('productsDB').collection('products');

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
    res.json({ products, totalPage });
})

// get multiple products by id array for cart items
router.post('/multiple-products', async (req, res) => {
    // connect mongodb client
    (client?.topology?.isConnected() || await client.connect())

    // products collection in database
    const productsCollection = client.db('productsDB').collection('products');

    const productIDs = req.body;
    const filter = { _id: { $in: productIDs.map(id => ObjectId(id)) } };
    const result = await productsCollection.find(filter).toArray();
    res.json(result);
})


/* ===== setup backend to deploy as a netlify serverless function ====== */
// netlify serverless function
const path = require('path');
const serverless = require('serverless-http');
app.use('/.netlify/functions/server', router);  // path must route to lambda
app.use('/', (req, res) => res.sendFile(path.join(__dirname, './index.html')));

module.exports = app;
module.exports.handler = serverless(app);
