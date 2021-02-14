curWord = "";
function drawCard(){
    socket.emit('drawCard');

}
socket.on('retWord', function(data){
    curWord = data.curWord;
    document.getElementById('yourWord').innerHTML =  data.curWord;
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

function resetWordBank(){
    socket.emit('resetDict');
}
