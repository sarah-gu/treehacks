var elem = document.getElementById('timer');
curWord = "";
function resume(){
    document.getElementById('startGameButton').disabled = true; 
    document.getElementById('resumeGameButton').disabled = true; 
    document.getElementById('pauseGameButton').disabled = false; 
    socket.emit('resumeGame');
}
function startGame(){
    socket.emit('startGame', {});

}
function pause(){
    document.getElementById('startGameButton').disabled = true; 
    document.getElementById('resumeGameButton').disabled = false; 
    document.getElementById('pauseGameButton').disabled = true; 
    socket.emit('pause');
}
function drawCard(){
    socket.emit('drawCard');

}
socket.on('retWord', function(data){
    curWord = data.curWord;
    document.getElementById('yourWord').innerHTML = 'your word is: ' + data.curWord;
})
function correct() {
    socket.emit('removeWord', {word: curWord});
    drawCard(); 
}
function pass() {
    drawCard(); 
}
function reset() {
    socket.emit('reset');
}

function joinGame(documentId){
    var myDivId = document.getElementById(documentId);
    myDiv = documentId; 
    socket.emit('updateTable', {
        divId: documentId,
    });
}
function resetWordBank(){
    socket.emit('resetDict');
}