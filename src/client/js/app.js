define([], function() {

		var app = angular.module('app', ['ngRoute']);

		app.config(function($routeProvider){

			$routeProvider
				.when('/', {
			  	templateUrl: '/views/home.html',
			  	controller: 'homeController',
			  })
				.when('/monitor', {
			    templateUrl: '/views/monitor.html',
			    controller: 'monitorController'
			  })
				.otherwise({
		        redirectTo: '/'
		      });
		});

		app.controller('homeController', function($scope,$rootScope,$location){
			$scope.appname = 'Twitter Sentiment Analysis';
			$scope.analyzePhrase = function(){
				$rootScope.testphrase=$scope.phrase;
				if($scope.phrase)
					$location.path("/monitor");
			};

		});

		app.controller('monitorController', function($scope,$rootScope,$timeout,$location){
			if(!$rootScope.testphrase)
				$location.path('/');
			else{
				$rootScope.showLoader= false;
				$scope.feeds=[];
				$scope.monitoringPhase='pause';
				socket = io.connect('http://localhost:3000');
				socket.emit('monitor',$rootScope.testphrase);
				socket.on('feedsupdate',function(res){
					console.log(res)
			        $timeout(function() {
						$scope.feeds.push(res);
			        }, 1000);
				})

				$scope.pauseMonitoring = function(){
					socket.emit('pauseStreaming',$rootScope.testphrase);
				}

				$scope.resumeMonitoring = function(){
					socket.emit('monitor',$rootScope.testphrase);
				}
				$scope.reset = function(){
					socket.emit('pauseStreaming',$rootScope.testphrase);
					$location.path('/');
				}				
				$scope.changeState = function(){
					if($scope.monitoringPhase=='pause'){
						$scope.monitoringPhase='resume'
						$scope.pauseMonitoring();
					}
					else{
						$scope.monitoringPhase='pause'
						$scope.resumeMonitoring();
					}
				}		
			}

		});

		return app;

	}
);