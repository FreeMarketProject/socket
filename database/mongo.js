const { MongoClient } = require('mongodb')
const path = require('path')
require("dotenv").config({ path: path.join(__dirname, '../.env') })

const HOST = process.env.MONGO_HOST
const PORT = process.env.MONGO_PORT

module.exports = new MongoClient(`mongodb://${HOST}:${PORT}`);
