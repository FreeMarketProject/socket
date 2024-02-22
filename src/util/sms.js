const path = require('path');
require("dotenv").config({ path: path.join(__dirname, '.env') });
const AWS = require('aws-sdk');
const SESConfig = {
    apiVersion: "2010-12-01",
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: "ap-northeast-1",
}
AWS.config.update(SESConfig);
let sns = new AWS.SNS();

// SMS 보내기
module.exports.sendSMS = (to_number, message, cb) => {
    sns.publish({
        Message: message,
        Subject: 'Admin',
        PhoneNumber:to_number
    }, cb);
}