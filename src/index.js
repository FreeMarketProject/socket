const express = require('express');
const app = express();
const axios = require('axios');
const port = 5001;
const util = require('./util/util');
const sql = require('./sql/sql');
const server = app.listen(port, () => {
    console.log('Listening on '+port);
});

const path = require('path')
require("dotenv").config({ path: path.join(__dirname, '../.env') })

const SocketIO = require('socket.io');
const io = SocketIO(server, {path: '/chatting'});

// 회원정보
let users = {

}

io.on('connection', async (socket) => {
    // broadcasting a entering message to everyone who is in the chatroom
    console.log(socket.id, ' connected...');

    // 채팅방 접속
    socket.on('roomJoin', async (params) => {
        // 1. 로그인 유효성 체크. -> 실패시 disconnect
        let user_info = await sql.info(params.token);
        if (!util.isNull(user_info) || user_info.token !== params.token) {
            io.emit('msg', `로그인 정보가 만료되었습니다.`);
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
            io.emit('msg', tradeCheck.data.message);
        }

        // 3. 채팅방 참가
        socket.join(`room_${params.trl_seq}`);
        socket.broadcast.to(`room_${params.trl_seq}`).emit('msg', `${users[socket.id]['user_nick']} 님이 연결되었습니다.`);
    });

  	// 메세지 전송
    socket.on('msg', async (params) => {
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

        socket.broadcast.emit("msg", `${users[socket.id]['user_nick']}: ${params.message}`);
    });

    // 채팅방 나가기
    socket.on('disconnect', async (data) => {
        // 혹시라도 서버가 재시작되서 users정보가 날아간 경우
        if (undefined !== users[socket.id]) {
            io.to(`room_${users[socket.id]['trl_seq']}`).emit('msg', `${users[socket.id]['user_nick']} 님의 연결이 종료되었습니다.`);
            delete users[socket.id];
        }
    });
});

app.get('/chat', async (req, res) => {
    res.sendFile(__dirname + '/client/chat.html');
});

app.get('/chat2', async (req, res) => {
    res.sendFile(__dirname + '/client/chat2.html');
});

// 클라이언트 + js
app.get('/socketio', async (req, res) => {
    res.sendFile(__dirname + '/client/socket.io.min.js');
});

// 클라이언트 + js
app.get('/jquery', async (req, res) => {
    res.sendFile(__dirname + '/client/jquery-3-6-1-min.js');
});