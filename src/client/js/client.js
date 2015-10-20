define(function(){

	$(document).ready(function(){

	});

	socket = io.connect('http://192.168.1.57:3000');
	socket.emit('join','nalin');


	return {

	};
 
});



