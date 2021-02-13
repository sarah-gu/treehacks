function joinRoomJS(){
    $.ajax({
      url: "joinRoom",                  
      type: "get",             
      data:  $('#joinRoom').serialize(), 
    success: function(response) {
            if(response == 'true'){
                window.location.href = 'https://nookncranny.herokuapp.com/room'
            }
            else{
                document.getElementById('error').innerHTML = "not a room!"; 
            }
        },
    error: function (stat, err) {
            console.log("something went wrong. :( ");
        }       
    });
}
