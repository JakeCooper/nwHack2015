var express = require('express')
, app = express()
, http = require('http')
, server = http.createServer(app)
, io = require('socket.io').listen(server);

var db = require('orchestrate')('f3258a30-bca3-4567-9e60-d05422f4745f');

server.listen(80, function(){
	var host = server.address().address;
	var port = server.address().port;

	console.log('Locale webserver launched at http://%s:%s', host, port);
});

app.use(express.static(__dirname + '/public'));


app.get('', function (req, res) {
	//Loads index file.
	res.sendFile(__dirname + '/locale.html');
});

// 
// ROUTING
//
app.post('/api/user_auth', function (req, res){

	var user = {
		email: req.body.email,
		name: req.body.name,
		fbToken: req.body.fbToken,
		location: {
			lat: req.body.location.lat,
			long: req.body.location.long,
		}
	};

	db.put('users', user.email, user).then(function (result) {
		return res.send(user);
	});
});

app.get('/privacy', function (req, res) {
	//Loads index file.
	res.sendFile(__dirname + '/privacy.html');
});

/*
 * Open the main chat connection page
 */
app.get('/chat_connect', function (req, res) {
	connectToRoom = req.query.room_id;
	res.sendFile(__dirname + '/index.html');
});

app.get('/add_room', function(req, res){
	var name = req.query.name;
	World.addRoom(name, function(err, response){
		res.send(response);
	});

});

app.get('/main', function(req, res){
	res.sendFile(__dirname + '/main.html');
});

//
// "SUPERGLOBALS"
//
var World = require("./Model/world.js");
var world = new World(db);

var worldRooms = null;

// users connected to each room
var userCounts = [];

var roomNames = null;

io.sockets.on('connection', function (socket) {

	// When the client emits 'join', this listens and executes
	socket.on('join', function(user){

		var newUser = JSON.parse(user);
	
		// TODO: Create or update the user's db entry
		//console.log(newUser);

		// Store the username in the socket session for this client
		socket.username = newUser.firstName;
		socket.user = newUser;

		// Calculate the active rooms for this user and push them
		world.getValidRooms(newUser.location.lat, newUser.location.lon, function(worldRooms) {
			updateRooms(worldRooms);
		});
	});

	// listener, client asks for updaterooms, server sends back the list of rooms
	socket.on('updaterooms', function (data) {
		// Calculate the active rooms for this user and push them
		world.getValidRooms(userRoom.location.lat, userRoom.location.lon, function(worldRooms) {
			updateRooms(worldRooms);
		});
	})
	
	// when the client emits 'sendchat', this listens and executes
	socket.on('sendchat', function (room, message) {
		var persistedMessage = {
			"room": room,
			"firstName": socket.user.firstName,
			"lastInitial": socket.user.lastName.charAt(0),
			"message": message
		};

		world.persistMessage(persistedMessage);

		io.sockets.in(room).emit('broadcastchat', persistedMessage);
	});
	
	socket.on('switchRoom', function(newroom){
		switchRoom(socket, newroom);
	});

	socket.on('joinroom', function(room){
		socket.join(room);

		userCounts[room]++;

		world.getRoomHistory(room, function(messages) {
			socket.emit('loadroom', {"room": room, "messages": messages});
		})

		var joinedMsg = {
			"room": room,
			"firstName": socket.user.firstName,
			"lastInitial": socket.user.lastName.charAt(0),
			"message": "has joined the Locale"
		};

		io.sockets.in(room).emit('broadcastchat', joinedMsg);
		// TODO: Add user to the list of people in the room
	});

	// listen to users leaving rooms
	socket.on('leaveroom', function(room){
		socket.leave(room);

		userCounts[room]--;

		var joinedMsg = {
			"room": room,
			"firstName": undefined,
			"lastInitial": undefined,
			"message": socket.user.firstName + " " + socket.user.lastName.charAt(0) + ". has left the Locale (" + userCounts[room] + " user(s) left)"
		};

		io.sockets.in(room).emit('broadcastchat', joinedMsg);
	});
	

	socket.on('disconnect', function(){
		// remove the username from global usernames list
		//delete usernames[socket.username];
		// update list of users in chat, client-side
		//io.sockets.emit('updateusers', usernames);
		// echo globally that this client has left
		socket.broadcast.emit('updatechat', 'SERVER', socket.username + ' has disconnected');
		socket.leave(socket.room);
	});

});

function switchRoom(socket, newroom){
	socket.leave(socket.room);

	// sent message to OLD room
	socket.broadcast.to(socket.room).emit('updatechat', 'SERVER', socket.username+' has left this room');
	// update socket session room title
	socket.room = newroom;
	socket.broadcast.to(newroom).emit('updatechat', 'SERVER', socket.username+' has joined this room');
	
	// Calculate the new active rooms for this user and push them
	world.getValidRooms(socket.user.location.lat, socket.user.location.lon, function(worldRooms) {
		updateRooms(worldRooms);
	});
}

function updateRooms(rooms) {
	var usersRooms = rooms.map(function(obj){ 
		if (!userCounts[obj.name]) {
			obj["users"] = 0
		} else {
			obj["users"] = userCounts[obj.name];
		}
		return obj;
	});

	console.log(usersRooms);

	socket.emit('updaterooms', usersRooms);
}