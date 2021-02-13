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
    res.render('index', {})
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
userPrefix = ['cool', 'awesome', 'effervescent', 'intellectual', 'large', 'siced','honorable', 'happy', 'amazing', 'dumb', 'perfect'];
userSuffix = ['tiger', 'student', 'person', 'table', 'dog', 'homie','sicer', 'empress', 'elephant', 'exerciser', 'bromie', 'dawg'];
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
            TABLE_LIST: [], 
            POINTS: {}, 
            DICTIONARY: [], 
            ALREADY_SEEN: new Set(),
            TIMER: 30,
            teamNumber: 0,
            currTeam: 0,
            bool: false
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
                var divId = '';
                var roomSockets = ROOM[code].sockets;
                var table = ROOM[code].TABLE_LIST;
                var tableIdx = table.indexOf(socket.id);
                if(tableIdx != -1){
                    divId = socket.divId;
                    ROOM[code].TABLE_LIST.splice(tableIdx, 1);
                }
                var idx = roomSockets.indexOf(socket.id);
                if(idx != -1){
                    ROOM[code].sockets.splice(idx,1);
                }
                if(ROOM[code].sockets.length === 0){
                    console.log("ROOM DELETED");
                    delete ROOM[code];
                }
                else{
                    for(var team in ROOM[code].POINTS){
                        var curplayers = ROOM[code].POINTS[team].players; 
                        if(curplayers[0] == socket.id || curplayers[1] == socket.id){
                            delete ROOM[code].POINTS[team];
                            ROOM[code].teamNumber -=1;
                        }
            
                    }
                    console.log(ROOM);
                    for(var s = 0; s < ROOM[code].sockets.length; s++){
                        var socket2 = SOCKET_LIST[ROOM[code].sockets[s]];
                        socket2.emit('clearTeams');
                        socket2.emit('clearTable');
                        socket2.emit('clearLobby');
                    }
                }
    
            }
            delete SOCKET_LIST[socket.id];
        }
    });

    socket.on('updateTable', function(data){
        socket = SOCKET_LIST[socket.id];

        var code = socket.room; 
        if(!socket.inTable){
            socket.inTable = true; 
            socket.divId = data.divId; 
            ROOM[code].TABLE_LIST = [];
            var players = ROOM[code].sockets;
            for(var s = 0; s < players.length; s++){
                var ss = SOCKET_LIST[players[s]];
                if(ss.inTable){
                    ROOM[code].TABLE_LIST.push(ss.id); 
                }
            }
        }
        else{
            var og = socket.divId; 
            socket.divId = data.divId; 
            var teamChange = false; 
            for(var team in ROOM[code].POINTS){
                var curplayers = ROOM[code].POINTS[team].players; 
                if(curplayers[0] == socket.id || curplayers[1] == socket.id){
                    delete ROOM[code].POINTS[team];
                    ROOM[code].teamNumber -=1;
                    teamChange = true; 
                }
        
            }
            
            for(var s = 0; s < ROOM[code].sockets.length; s++){
                var ss = SOCKET_LIST[ROOM[code].sockets[s]];
                if(teamChange){
                    ss.emit('clearTeams');
                }
                ss.emit('clearTablePos', {divId: og});
            }
        }

        for(var n = 0; n < ROOM[code].TABLE_LIST.length; n++){
            var i = ROOM[code].TABLE_LIST[n]; 
            var nums = parseInt(data.divId.substring(4));
            if(nums%2 == 0 && ('game' + (''+(nums+1))) == SOCKET_LIST[i].divId){
                SOCKET_LIST[i].team = ROOM[code].teamNumber; 
                SOCKET_LIST[socket.id].team = ROOM[code].teamNumber; 
                ROOM[code].POINTS[ROOM[code].teamNumber] = {pts:0, name:ROOM[code].teamNumber, players:[socket.id, i]}; 
                ROOM[code].teamNumber += 1; 
                break; 
            }
            else if(nums%2 != 0 && ('game' + (''+(nums-1))) == SOCKET_LIST[i].divId){
                SOCKET_LIST[i].team = ROOM[code].teamNumber; 
                SOCKET_LIST[socket.id].team = ROOM[code].teamNumber; 
                ROOM[code].POINTS[ROOM[code].teamNumber] = {pts:0, name:ROOM[code].teamNumber, players:[socket.id, i]}; 
                ROOM[code].teamNumber += 1; 
                break; 
            }
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
        for(var team in ROOM[code].POINTS){
            var curplayers = ROOM[code].POINTS[team].players; 
            if(curplayers[0] == socket.id){
                ROOM[code].POINTS[team].players = [data.newId, curplayers[1]];
                break; 
            }
            else if(curplayers[1] == socket.id){
                ROOM[code].POINTS[team].players = [curplayers[0], data.newId]; 
            }

        }
        delete SOCKET_LIST[socket.id];
        socket.id = data.newId;
        SOCKET_LIST[data.newId] = socket; 
    });
    socket.on('updateteamid', function(data){
        socket = SOCKET_LIST[socket.id];

        var code = socket.room; 
        if(socket.team in ROOM[code].POINTS){
            ROOM[code].POINTS['' + socket.team].name = data.newId; 
        }
    });
    socket.on('reset', function(data){
        socket = SOCKET_LIST[socket.id];
        var code = socket.room; 
        ROOM[code].TABLE_LIST = [];
        ROOM[code].POINTS = {};
        ROOM[code].DICTIONARY = [];
        ROOM[code].TIMER = 30;
        ROOM[code].bool = false; 
        ROOM[code].teamNumber = 0; 
        var players = ROOM[code].sockets;
        for(var i = 0; i < players.length; i++){
            var socket2 = SOCKET_LIST[players[i]];
            socket2.inTable = false; 
            socket2.divId = undefined; 
            socket2.emit('clearTeams');
            socket2.emit('clearLobby');
            socket2.emit('clearTablePos', {divId: 'reset'});
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
        if(socket.team in ROOM[code].POINTS)
            ROOM[code].POINTS['' + socket.team].pts += 1;
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
    socket.on('startGame', function(data){
        socket = SOCKET_LIST[socket.id];
        var code = socket.room; 
        console.log(ROOM[code].POINTS);

        if((Object.keys(ROOM[code].POINTS).length * 2) == ROOM[code].TABLE_LIST.length){
            ROOM[code].bool = true; 
            var players = ROOM[code].sockets;
            for(var i in players){
                var socket2 = SOCKET_LIST[players[i]];
                socket2.emit('clientStart', {
                    mainP1: SOCKET_LIST[ROOM[code].POINTS[ROOM[code].currTeam].players[0]].divId,
                    mainP2: SOCKET_LIST[ROOM[code].POINTS[ROOM[code].currTeam].players[1]].divId
                });
            }
        }
        else{
            socket.emit('oddPlayer');
        }

    });
//timers
    socket.on('resumeGame', function(data){
        socket = SOCKET_LIST[socket.id];
        var code = socket.room;
        ROOM[code].bool = true; 
    });
    socket.on('pause', function(data){
        socket = SOCKET_LIST[socket.id];
        var code = socket.room;
        ROOM[code].bool = false; 
    });


});
function noTime(code) {
    ROOM[code].TIMER = 30; 
    ROOM[code].bool = false; 

    var prevTeam = ROOM[code].currTeam; 
    ROOM[code].currTeam = (ROOM[code].currTeam + 1)%(ROOM[code].teamNumber); 
    console.log(ROOM[code].currTeam);
    for(var i in ROOM[code].sockets){
        var socket2 = SOCKET_LIST[ROOM[code].sockets[i]];
        socket2.emit('highlight', {                   
            mainP1: SOCKET_LIST[ROOM[code].POINTS[ROOM[code].currTeam].players[0]].divId,
            mainP2: SOCKET_LIST[ROOM[code].POINTS[ROOM[code].currTeam].players[1]].divId,
            prevP1: SOCKET_LIST[ROOM[code].POINTS[prevTeam].players[0]].divId,
            prevP2: SOCKET_LIST[ROOM[code].POINTS[prevTeam].players[1]].divId
        });
    }
    
}
function countdown() {
    for(var code in ROOM){
        if (ROOM[code].TIMER === 0) {
            noTime(code);
        } else if(ROOM[code].bool){
            //elem.innerHTML = timeLeft + ' seconds remaining';
            ROOM[code].TIMER--;
        }
    }
}
//send data real-time to clientside
setInterval(function(){
    var packLobby = {};
    for(var r in ROOM){
        packLobby[r] = [ROOM[r].TIMER, ROOM[r].POINTS];
        for(var i = 0; i < ROOM[r].sockets.length; i++){
            if(ROOM[r].sockets[i] in SOCKET_LIST){
                var socket2 = SOCKET_LIST[ROOM[r].sockets[i]];
                packLobby[r].push({
                    id:socket2.id,
                    divId: socket2.divId,
                    inTable: socket2.inTable
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
