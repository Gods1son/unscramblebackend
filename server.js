let express = require('express'),
path = require('path');
var cors = require("cors");
var app = express();
app.use(cors()); 
var port = process.env.PORT || 3000;
//var server = require('http').createServer();
var pg = require('pg');
var thesaurus = require("thesaurus");
var http = require('http');
//var checkWord = require('check-word'),
// words = checkWord('en');


 const { Pool, Client } = require('pg');
//db con string


const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
    ssl:true
})

pool.on('error', (err, client) => {
  console.error('Unexpected error on idle client', err) // your callback here
  process.exit(-1)
})


//server.listen(port);
/*io.configure(function () {
  io.set("transports", ["xhr-polling"]);
  io.set("polling duration", 10);
});*/
app.use(express.static('public'));

 app.get('/', function(req, res, next) {
	res.render('index'); 
 })

  app.get('/db', function(req, res, next) {
  	//res.sendFile(__dirname + '/public/index.html');
	  var connectionString = "";
	pg.connect(connectionString, function(err, client, done) {
	   client.query('SELECT * FROM users', function(err, result) {
	      if(err) return console.error(err);   
		done();
	      console.log(result.rows);
		   //res.json({ data: result.rows });
		   //socket.emit('welcomeHere', username, result.rows);
		//res.render('db', {data : result.rows});
	   });
	});
	  res.render('db');
  });

var usernamesList = {};
var userScores = {};

function findOnline(userK, denied){
    var user;
   Object.keys(usernamesList).forEach(function(key) {
      if(usernamesList[key].isPlaying == false && key != userK && denied.indexOf(key) == -1){
            user = key;
            return false;
        }
    });
    return user;
}

function getKeyByValue(object, value) {
  return Object.keys(object).find(key => object[key]["id"] === value);
}

//client.connect();
function AddUserCount(){
    
 pool.connect()
  .then(client => {
    return client.query('UPDATE "General" SET "Count" = "Count" + 1 WHERE "ID" = 1') // your query string here
      .then(res => {
        client.release()
        //console.log(res.rows[0]) // your callback here
      })
      .catch(e => {
        client.release()
       // console.log(err.stack) // your callback here
      })
  })
}

function LoginUser(username, socket){
 pool.connect()
  .then(client => {
    return client.query('UPDATE "Users" SET "Logins" = "Logins" + 1 WHERE "Username" = $1', [username]) // your query string here
      .then(res => {
        client.release();
        console.log(username);
        if(usernamesList[username] == undefined){
                 socket.username = username;
                 var obj = {};
                 obj.online = true;
                 obj.isPlaying = false;
                 obj.id = socket.id;
                 obj.denied = [];
                 usernamesList[username] = obj;   
            }
        	socket.emit("loggedIn");
      })
      .catch(e => {
        client.release()
       // console.log(err.stack) // your callback here
      })
  })
}

function SentWordCount(username){
     pool.connect()
  .then(client => {
    return client.query('UPDATE "Users" SET "SentWords" = "SentWords" + 1 WHERE "Username" = $1', [username]) // your query string here
      .then(res => {
            
        client.release()
        //console.log(res.rows[0]) // your callback here
      })
      .catch(e => {
        client.release()
       // console.log(err.stack) // your callback here
      })
  })
}

function CheckUsername(username, type, socket){
    
    var checkName = "";
    if(type == "createnew"){
        checkName = username;
    }
    if(type == "updateold"){
        checkName = username.newName;
    }
    
     pool.connect()
  .then(client => {
     return client.query('Select * FROM "Users" Where "Username" = $1', [checkName]) // your query string here
      .then(res => {
            var rows = res.rows;
            console.log(rows);
            client.release();
            if(rows.length == 0){
                if(type == "createnew"){
                   CreateUsername(checkName, socket); 
                }
                if(type == "updateold"){
                   UpdateUserName(username, socket); 
                }
                
            }else{
                socket.emit("createUserResult", "Username already chosen, choose another", false);
            }
      })
      .catch(e => {
        client.release()
        console.log(e.stack); // your callback here
         socket.emit("createUserResult", "Error", false);
      })
  })
}

function UpdateUserName(username, socket){
    var oldName = username.oldName;
    var newName = username.newName;
 pool.connect()
  .then(client => {
    return client.query('UPDATE "Users" SET "Username" = $1 WHERE "Username" = $2', [newName, oldName]) // your query string here
      .then(res => {
        client.release();
        //console.log("logging in");
        if(usernamesList[username.oldName] != undefined){
            usernamesList[username.newName] = usernamesList[username.oldName];    
            delete usernamesList[username.oldName];
		socket.username = newName;
                 socket.emit("usernameUpdatePass", username);
            }
        
      })
      .catch(e => {
       client.release()
        console.log(e.stack); // your callback here
         socket.emit("createUserResult", "Error", false);
      })
  })
}

function CreateUsername(username, socket){
     pool.connect()
  .then(client => {
    var que = 'INSERT INTO "Users" ("Connections", "Logins", "SentWords", "Username") VALUES($1, $2, $3, $4) RETURNING *';
    var val = [0, 1, 0, username];
     return client.query(que, val) // your query string here
      .then(res => {
            var rows = res.rows;
            //client.release();
            //console.log(rows);
            client.release();
            if(rows.length > 0){
                if(usernamesList[username] == undefined){
                     socket.username = username;
                     var obj = {};
                     obj.online = true;
                     obj.isPlaying = false;
                     obj.id = socket.id;
                     obj.denied = [];
                     usernamesList[username] = obj; 
                     
                }
                var info = {};
                info.msg = "Username Created";
                info.name = username;
                socket.emit("createUserResult", info, true);
            }
            
        //console.log(res.rows[0]) // your callback here
      })
      .catch(e => {
        client.release()
        console.log(e.stack) // your callback here
        socket.emit("createUserResult", "Error", false);
      })
  })
}

function ConnectionCount(data1, data2){
     pool.connect()
  .then(client => {
    return client.query('UPDATE "Users" SET "Connections" = "Connections" + 1 WHERE "Username" = $1 OR "Username" = $2', [data1, data2]) // your query string here
      .then(res => {
        client.release()
        //console.log(res.rows[0]) // your callback here
      })
      .catch(e => {
        client.release()
       // console.log(err.stack) // your callback here
      })
  })
}

app.get("/joinGroup", function (req, res){
    var group = req.query.groupName;
    var url = "edjufununscramble://multiplayer.html?groupName=" + group;
    console.log(url);
    res.redirect(301, url);
})

//server
var server = app.listen(port, function(){
    console.log("server started on 3000");
})

//var io = new SocketServer({ server });
var io = require('socket.io').listen(server);

    io.sockets.on('connection', function (socket) {
        //console.log("connect");
        //console.log(socket.id);
        var currentUser;
        //register user
        socket.on('pickUsername', function (username) {
            try{
                var success = true;
                if(usernamesList[username] == undefined){
                     socket.username = username;
                     var obj = {};
                     obj.online = true;
                             obj.isPlaying = false;
                     obj.id = socket.id;
                     usernamesList[username] = obj; 
                     //AddUserCount();
                     socket.emit('welcomeHere', success, obj);
                }else{
                     success = false;
                     socket.emit('welcomeHere', success);
                }
            }catch(err){
                
            }
        });
        
         //log in
        socket.on("Login", function(data){
            //LoginUser(data, socket);
            try{
                var url = "http://www.plsanswer.com/Unscramble/testSave.php?type=loginUser&username=" + data;
                http.get(url, function(response) {
                    // Continuously update stream with data
                    var body = '';
                    response.on('data', function(d) {
                        body += d;
                    });
                    response.on('end', function() {
                        //console.log(body);
                        if(body == "success"){
                            if(usernamesList[data] == undefined){
                                 socket.username = data;
                                 var obj = {};
                                 obj.online = true;
                                 obj.isPlaying = false;
                                 obj.id = socket.id;
                                 obj.denied = [];
                                 usernamesList[data] = obj; 
                                 socket.emit("loggedIn");
                            }else{
				socket.username = data;
                                usernamesList[data]["id"] = socket.id;
				usernamesList[data]["isPlaying"] = false;
                                socket.emit("loggedIn");
                            }
                        }else{
                            socket.emit("generic", false, "Connection problem");
                        }
                    });
                });
            }catch(err){
                
            }
        })
	    
        
        //update username
        socket.on("updateUsername", function(username){
            try{
                //CheckUsername(data, "updateold", socket);
                 var oldName = username.oldName;
                 var newName = username.newName;
                var url = "http://www.plsanswer.com/Unscramble/testSave.php?type=updateUsername&username=" + oldName + "&newusername=" + newName;
                http.get(url, function(response) {
                    // Continuously update stream with data
                    var body = '';
                    response.on('data', function(d) {
                        body += d;
                    });
                    response.on('end', function() {
                        //console.log(body);
                        if(body == "success"){
                            if(usernamesList[oldName] != undefined){
                                    usernamesList[newName] = usernamesList[oldName];    
                                    delete usernamesList[oldName];
                    socket.username = newName;
                                    socket.emit("usernameUpdatePass", username);
                                }
                            }else{
                                socket.emit("createUserResult", "Username is taken, try another", false);
                            }
                    });
                });
            }catch(err){
                
            }
        })


        //Find online users
        socket.on('findOnlineUsers', function (data) {
            try{
                  var curUs = socket.username;
                if(usernamesList[curUs] != undefined){
                  var denied = usernamesList[curUs]["denied"];
                  var foundUser = findOnline(curUs, denied);
                  socket.emit('foundUsers', foundUser);
                }else{
                    socket.emit("createUserResult", "Error, please reconnect", false);
                }
            }catch(err){
                
            }
        });

        //send invitation
        socket.on('inviteUser', function (data) {
            try{
                // we tell the client to execute 'updatechat' with 2 parameters
                if(usernamesList[data] == undefined){
                        socket.emit("userCurrentlyPlaying", "User cannot be found online");
                        return;
                    }

                if(usernamesList[data]["isPlaying"] == false){

                    if(usernamesList[socket.username] == undefined){
                        socket.emit("userCurrentlyPlaying", "User cannot be found online");
                        return;
                    }
                    var socketId = usernamesList[data]["id"];
                        var roomName = socket.username + data;
                         socket.room = roomName;
                        socket.join(roomName);
                    var currsocketId = usernamesList[socket.username]["id"];
                   io.to(socketId).emit("sendInvitation", socket.username);
                    io.to(currsocketId).emit("invitationSent", socket.username);
                }else{
                    socket.emit('invitationError', false);
                }	
            }catch(err){
                
            }
        });
        
        //invite friend
        socket.on('inviteFriend', function (data) {
            // we tell the client to execute 'updatechat' with 2 parameters
                    //var socketId = usernamesList[data]["id"];
            try{
                if(usernamesList[socket.username] == undefined){
                        socket.emit("userCurrentlyPlaying", "User cannot be found online");
                        return;
                    }
                        var roomName = socket.username + "Created";
                         socket.room = roomName;
                        socket.join(roomName);
                        var currsocketId = usernamesList[socket.username]["id"];
                        usernamesList[socket.username]["roomName"] = roomName;
                        io.to(currsocketId).emit("roomCreated", socket.username);	
            }catch(err){
                
            }
        });
        
         //create instructor led group
        socket.on('createcoordinatorgroup', function (data) {
            // we tell the client to execute 'updatechat' with 2 parameters
                    //var socketId = usernamesList[data]["id"];
            try{
                if(usernamesList[socket.username] == undefined){
                        socket.emit("userCurrentlyPlaying", "User cannot be found online");
                        return;
                    }
                        var roomName = socket.username + "_cled";
                         socket.room = roomName;
                        socket.join(roomName);
                        var currsocketId = usernamesList[socket.username]["id"];
                        usernamesList[socket.username]["roomName"] = roomName;
                        //usernamesList[username]["isPlaying"] = true;
                        var obj = {};
                        obj.coordinator = socket.username;
                        userScores[roomName] = obj;
                        io.to(currsocketId).emit("coordinatorLedCreated", socket.username);	
            }catch(err){
                
            }
        });
        
        //user leaves instructor led group
        socket.on('leaveRoomCoord', function (data) {
            // we tell the client to execute 'updatechat' with 2 parameters
                    //var socketId = usernamesList[data]["id"];
            try{
                        var roomName = socket.room;
                        
                //console.log("good1");
                        //usernamesList[username]["isPlaying"] = false;
                var group = userScores[socket.room]["users"];
                //console.log("good");
                var length = Object.keys(group).length - 1;
               // console.log("good");
                        delete userScores[socket.room]["users"][socket.username];
                        io.sockets.in(socket.room).emit('memberleavesgroup',socket.username, length);
                        socket.leave(roomName);
                
            }catch(err){
                
            }
        });
        
        //join instructor led group
        socket.on('joincoordinatorgroup', function (data) {
            // we tell the client to execute 'updatechat' with 2 parameters
                    //var socketId = usernamesList[data]["id"];
            try{
                if(userScores[data] == undefined){
                        socket.emit("generic", false, "Group not found");
                        return;
                    }
                        var roomName = data;
                         socket.room = roomName;
                        socket.join(roomName);
                        var currsocketId = usernamesList[socket.username]["id"];
                        usernamesList[socket.username]["roomName"] = roomName;
                        //usernamesList[username]["isPlaying"] = true;
                        if(userScores[data]["users"] == undefined){
                            userScores[data]["users"] = {};
                        }
                        var user = {};
                        user[socket.username] = 0;
                        //user.score = 0;
                        userScores[data]["users"][socket.username] = 0;
                        io.sockets.in(socket.room).emit('newmemberofgroup',true, userScores[data]["users"]);
                        io.to(currsocketId).emit("prepareGame",userScores[data]["coordinator"], socket.username);	
            }catch(err){
                
            }
        });
        
        //Accept friend invitation
        socket.on('acceptFriendInvitation', function (dataOr) {
             try{ 
                //join users
                var info = {};
                if(dataOr.indexOf("Created") == -1){
                if(usernamesList[socket.username] != undefined){
                    var socketId = usernamesList[socket.username]["id"];
                            io.to(socketId).emit("userCurrentlyPlaying", "Group cannot be found");
                            return;
                      }
                }

                var data = dataOr.replace("Created","");
                if(usernamesList[data] != undefined){
                    if(usernamesList[data]["roomName"] == undefined){
                        var socketId = usernamesList[socket.username]["id"];
                        io.to(socketId).emit("userCurrentlyPlaying", "Group cannot be found");
                        return;
                    }
                if(usernamesList[data]["isPlaying"] == true){
                        var socketId = usernamesList[socket.username]["id"];
                        io.to(socketId).emit("userCurrentlyPlaying", "User is playing a game now, try later");
                    }else{
                        var roomName = dataOr;
                        socket.room = roomName;
                        socket.join(roomName);
                        info.player1 = data;
                        info.player1Score = 0;
                        info.player2 = socket.username;
                        info.player2Score = 0;
                        info.groupName = roomName;
                        usernamesList[data]["isPlaying"] = true;
                        usernamesList[socket.username]["isPlaying"] = true;
                        //ConnectionCount(data, socket.username);
                        var user2 = socket.username;
                        var url = "http://www.plsanswer.com/Unscramble/testSave.php?type=increaseConnections&username=" + data + "&username2=" + user2;
                        http.get(url, function(response) {
                            // Continuously update stream with data
                            var body = '';
                            response.on('data', function(d) {
                                body += d;
                            });
                            response.on('end', function() {
                                //console.log(body);

                            });
                        });
                          io.sockets.in(socket.room).emit('joinedGroup', info);
                    } 
                }else{
                if(usernamesList[socket.username] != undefined){
                         var socketId = usernamesList[socket.username]["id"];
                         io.to(socketId).emit("userCurrentlyPlaying", "User is not online now");
                      }
                    }
                }catch(err){
                    
                }
            });

             //Accept invitation
            socket.on('acceptInvitation', function (data) {
                try{
                      var roomName = data + socket.username;
                      socket.room = roomName;
                      socket.join(roomName);
                    //join users
                    var info = {};
                    info.groupName = roomName;
                    info.player1 = data;
                    info.player1Score = 0;
                    info.player2 = socket.username;
                    info.player2Score = 0;
                    if(usernamesList[data] != undefined){
                        usernamesList[data]["isPlaying"] = true;
                        usernamesList[socket.username]["isPlaying"] = true;
                        //ConnectionCount(data, socket.username);
                        var user2 = socket.username;
                            var url = "http://www.plsanswer.com/Unscramble/testSave.php?type=increaseConnections&username=" + data + "&username2=" + user2;
                            http.get(url, function(response) {
                                // Continuously update stream with data
                                var body = '';
                                response.on('data', function(d) {
                                    body += d;
                                });
                                response.on('end', function() {
                                    //console.log(body);

                                });
                            });
                          io.sockets.in(socket.room).emit('joinedGroup', info);
                        }
                }catch(err){
                    
                }
            });
        
        socket.on("rejoinGame", function(grp, prt){
            try{
            var scr = userScores[grp];
                if(scr != undefined){
            socket.join(grp);
            var info = {};
                    info.groupName = grp;
                    info.player1 = scr.player1;
                    info.player1Score = scr.player1score;
                    info.player2 = scr.player2;
                    info.player2Score = scr.player2score;
                    
                }
            }catch(err){
                
            }
        })

            //create new user
            socket.on("createUsername", function(data){
                try{
                    //CheckUsername(data, "createnew", socket);
                    //console.log(user);
                    var url = "http://www.plsanswer.com/Unscramble/testSave.php?type=createUsername&username=" + data;
                    http.get(url, function(response) {
                        // Continuously update stream with data
                        var body = '';
                        response.on('data', function(d) {
                            body += d;
                        });
                        response.on('end', function() {
                            //console.log(body);
                            if(body == "success"){
                                if(usernamesList[data] == undefined){
                                     socket.username = data;
                                     var obj = {};
                                     obj.online = true;
                                     obj.isPlaying = false;
                                     obj.id = socket.id;
                                     obj.denied = [];
                                     usernamesList[data] = obj; 

                                }
                                var info = {};
                                info.msg = "Username Created";
                                info.name = data;
                                socket.emit("createUserResult", info, true);
                            }else{
                                socket.emit("createUserResult", "Username already chosen, choose another", false);
                            }
                        });
                    });
                }catch(err){
                    
                }
        })

        // check if word exists
        socket.on('checkWord', function(data){
            try{    
                var prd = thesaurus.find(data);
                var res = prd.length > 0 ? true : false;
                if(res){
                    prd = prd.slice(0,4);
                }
                socket.emit('RescheckWord', res, prd);
            }catch(err){
                
            }
        });

        //receive and send word
        socket.on("sendWord", function(data){
            try{   
                var rec = data.receiver;
                if(usernamesList[rec] == undefined){
                        socket.emit("userCurrentlyPlaying", "User cannot be found online");
                        return;
                    }
                //SentWordCount(socket.username);
                var user = socket.username;
                var word = data.correct;
                        var url = "http://www.plsanswer.com/Unscramble/testSave.php?type=saveWord&username=" + user + "&word=" + word;
                        http.get(url, function(response) {
                            // Continuously update stream with data
                            var body = '';
                            response.on('data', function(d) {
                                body += d;
                            });
                            response.on('end', function() {
                                //console.log(body);

                            });
                        });
                var socketId = usernamesList[rec]["id"];
                io.sockets.in(socket.room).emit('receiveWord', data);
                //io.to(socketId).emit("receiveWord", data);
            }catch(err){
                
            }
        })
        
        //receive and send word
        socket.on("sendWordCoord", function(data){
            try{   
                //SentWordCount(socket.username);
                var user = socket.username;
                var word = data.correct;
                io.sockets.in(socket.room).emit('receiveWordCoord', data);
                //io.to(socketId).emit("receiveWord", data);
            }catch(err){
                
            }
        })
        
        //get all words
        socket.on("allSentWords", function(data){
            try{
                //SentWordCount(socket.username);
                var user = socket.username;
                var url = "http://www.plsanswer.com/Unscramble/testSave.php?type=usersWords&username=" + user;
                        http.get(url, function(response) {
                            // Continuously update stream with data
                            var body = '';
                            response.on('data', function(d) {
                                body += d;
                            });
                            response.on('end', function() {
                                //console.log(body);
                                socket.emit("allYourSentWords", body);
                            });
                        });
                }catch(err){
                    
                }
            })
        
        //get all game scores
        socket.on("allGameScores", function(data){
            try{
                //SentWordCount(socket.username);
                var user = socket.username;
                var url = "http://www.plsanswer.com/Unscramble/testSave.php?type=usersGames&username=" + user;
                        http.get(url, function(response) {
                            // Continuously update stream with data
                            var body = '';
                            response.on('data', function(d) {
                                body += d;
                            });
                            response.on('end', function() {
                                //console.log(body);
                                socket.emit("allYourGameScores", body);
                            });
                        });
                }catch(err){
                    
                }
            })
        
        //send report card
        socket.on("markAnswer", function (data){
            try{
                io.sockets.in(socket.room).emit('reportCard', data);
            }catch(err){
                
            }
        })
        
        //send report card
        socket.on("markAnswerCoord", function (data){
            try{
                
                console.log(data);
                console.log(userScores[socket.room]["users"]);
                console.log(userScores[socket.room]["users"][data]);
                userScores[socket.room]["users"][data] += 1;
                var send = userScores[socket.room]["users"];
                io.sockets.in(socket.room).emit('newmemberofgroup',false, send, data);
            }catch(err){
                console.log("error");
            }
        })
        
        
        
        //updates scores
        socket.on("updateScores", function (data){
            try{
                var roomName = socket.room;
                userScores[roomName] = data;
            }catch(err){
                
            }
        })
        
        socket.on("reconnectUser", function(data){
            var username = data.user;
            var room = data.room;
            try{
               console.log("reconnect");
                if(usernamesList[username] != undefined){
                    usernamesList[username]["id"] = socket.id;
                    socket.username = username;
                    if(room != null){
                        var prt = data.partner;
                        var scr = userScores[room];
                        if(scr != undefined){
                            socket.join(room);
                            socket.room = room;
                            var info = {};
                            info.groupName = grp;
                            info.player1 = scr.player1;
                            info.player1Score = scr.player1score;
                            info.player2 = scr.player2;
                            info.player2Score = scr.player2score;
                            io.sockets.in(socket.room).emit('joinedGroup', info);
			    socket.broadcast.to(socket.room).emit('generic',true, socket.username+' has reconnected');
                        }
                        //socket.join(room);
                    }else{
                        socket.emit("rejoined", socket.id);
                    }
                    
                } 
            }catch(err){
                
            }
        })

        // when the user disconnects.. perform this
        socket.on('disconnect', function(){
            //console.log("disconnected");
                //delete user from userlist
           try{ 
            io.of('/').in(socket.room).clients(function(error, clients) {
                if (clients.length > 0) {
                   // console.log('clients in the room: \n');
                   // console.log(clients);
                    var roomName = socket.room;
                    /*var data = userScores[roomName];
                    if(data != undefined){
                        //update server scores
                        var player1 = data.player1;
                        if(player1 != undefined){
                        var player1score = data.player1score;
                        var player2 = data.player2;
                        var player2score = data.player2score;
                        var url = "http://www.plsanswer.com/Unscramble/testSave.php?type=updateScores&player1=" + player1 + "&player1score=" + player1score + "&player2=" + player2 + "&player2score=" + player2score;
                                http.get(url, function(response) {
                                    // Continuously update stream with data
                                    var body = '';
                                    response.on('data', function(d) {
                                        body += d;
                                    });
                                    response.on('end', function() {
                                         //console.log(body);    
                                    });
                                });
                        //update server scores
                        }
                    }*/
                        
                    //socket.broadcast.to(socket.room).emit('leaveRoom', socket.username+' has left this room and room has been closed');
                    socket.broadcast.to(socket.room).emit('generic',false, socket.username+' is reconnecting, please wait!');
                    /*delete userScores[socket.room];
                    clients.forEach(function (socket_id) {
                        var username = getKeyByValue(usernamesList, socket_id);
                        usernamesList[username]["isPlaying"] = false;
                        io.sockets.sockets[socket_id].leave(socket.room);
                    });*/
                }else{
                   delete usernamesList[socket.username]; 
                }
            });
                //delete usernamesList[socket.username];
           }catch(err){
               
           }
        });
        
        //send invitation rejection
        socket.on("rejectInvitation", function(data){
            try{
                var us = data.user;
                var curUs = socket.username;
                if(usernamesList[us] == undefined){
                        socket.emit("userCurrentlyPlaying", us + " cannot be found online");
                        return;
                    }
                usernamesList[us]["denied"].push(curUs);
                usernamesList[curUs]["denied"].push(us);
                var socketId = usernamesList[us]["id"];
                io.to(socketId).emit("sendRejection", data);
            }catch(err){
                
            }
        })
        
        //update timer for opponent
        socket.on("opponentTimer", function(data){
            try{
                var us = data.receiver;
                if(usernamesList[us] == undefined){
                        socket.emit("userCurrentlyPlaying",  us + " cannot be found online");
                        return;
                    }
                if(usernamesList[us] != undefined){
                    var socketId = usernamesList[us]["id"];
                    io.to(socketId).emit("opponentTimerRead", data);
                }
            }catch(err){
                
            }
        })
        
        //delete room and members
        socket.on("deleteRoom", function(data){
            /*if(socket.room != null || socket.room != undefined || socket.room != ""){
                socket.broadcast.to(socket.room).emit('leaveRoom', socket.username+' has left this room and room will be closed');
                var users = io.sockets.clients(socket.room);
                for(var i = 0; i < users.length; i++){
                    users[i].leave(socket.room);
                };
            }*/
           try{ 
            io.of('/').in(socket.room).clients(function(error, clients) {
                if (clients.length > 0) {
                   // console.log('clients in the room: \n');
                   // console.log(clients);
                    //update server scores
                     var roomName = socket.room;
                    var data = userScores[roomName];
                    if(data != undefined){
                        //update server scores
                        var player1 = data.player1;
                        if(player1 != undefined){
                        var player1score = data.player1score;
                        var player2 = data.player2;
                        var player2score = data.player2score;
                        var url = "http://www.plsanswer.com/Unscramble/testSave.php?type=updateScores&player1=" + player1 + "&player1score=" + player1score + "&player2=" + player2 + "&player2score=" + player2score;
                                http.get(url, function(response) {
                                    // Continuously update stream with data
                                    var body = '';
                                    response.on('data', function(d) {
                                        body += d;
                                    });
                                    response.on('end', function() {
                                         //console.log(body);    
                                    });
                                });
                        //update server scores
                        }
                    }
                    
                    socket.broadcast.to(socket.room).emit('leaveRoom', socket.username+' has left this room and room has been closed');
                    delete userScores[socket.room];
                    clients.forEach(function (socket_id) {
                        var username = getKeyByValue(usernamesList, socket_id);
                        usernamesList[username]["isPlaying"] = false;
                        io.sockets.sockets[socket_id].leave(socket.room);
                    });
                }
            });
           }catch(err){
               
           }
        })

    })