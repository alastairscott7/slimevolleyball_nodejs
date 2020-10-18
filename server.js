const http = require('http');
const express = require('express');
const socket = require('socket.io');

var app = express();
var server = http.createServer(app);
var io = socket(server, {path: '/game/socket.io'});

app.use(express.static('public'));
var port = process.env.PORT || 3000;

server.listen(port);

var players = 0;
var slimeLeft = {x: 200, y: 0, velocityX: 0, velocityY: 0, radius: 100};
var slimeRight = {x: 800, y: 0, velocityX: 0, velocityY: 0, radius: 100};
var ball = {x: 200, y: 356, velocityX: 0, velocityY: 0, radius: 25};
var leftWon = false;
var slimeLeftScore = 0;
var slimeRightScore = 0;
var loopCount = 0;

var FUDGE = 5;
var MAX_VELOCITY_X = 15;
var MAX_VELOCITY_Y = 22;
var pointScored = false;

app.get('/game', function (req, res) {
    res.sendFile(__dirname + '/public/index.html');    
});

function collisionBallSlime(s) {
	console.log("collision check");
	var dx = 2 * (ball.x - s.x);
	var dy = ball.y - s.y;
	var dist = Math.trunc(Math.sqrt(dx * dx + dy * dy));

	var dVelocityX = ball.velocityX - s.velocityX;
	var dVelocityY = ball.velocityY - s.velocityY;

	if(dy > 0 && dist < ball.radius + s.radius && dist > FUDGE) {
		var oldBall = {x:ball.x,y:ball.y,velocityX:ball.velocityX,velocityY:ball.velocityY};

		ball.x = s.x + Math.trunc(Math.trunc((s.radius + ball.radius) / 2) * dx / dist);
		ball.y = s.y + Math.trunc((s.radius + ball.radius) * dy / dist);

		var something = Math.trunc((dx * dVelocityX + dy * dVelocityY) / dist);

		if(something <= 0) {
			ball.velocityX += Math.trunc(s.velocityX - 2 * dx * something / dist);
			ball.velocityY += Math.trunc(s.velocityY - 2 * dy * something / dist);
			if(     ball.velocityX < -MAX_VELOCITY_X) ball.velocityX = -MAX_VELOCITY_X;
			else if(ball.velocityX >  MAX_VELOCITY_X) ball.velocityX =  MAX_VELOCITY_X;
			if(     ball.velocityY < -MAX_VELOCITY_Y) ball.velocityY = -MAX_VELOCITY_Y;
			else if(ball.velocityY >  MAX_VELOCITY_Y) ball.velocityY =  MAX_VELOCITY_Y;
		}
	}
}

function updateBall() {
	ball.velocityY += -1; // gravity
    if(ball.velocityY < -MAX_VELOCITY_Y) {
      ball.velocityY = -MAX_VELOCITY_Y;
    }

    ball.x += ball.velocityX;
    ball.y += ball.velocityY;

    collisionBallSlime(slimeLeft);
    collisionBallSlime(slimeRight);

    // handle wall hits
    if (ball.x < 15) {
      ball.x = 15;
      ball.velocityX = -ball.velocityX;
    } else if(ball.x > 985){
      ball.x = 985;
      ball.velocityX = -ball.velocityX;
    }
    // hits the post
    if (ball.x > 480 && ball.x < 520 && ball.y < 140) {
      // bounces off top of net
      if (ball.velocityY < 0 && ball.y > 130) {
        ball.velocityY *= -1;
        ball.y = 130;
      } else if (ball.x < 500) { // hits side of net
        ball.x = 480;
        ball.velocityX = ball.velocityX >= 0 ? -ball.velocityX : ball.velocityX;
      } else {
        ball.x = 520;
        ball.velocityX = ball.velocityX <= 0 ? -ball.velocityX : ball.velocityX;
      }
    }
	if(ball.y < 0) {
      if(ball.x > 500) {
        leftWon = true;
        slimeLeftScore++;
      } else {
        leftWon = false;
        slimeRightScore++;
      }
      return true;
    }
	return false;
}

function serverLoop() {
	if (updateBall()) {
	    pointScored = true;
		ball.y = 100000;
		ball.velocityY = 0;
	}
	else {
		pointScored = false;
	}
	loopCount++;
	//console.log("BALL X: " + ball.x + " Y: " + ball.y);
	//xr: slimeRight.x, yr: slimeRight.y, xl: slimeLeft.x, yl: slimeLeft.y
	if ((loopCount % 10 == 0) || (pointScored == true)) {
		io.sockets.emit('update', {ps: pointScored, bx: ball.x, by: ball.y, abx: ball.velocityX, aby: ball.velocityY, lw: leftWon, ls: slimeLeftScore, rs: slimeRightScore, xr: slimeRight.x, yr: slimeRight.y, xl: slimeLeft.x, yl: slimeLeft.y, axr: slimeRight.velocityX, ayr: slimeRight.velocityY, axl: slimeLeft.velocityX, ayl: slimeLeft.velocityY});
	    if (pointScored == true) {
			pointScored = false;
		}
	}
}

io.sockets.on('connection', newConnection);

function newConnection(socket) {
	var id = socket.id;
	
	if (players == 0) {
		setInterval(serverLoop, 20);
	}
	players += 1;
    console.log("We have a new client: " + id);
	console.log("Players: " + players);
	
	socket.on('sendLeft',
        function(data) {
			slimeLeft = {
				x: data.x,
				y: data.y,
				velocityX: data.a,
				velocityY: data.b,
				radius: 100
			};
			//console.log("Slime Left X: " + slimeLeft.x + " Y: " + slimeLeft.y);
			//console.log("Slime Left Velocity X: " + slimeLeft.velocityX + " Y: " + slimeLeft.velocityY);
		}
	);
	
	socket.on('sendRight',
        function(data) {
			slimeRight = {
				x: data.x,
				y: data.y,
				velocityX: data.a,
				velocityY: data.b,
				radius: 100
			};
			//console.log("Slime Right X: " + slimeRight.x + " Y: " + slimeRight.y);
			//console.log("Slime Right Velocity X: " + slimeRight.velocityX + " Y: " + slimeRight.velocityY);
		}
	);
	
	socket.on('initRound',
		function(data) {
			ball.x = data.s ? 200 : 800;
			ball.y = 356
			ball.velocityX = 0;
            ball.velocityY = 0;
			console.log("Reset Round");
			setTimeout(serverLoop, 700);
		}
	);
	
	socket.on('reset', 
	    function() {
			ball.x = 200;
			ball.y = 356
			ball.velocityX = 0;
            ball.velocityY = 0;
			leftWon = false;
            slimeLeftScore = 0;
            slimeRightScore = 0;
		}
	);
	
	socket.on('disconnect', 
	    function() {
			//Need to end game if player 1 or 2 disconnects -> save socket id and check who leaves
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