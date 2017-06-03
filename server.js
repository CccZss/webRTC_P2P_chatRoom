var express = require('express');
var app = express();
var path = require("path")
var https = require('https'),
	fs = require("fs");

var options = {
    key: fs.readFileSync('./privatekey.pem'),
    cert: fs.readFileSync('./certificate.pem')
};
var server = require('https').createServer(options,app)
var SkyRTC = require('skyrtc').listen(server);

 
var port = process.env.PORT || 3000;
server.listen(port, function () {
  var host = server.address().address
  var port = server.address().port
  console.log("应用实例，访问地址为 http://%s:%s", host, port)
});

app.use(express.static(path.join(__dirname, 'public')));

app.get('/login', function(req, res) {
	res.sendfile(__dirname + '/public/login.html');
});

var users = {};

SkyRTC.rtc.on('new_connect', function(socket) {
   console.log("创建新连接");
})

SkyRTC.rtc.on('new_peer', function(socket, room) {
	console.log("新用户" + socket.id + "加入房间" + room);
});

SkyRTC.rtc.on('remove_peer', function(socketId) {
    if(users[socketId]) delete users[socketId]
	console.log(socketId + "用户离开");
});

//接收websocket信息
SkyRTC.rtc.on('socket_message', function(socket, msg) {
	var msg = JSON.parse(msg)
	// 登陆时发用户名过来
	if(msg.type==="login" && socket.room==='userPage'){
		users[socket.id] = msg.name 
		var data = {
			type: 'login_result',
			users: users
		}
		this.broadcastInRoom(socket.room, JSON.stringify(data), function(err){
			console.log("广播失败",err);
		})
	}else if(msg.type==="set_name" && socket.room !=='userPage'){
		var keys = Object.keys(users)
		keys.forEach(id =>{
			if(users[id]===msg.name){
				delete users[id]
			}
		})
		users[socket.id] = msg.name 
		var data = {
			type: 'set_name_result',
			users: users
		}
		this.broadcastInRoom(socket.room, JSON.stringify(data), function(err){
			console.log("广播失败",err);
		})
	}

	console.log("接收到来自" + socket.id + "的新消息：" + msg);
});

