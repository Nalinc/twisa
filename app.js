/*jslint node:true*/
var express = require("express");
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server); 
var bodyParser = require('body-parser');
var sentiment = require('sentiment');
var twitter = require('ntwitter');
var port = (process.env.VCAP_APP_PORT || 3000);

// make Stream globally visible so we can clean up better
var stream;

var DEFAULT_TOPIC = "Justin Bieber";

// defensiveness against errors parsing request bodies...
process.on('uncaughtException', function (err) {
    console.error('Caught exception: ' + err.stack);
});
process.on("exit", function(code) {
    console.log("exiting with code: " + code);
});

// Configure the app web container
app.use(bodyParser.json());

app.use(express.static(__dirname + '/src/client'));

var enableCORS = function(req, res, next) {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE,OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Content-Length, X-Requested-With, *');

        // intercept OPTIONS method
    if ('OPTIONS' == req.method) {
        res.send(200);
    } else {
        next();
    }
};

// enable CORS!
app.use(enableCORS);

// Sample keys for demo and article - you must get your own keys if you clone this application!
// Create your own app at: https://dev.twitter.com/apps
// See instructions HERE:  https://hub.jazz.net/project/srich/Sentiment%20Analysis%20App/overview
// Look for "To get your own Twitter Application Keys" in the readme.md document
var tweeter = new twitter({
    consumer_key: 'fwcWbggpA2Skv8QvURpoiYIlW',
    consumer_secret: 's6q9rKsC6qa91Xbh3KhZJXT06tH8xH7aYtP6BSuJozZgNdRZNk',
    access_token_key: '3954929774-uXPUUteSRCFaOyaRXsJtV08dhY3bnQvK3TfzxhS',
    access_token_secret: 'NOkBm0AjZgmLuWOwlqiXOWQNl2OVLjSLaaVCDAk2BzkXN'
});

app.get('/twitterCheck', function (req, res) {
    tweeter.verifyCredentials(function (error, data) {
        res.send("Hello, " + data.name + ".  I am in your twitters.");
    });
});

var tweetCount = 0;
var tweetTotalSentiment = 0;
var monitoringPhrase;

app.get('/sentiment', function (req, res) {
    res.json({monitoring: (monitoringPhrase != null), 
    	monitoringPhrase: monitoringPhrase, 
    	tweetCount: tweetCount, 
    	tweetTotalSentiment: tweetTotalSentiment,
    	sentimentImageURL: sentimentImage()});
});

app.post('/sentiment', function (req, res) {
	try {
		if (req.body.phrase) {
	    	beginMonitoring(req.body.phrase);
			res.send(200);			
		} else {
			res.status(400).send('Invalid request: send {"phrase": "bieber"}');		
		}
	} catch (exception) {
		res.status(400).send('Invalid request: send {"phrase": "bieber"}');
	}
});

io.on('connection',function(client){
    function resetMonitoring() {
    	if (stream) {
    		var tempStream = stream;
    	    stream = null;  // signal to event handlers to ignore end/destroy
    		tempStream.destroySilent();
    	}
        monitoringPhrase = "";
    }

    function beginMonitoring(phrase) {
        // cleanup if we're re-setting the monitoring
        if (monitoringPhrase) {
            resetMonitoring();
        }
        monitoringPhrase = phrase;
        tweetCount = 0;
        tweetTotalSentiment = 0;
        tweeter.verifyCredentials(function (error, data) {
            if (error) {
            	resetMonitoring();
                console.error("Error connecting to Twitter: " + error);
                if (error.statusCode === 401)  {
    	            console.error("Authorization failure.  Check your API keys.");
                }
            } else {
                tweeter.stream('statuses/filter', {
                    'track': monitoringPhrase
                }, function (inStream) {
                	// remember the stream so we can destroy it when we create a new one.
                	// if we leak streams, we end up hitting the Twitter API limit.
                	stream = inStream;
                    console.log("Monitoring Twitter for " + monitoringPhrase);
                    stream.on('data', function (data) {
                        // only evaluate the sentiment of English-language tweets
                        if (data.lang === 'en') {
                            sentiment(data.text, function (err, result) {
                                tweetCount++;
                                tweetTotalSentiment += result.score;
                                var obj={
                                    'user':data.user,
                                    'text':data.text,
                                    'created_at':data['created_at'],
                                    'url':'http://www.twitter.com/'+data.user.name+'/status/'+data['id_str'],
                                    'score':result.score,
                                    'positive_count':result.positive.length,
                                    'negative_count':result.negative.length,
                                    'comparative':result.comparative,
                                    'type':(parseInt(result.score)>0)?'positive':(((parseInt(result.score)<0)?'negative':'neutral'))
                                }
                                client.emit('feedsupdate',obj)                                
                            });
                        }
                    });
                    stream.on('error', function (error, code) {
    	                console.error("Error received from tweet stream: " + code);
    		            if (code === 420)  {
    	    		        console.error("API limit hit, are you using your own keys?");
                		}
    	                resetMonitoring();
                    });
    				stream.on('end', function (response) {
    					if (stream) { // if we're not in the middle of a reset already
    					    // Handle a disconnection
    		                console.error("Stream ended unexpectedly, resetting monitoring.");
    		                resetMonitoring();
    	                }
    				});
    				stream.on('destroy', function (response) {
    				    // Handle a 'silent' disconnection from Twitter, no end/error event fired
    	                console.error("Stream destroyed unexpectedly, resetting monitoring.");
    	                resetMonitoring();
    				});
                });
                return stream;
            }
        });
    }

    function sentimentImage() {
        var avg = tweetTotalSentiment / tweetCount;
        if (avg > 0.5) { // happy
            return "/images/positive.png";
        }
        if (avg < -0.5) { // angry
            return "/images/negative.png";
        }
        // neutral
        return "/images/neutral.png";
    }


    //  console.log('client connected');
    //  client.emit('chat',{hello:'world'});

        client.on('monitor',function(phrase){
            console.log('analyzing phrase: ' +phrase);
            beginMonitoring(phrase);
        });

        client.on('messageOut',function(data){
            client.broadcast.emit("AddMessage",data);
        });

        client.on("disconnect",function(){
            console.log("user "+client.name+" left..");
            
            client.broadcast.emit("removeUser",client.name);
        });
});

app.get('/',function (req, res) {
        res.sendFile("index.html");
});

app.get('/reset', function (req, res) {
    resetMonitoring();
    res.redirect(302, '/');
});


server.listen(port);
console.log("Server listening on port " + port);