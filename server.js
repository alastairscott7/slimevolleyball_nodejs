const http = require('http');
const express = require('express');
const socket = require('socket.io');

var app = express();
var server = http.createServer(app);
var io = socket(server);

app.use(express.static('public'));
var port = process.env.PORT || 3000;

server.listen(port);

var players = 0;
var slimeLeft;
var slimeRight;

/*app.get('/', function (req, res) {
    res.sendFile('/public/SlimeVolleyballLegacy.html');    
});*/

io.sockets.on('connection', newConnection);

function newConnection(socket) {
	var id = socket.id;
	
	players += 1;
    console.log("We have a new client: " + id);
	console.log("Players: " + players);
	
	socket.on('sendLeft',
        function(data) {
			slimeLeft = {
				x: data.x,
				y: data.y,
				velocityX: data.a,
				velocityY: data.b
			};
			console.log("Slime Left X: " + slimeLeft.x + " Y: " + slimeLeft.y);
			console.log("Slime Left Velocity X: " + slimeLeft.velocityX + " Y: " + slimeLeft.velocityY);
			socket.broadcast.emit('updateLeft', {x: data.x, y: data.y});
		}
	);
	
	socket.on('sendRight',
        function(data) {
			slimeRight = {
				x: data.x,
				y: data.y,
				velocityX: data.a,
				velocityY: data.b
			};
			console.log("Slime Right X: " + slimeRight.x + " Y: " + slimeRight.y);
			console.log("Slime Right Velocity X: " + slimeRight.velocityX + " Y: " + slimeRight.velocityY);
			socket.broadcast.emit('updateRight', {x: data.x, y: data.y});
		}
	);
	
	socket.on('disconnect', 
	    function() {
			players -= 1;
            console.log('Player disconnected! Players: ' + players);
		}
	);
	
	socket.emit('playerData', {id: id, playerNo: players});
	
    /*
    socket.on('mouse',
        function(data) {
			//Emit to connector
			//socket.emit('mouse', data);
			
			//Emit to everyone except connector
            socket.broadcast.emit('mouse', data);
			
            //Emit to everything including myself
            //io.sockets.emit('mouse', data);
			
            console.log(data);
        }
    );
	*/
}