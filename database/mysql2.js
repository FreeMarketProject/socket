const mysql = require('mysql2/promise')
const path = require('path')
require("dotenv").config({ path: path.join(__dirname, '../.env') })

const HOST = process.env.MYSQL_HOST
const PORT = process.env.MYSQL_PORT
const DATABASE = process.env.MYSQL_DATABASE
const USER = process.env.MYSQL_ID
const PASSWORD = process.env.MYSQL_PASSWORD

module.exports = mysql.createPool({
    host: HOST,
    user: USER,
    port: PORT,
    password: PASSWORD,
    database: DATABASE,
    connectTimeout: 10000,
    connectionLimit: 50
});