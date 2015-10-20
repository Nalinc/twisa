require(["client","jQuery","events"],function(client){

	console.log(client.nickname);
});



require.config({
	paths:{
		'jQuery':'lib/jquery-1.11.1.min',
	},
	shim:{
		'client':{
			deps:['jQuery'],
			exports: 'client'
		},
		'events':{
			deps:['jQuery','client']
		}
	}


});