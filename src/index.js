const express = require('express');
const app = express();
const axios = require('axios');
const util = require('./util/util');
const sql = require('./sql/sql');
const path = require('path');
const SocketIO = require('socket.io');
const moment = require('moment');
require("dotenv").config({ path: path.join(__dirname, '../.env') });
const AWS = require('aws-sdk');

const port = 5001;
const server = app.listen(port, () => {
    console.log('Listening on '+port);
});
const io = SocketIO(server, {path: '/chatting'});
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESS_KEY,
    secretAccessKey: process.env.AWS_SECRET_KEY,
    region: "ap-northeast-2",
});
// const dynamoDB = new AWS.DynamoDB({apiVersion: "2012-08-10"});
const dynamoDB = new AWS.DynamoDB.DocumentClient();
const table_name = "freemarket_chat";

// 회원정보
let users = {};

// 소켓 시작
io.on('connection', async (socket) => {
    // broadcasting a entering message to everyone who is in the chatroom
    console.log(socket.id, ' connected...');

    // 채팅방 접속
    socket.on('roomJoin', async (params) => {
        try {
            // 1. 로그인 유효성 체크. -> 실패시 disconnect
            let user_info = await sql.info(params.token);
            if (!util.isNull(user_info) || user_info.token !== params.token) {
                io.emit('msg', {type: "alarm", mssage: `로그인 정보가 만료되었습니다.`});
                delete users[socket.id];
            }
    
            // 2. 회원정보 저장
            users[socket.id] = {
                user_nick: user_info.user_nick,
                user_seq: user_info.user_seq,
                trl_seq: params.trl_seq,
                token: params.token
            }
    
            // 3. 채팅접속 [trl_seq] -> 채팅방 유효성체크
            let tradeCheck = await sql.checkRoomJoin(user_info.user_seq, params.trl_seq)
            if (!tradeCheck.success) {
                io.emit('msg', {type: "alarm", message: tradeCheck.data.message});
            }
    
            // 3. 채팅방 참가
            socket.join(`room_${params.trl_seq}`);
            socket.broadcast.to(`room_${params.trl_seq}`).emit('msg', {type: "alarm", message: `${users[socket.id]['user_nick']} 님이 연결되었습니다.`});
        } catch (e) {
            console.log(e)
        }
    });

    // 이전 채팅내역 조회
    socket.on('history', async (params) => {
        try {
            let history_limit_point = params.history_limit_point || 99999999999999999;

            // DynamoDB Connection
            dynamoDB.query({
                TableName: table_name,
                IndexName: "trl_seq-order_num-index",
                KeyConditionExpression: "trl_seq = :trl_seq and order_num < :order_num",
                ExpressionAttributeValues: {
                    ":trl_seq": params.trl_seq,
                    ":order_num": history_limit_point
                },
                Limit: params.limit,
                ScanIndexForward: false,
            }).promise().then(data => {
                // 이전 채팅내역. 내 글인지 아닌지 구분
                for (let i=0; i<data.Items.length; i++) {
                    if (data.Items[i]['user_seq'] === users[socket.id]['user_seq']) {
                        data.Items[i]['my'] = true
                    } else {
                        data.Items[i]['my'] = false;
                    }
                }

                console.log("Sorting")
                let result = [];
                for (let i=data.Items.length-1; i>=0; i--) {
                    if (data.Items[i]['user_seq'] === users[socket.id]['user_seq']) {
                        data.Items[i]['my'] = true
                    } else {
                        data.Items[i]['my'] = false;
                    }

                    result.push(data.Items[i]);
                }

                io.emit("history", result);
            }).catch(err => {
                console.log(`DynamoDB Select Err`)
            });
        } catch (e) {
            console.log(e)
        }
    });

  	// 메세지 전송
    socket.on('msg', async (params) => {
        try {
            // 혹시라도 서버가 재시작되서 users정보가 날아간 경우
            if (undefined === users[socket.id]) {
                let user_info = await sql.info(params.token);
                if (!util.isNull(user_info) || user_info.token !== params.token) {
                    users[socket.id] = {
                        user_nick: user_info.user_nick,
                        user_seq: user_info.user_seq,
                        trl_seq: params.trl_seq,
                        token: params.token
                    }
                } else {
                    return false;
                }
            }
    
            let n = moment().format("YYYY-MM-DD HH:mm:ss.SSS");
            let reg_dt = moment(n).format("YYYY-MM-DD HH:mm:ss");
            let order_num = parseInt(moment(n).format("YYYYMMDDHHmmssSSS"));
            let item = {
                chat_id: order_num,
                reg_dt: reg_dt,
                user_nick: users[socket.id]['user_nick'],
                trl_seq: users[socket.id]['trl_seq'],
                message : params.message,
                user_seq: users[socket.id]['user_seq'],
                order_num: order_num
            }
    
            dynamoDB.put({
                TableName: table_name,
                Item: item
            }, function (err, data) {
                if (err) {
                    socket.broadcast.to(`room_${users[socket.id]['trl_seq']}`).emit('msg', {type: "alarm", message: `메시지 전송에 실패하였습니다.`});
                } else {
                    let data = {
                        ...item,
                        token: params.token,
                        type: "message"
                    }
    
                    io.to(`room_${users[socket.id]['trl_seq']}`).emit('msg', data);
                }
            });
        } catch (e) {
            console.log(e)
        }
    });

    // 채팅방 나가기
    socket.on('disconnect', async (data) => {
        try {
            // 혹시라도 서버가 재시작되서 users정보가 날아간 경우
            if (undefined !== users[socket.id]) {
                // io.to(`room_${users[socket.id]['trl_seq']}`).emit('msg', {type: "alarm", message: `${users[socket.id]['user_nick']} 님의 연결이 종료되었습니다.`});
                delete users[socket.id];
            }
        
        } catch (e) {
            console.log(e)
        }
    });
});

// Chat TEST, JS
app.get('/:path', async (req, res, next) => {
    let path = req.params.path;

    // Page 
    if (path === "chat") {
        return res.sendFile(__dirname + '/client/chat.html');
    } else if (path === "chat2") {
        return res.sendFile(__dirname + '/client/chat2.html');
    }

    // js
    if (path === "socketio") {
        res.sendFile(__dirname + '/client/socket.io.min.js');
    } else if (path === "jquery") {
        res.sendFile(__dirname + '/client/jquery-3-6-1-min.js');
    }
});