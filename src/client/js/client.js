define(function(){

	$(document).ready(function(){

	});

	socket = io.connect('http://localhost:3000');
	socket.emit('join','nalin');


	return {

	};
 
});



