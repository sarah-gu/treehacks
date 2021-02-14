var express = require('express');
var app = express();
var path = require('path');
var hbs = require('hbs');
var http = require('http').Server(app);
var io = require('socket.io')(http)

// -------------- express initialization -------------- //
app.set('port', process.env.PORT || 8080 );
app.set('view engine', 'hbs');

// -------------- serve static folders -------------- //
app.use('/client', express.static(path.join(__dirname, 'client')))


// -------------- express 'get' handlers -------------- //
app.get('/room', function(req, res){
    console.log('no sub-page');
    res.render('index', {});
});
app.get('/roomlist', function(req,res){
    res.render('roomlist', {});
}); 
app.get('/getcode', function(req,res){
    res.render('registration', {})
});
app.get('/', function(req,res){
    res.render('landing', {});
});
//hidden helper endpoints
app.get('/joinRoom', function(req,res){
    var code = req.query.roomCode; 
    if(code in ROOM){
        
        res.send("true");
    }
    else{
        res.send('false');
    }
});
ROOM = {}; 
SOCKET_LIST = {};
//// stuff for the actual game
var timerId = setInterval(countdown, 1000);

var currentNumberOfUsers = 0; 
userPrefix = ['cool', 'awesome', 'effervescent', 'intellectual', 'honorable', 'happy', 'amazing', 'dumb', 'perfect'];
userSuffix = ['tiger', 'student', 'person',  'elephant', 'ox', 'flamingo', 'cat', 'ostrich'];
io.sockets.on('connection', function(socket){
    currentNumberOfUsers += 1;
//stuff for joining ROOM
    socket.on('joinRoom', function(data){
        var idx1 = "" + Math.floor(userPrefix.length*Math.random());
        var idx2 = "" + Math.floor(userSuffix.length*Math.random());
        socket.id = userPrefix[idx1] + '-' + userSuffix[idx2];
        SOCKET_LIST[socket.id] = socket;
        if(data.code in ROOM){
        
            socket.emit('redirect', {num: '1', code: data.code}); 
        }
        else{
            socket.emit('redirect', {num: '0'});
        }
    });
    socket.on('save_socket', function(data){
        console.log('socket connection')
        var idx1 = "" + Math.floor(userPrefix.length*Math.random());
        var idx2 = "" + Math.floor(userSuffix.length*Math.random());
        socket.id = userPrefix[idx1] + '-' + userSuffix[idx2];
        socket.emit('welcome', {message:socket.id});
       // socket.connectionNum = currentNumberOfUsers;
        SOCKET_LIST[socket.id] = socket;
        socket.room = data.code; 
        ROOM[data.code].sockets.push(socket.id);
        socket.emit('myRoom', {code: data.code});
    });
    socket.on('createRoom', function(data){
        var idx1 = "" + Math.floor(userPrefix.length*Math.random());
        var idx2 = "" + Math.floor(userSuffix.length*Math.random());
        socket.id = userPrefix[idx1] + '-' + userSuffix[idx2];
        SOCKET_LIST[socket.id] = socket;
        var randCode = '' + Math.floor(Math.random() * 10000);
        ROOM[randCode] = {
            sockets: [], 
            DICTIONARY: [], 
            ALREADY_SEEN: new Set(),
        };
        socket.emit('redirect', {num: '1', code: randCode}); 
    });
//stuff for game logistics


    socket.on('disconnect', function(){
        console.log(socket.id);
        if(socket.id in SOCKET_LIST){
            socket = SOCKET_LIST[socket.id]; 
            if(socket.room !== undefined){
                var code = socket.room; 
                var roomSockets = ROOM[code].sockets;
                var idx = roomSockets.indexOf(socket.id);
                if(idx != -1){
                    ROOM[code].sockets.splice(idx,1);
                }
                if(ROOM[code].sockets.length === 0){
                    console.log("ROOM DELETED");
                    delete ROOM[code];
                }
                else{
            
                    console.log(ROOM);
                    for(var s = 0; s < ROOM[code].sockets.length; s++){
                        var socket2 = SOCKET_LIST[ROOM[code].sockets[s]];
                        socket2.emit('clearLobby');
                    }
                }
    
            }
            delete SOCKET_LIST[socket.id];
        }
    });

    socket.on('updateid', function(data){
        socket = SOCKET_LIST[socket.id]; 

        var code = socket.room; 
        for(var i = 0; i < ROOM[code].sockets.length; i++){
            if(ROOM[code].sockets[i] == socket.id){
                ROOM[code].sockets[i] = data.newId; 
                break;
            }
        }

        delete SOCKET_LIST[socket.id];
        socket.id = data.newId;
        SOCKET_LIST[data.newId] = socket; 
    });

    socket.on('reset', function(data){
        socket = SOCKET_LIST[socket.id];
        var code = socket.room; 
        ROOM[code].DICTIONARY = [];
        var players = ROOM[code].sockets;
        for(var i = 0; i < players.length; i++){
            var socket2 = SOCKET_LIST[players[i]];
            socket2.divId = undefined; 
            socket2.emit('clearLobby');
        }
    
    });
    // socket.on('timer', function(data){
    //     TIMER = data.time; 
    // })
//stuff for dictionary 
    socket.on('addWord', function(data){

        socket = SOCKET_LIST[socket.id];
        var code = socket.room;
        ROOM[code].DICTIONARY.push(data.word); 

    });
    socket.on('removeWord', function(data){
        socket = SOCKET_LIST[socket.id];

        var code = socket.room;
        var idx = ROOM[code].DICTIONARY.indexOf(data.word); 

        ROOM[code].ALREADY_SEEN.add(idx); 
        var players = ROOM[code].sockets;
        for(var i in players){
            var socket2 = SOCKET_LIST[players[i]];
            socket2.emit('showEveryone', {word: data.word});
        }

    });

    socket.on('drawCard', function(data){
        //var userName = document.getElementById('game' + mainPlayers[curMpIdx]);
        socket = SOCKET_LIST[socket.id];
        var code = socket.room; 
        if(ROOM[code].DICTIONARY.length - ROOM[code].ALREADY_SEEN.size === 5){
            socket.emit('under5');
        }
        if(ROOM[code].DICTIONARY.length - ROOM[code].ALREADY_SEEN.size === 0){
            socket.emit('noWords');
        }
        else{
            var idx = Math.floor(ROOM[code].DICTIONARY.length*Math.random());
            while(ROOM[code].ALREADY_SEEN.has(idx))
            {
                idx = Math.floor(ROOM[code].DICTIONARY.length*Math.random());
            }
    
            var word = ROOM[code].DICTIONARY[idx];
            socket.emit('retWord', {curWord:word}); 
        }
    });

    socket.on('resetDict', function(data){
        socket = SOCKET_LIST[socket.id];
        var code = socket.room;
        ROOM[code].ALREADY_SEEN.clear();
        console.log(ROOM[code].ALREADY_SEEN);
    })
//stuff for game functionality

});
//send data real-time to clientside
setInterval(function(){
    var packLobby = {};
    for(var r in ROOM){
        for(var i = 0; i < ROOM[r].sockets.length; i++){
            if(ROOM[r].sockets[i] in SOCKET_LIST){
                var socket2 = SOCKET_LIST[ROOM[r].sockets[i]];
                packLobby[r].push({
                    id:socket2.id,
                }); //builds a pack of current users and their associated data
            }
        }

    }

    for(var y in SOCKET_LIST){
        var socketFin = SOCKET_LIST[y];
        socketFin.emit('sendData', {
            pack: packLobby, 
        });

    }
    
}, 1000/40);

// -------------- listener -------------- //
var listener = http.listen(app.get('port'), function() {
  console.log( 'Express server started on port: '+listener.address().port );
});
