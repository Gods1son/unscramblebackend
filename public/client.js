
var socket = io();
var roomName; 
var dictionary = new Typo("en_US", false, false, { dictionaryPath: "typo/dictionaries" });
 // on connection to server, ask for user's name with an anonymous callback
  socket.on('connect', function(){
		// call the server-side function 'adduser' and send one parameter (value of prompt)
		socket.emit("pickUsername", prompt("Pick a username"));
	});
socket.on('disconnectedUser', function(info){
	alert(info);
})

socket.on('welcomeHere', function(username, data){
	document.getElementById("userNameIs").innerHTML = "Welcome " + username;
})

socket.on('roomCreated', function(room){
	alert(room);
})

socket.on('startScores', function(username){
	document.getElementById("scores").innerHTML = username;
	//$('#scores').append('<div>' + correct + '</div>' + '<hr>');
	//$('#scores').append('<div>' + incorrect + '</div>' + '<hr>');
	//var elem2 = document.getElementById('scoreContainer');
  	//elem2.scrollTop = elem2.scrollHeight;
})

socket.on('requestScores', function(){
	socket.emit("shareScores");
})

socket.on('updateScores', function(username, score){
	if(document.getElementById(username) == null || document.getElementById(username) == undefined){
	   var scoresHolder = document.getElementById("scores");
		var spanNew = document.createElement("SPAN");
		document.getElementById("scores").appendChild(spanNew);
		spanNew.id = username;
		document.getElementById(username).innerHTML = score;
		//document.getElementById("scores").appendChild(document.createElement("HR"));
	 }else{
	document.getElementById(username).innerHTML = score; }
	//$('#scores').append('<div>' + correct + '</div>' + '<hr>');
	//$('#scores').append('<div>' + incorrect + '</div>' + '<hr>');
	//var elem2 = document.getElementById('scoreContainer');
  	//elem2.scrollTop = elem2.scrollHeight;
})

socket.on('roomCreatedError', function(notice){
	alert(notice);
})

socket.on('allUsers', function(data){
	$('#users').empty();
		/*$.each(data, function(key, value) {
			$('#users').append('<div>' + value + '</div>');
		});*/
	
		$('#users').append('<div>' + data + '</div>');
		$('#notyIcon').show();
})

socket.on('roomJoined', function(room){
	alert(room);
})

socket.on('newWord', function(theword, word, room, originalWord){
	$('#wordsNew').append("<li>" + word + " " + "<span style='background-color:aqua' onclick='reshuffle(this.innerHTML)'>" + theword + "</span></li>" + "<hr>");
	//document.getElementById("wordsNew").innerHTML += "<br>" + word;
	document.getElementById("roomNameStore").value = room;
	 var elem = document.getElementById('allWordsHolder');
  	 elem.scrollTop = elem.scrollHeight;
	roomName = room;
	if (localStorage.getItem(room) == undefined) {
    	localStorage.setItem(room, originalWord);
    } else {
    	localStorage.removeItem(room);
    	localStorage.setItem(room, originalWord);
	}
})

socket.on('newWord3', function(word, theword, room, player){
	$('#wordsNew').append("<li>" + word + " " + "<span style='background-color:aqua' onclick='reshuffle(this.innerHTML)'>" + theword + "</span></li>" + "<hr>");
	document.getElementById("roomNameStore").value = room;
	
	if (localStorage.getItem(room) == undefined) {
    	localStorage.setItem(room, player);
    } else {
    	localStorage.removeItem(room);
    	localStorage.setItem(room, player);
	}
})

socket.on('newWord2', function(word, result, room){
	$('#wordsNew').append('<li>' + word + '</li>' + '<hr>');
	//document.getElementById("wordsNew").innerHTML += "<br>" + word;
	var elem = document.getElementById('allWordsHolder');
  	elem.scrollTop = elem.scrollHeight;
	if(result == "pass"){
		if (localStorage.getItem(room) != undefined && localStorage.getItem(room) != "i just played"){
			localStorage.removeItem(room);
		}
	}
})

socket.on('passing', function(pass){
	$('#wordsNew').append("<li style='background-color:yellow;'>" + pass + "</li>" + "<hr>");
	var elem = document.getElementById('allWordsHolder');
  	 elem.scrollTop = elem.scrollHeight;
})

socket.on('sharedHint', function(hint){
	$('#wordsNew').append('<li>' + hint + '</li>' + '<hr>');
	//document.getElementById("wordsNew").innerHTML += "<br>" + hint;
	var elem = document.getElementById('allWordsHolder');
  	elem.scrollTop = elem.scrollHeight;
})

function showCreateRoom() {
	$("#createRoomContainer").toggle();
	$("#createRoomName").focus();
}

$("#createRoomName").keypress(function(e) {
    if(e.which == 13) {
	$('#closeCreate').click();
        createRoom();
    }
});

$("#joinRoomName").keypress(function(e) {
    if(e.which == 13) {
	$('#closeJoin').click();
        joinRoom();
    }
});

$("#wordToShuffle").keypress(function(e) {
    if(e.which == 13) {
        sendWord();
    }
});

$("#myGuess").keypress(function(e) {
    if(e.which == 13) {
        sendGuess();
    }
});

$("#myHint").keypress(function(e) {
    if(e.which == 13) {
        giveHint();
    }
});


function showJoinRoom() {
	$("#joinRoomContainer").toggle();
	$("#joinRoomName").focus();
}

function createRoom() {
	var roomName = $("#createRoomName").val();
	if(roomName.trim() == ""){
		alert("Please enter a name!!!");
	}else{
	$('#closeCreate').click();
	socket.emit("createRoom", roomName);
	}
}

function joinRoom() {
	var roomName = $("#joinRoomName").val();
	if(roomName.trim() == ""){
		alert("Please enter a name!!!");
	}else{
	$('#closeJoin').click();
	socket.emit("joinRoom", roomName);
	}
}

function giveHint(){
	var hint = $("#myHint").val();
	if(hint.trim() == ""){
		alert("U cannot send empty message!");
	}else{
	document.getElementById("myHint").value = "";
	socket.emit("giveHint", hint);
	}
}

function sendWord(){
	var roomNameStore = document.getElementById("roomNameStore").value;
	if (localStorage.getItem(roomNameStore) == "i just played") {
   		alert("you just played, wait for opponent to play");
	}else if (localStorage.getItem(roomNameStore) != "i just played" && localStorage.getItem(roomNameStore) != undefined){
		alert("There is an unanswered question");
	} else {
	var word = $("#wordToShuffle").val();
	if(word == "" || word == null){
		alert("no word entered!!!");
	} else{	
	word = word.toLowerCase();
	word = word.trim();
		
	//dictionary try
	//var dictionary = new Typo("en_US", false, false, { dictionaryPath: "typo/dictionaries" });
	var is_spelled_correctly = dictionary.check(word);
	
	if(is_spelled_correctly == false){
		alert("not a correct English word, choose another pls!!!");
		document.getElementById("wordToShuffle").value = "";
	} else {
	//end of dict
	document.getElementById("wordToShuffle").value = "";
	var shuffledWord = shuffleman(word);
	socket.emit("sendShuffledWord", shuffledWord, word);
			}
		}
	}
}

function sendGuess(){
	var result;
	var word = $("#myGuess").val();
	word = word.toLowerCase();
	if(word.trim() == ""){
		alert("You cannot send empty answer!");
	}else {
	document.getElementById("myGuess").value = "";
	if (localStorage.getItem(roomName) == undefined) {
   		alert("no word to guess");
	}else{
	var word2guess = localStorage.getItem(roomName);
   		if (word == word2guess) {
   			word = word + " " + "<img src='checkmark-png-22.png' height='30' width='30'>";
   			//localStorage.removeItem(roomName);
			result = "pass";
   			} else {
   			word = word + " " + "<img src='cross.png' height='30' width='30'>";
			result = "fail";
   			}
		socket.emit("sendMyGuess", word, result);
		}
	}//var shuffledWord = shuffleman(word);	
}

function ipass(){
var confirmpass = confirm("Are you sure want to pass, u lose 1 point");
if(confirmpass){
var pass = " says I pass";
	localStorage.removeItem(roomName);
	socket.emit("passed", pass);
     }else{return false;}
}

function shuffleman(word) {
	var newword;
	var newwordform = "";
	var shuffleword = word;
	var allnumbers = [];
	var wordsplit = shuffleword.split("");

    do{
        
      //  var shufflenumber = document.getElementById("shufflenumber");
               
        var randomnumber = Math.floor(Math.random() * shuffleword.length);
            
        if(allnumbers.indexOf(randomnumber) != -1){
        	var randomnumber = Math.floor(Math.random() * shuffleword.length);
        }else{
        	allnumbers.push(randomnumber);
        }
               
    }while(allnumbers.length != shuffleword.length);
       for (var x = 0; x < allnumbers.length; x++) {
       	var position = allnumbers[x];
    	 newword = wordsplit[position];
    	newwordform += newword;
	    
    }
    //set the real word empty
   // document.getElementById("shuffleword").value = "";

    //save word to localstorage
	  return newwordform;
   }

  function reshuffle(word2){
  var theword = word2;
	  var newword2 = shuffleman(theword);
	  event.currentTarget.innerText = newword2;
  }

  /*  // on connection to server, ask for user's name with an anonymous callback
   socket.on('connect', function(){
		// call the server-side function 'adduser' and send one parameter (value of prompt)
		socket.emit('adduser', prompt("What's your name?"));
	});

	// listener, whenever the server emits 'updatechat', this updates the chat body
	socket.on('updatechat', function (username, data) {
		$('#conversation').append('<b>'+username + ':</b> ' + data + '<br>');
	});

	// listener, whenever the server emits 'updaterooms', this updates the room the client is in
	socket.on('updaterooms', function(rooms, current_room) {
		$('#rooms').empty();
		$.each(rooms, function(key, value) {
			if(value == current_room){
				$('#rooms').append('<div>' + value + '</div>');
			}
			else {
				$('#rooms').append('<div><a href="#" onclick="switchRoom(\''+value+'\')">' + value + '</a></div>');
			}
		});
	});

	function switchRoom(room){
		socket.emit('switchRoom', room);
	}

	// on load of page
	$(function(){
		// when the client clicks SEND
		$('#datasend').click( function() {
			var message = $('#data').val();
			$('#data').val('');
			// tell server to execute 'sendchat' and send along one parameter
			socket.emit('sendchat', message);
		});

		// when the client hits ENTER on their keyboard
		$('#data').keypress(function(e) {
			if(e.which == 13) {
				$(this).blur();
				$('#datasend').focus().click();
			}
		});
	});*/
