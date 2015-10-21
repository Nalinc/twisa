define([], function() {

		var app = angular.module('app', ['ngRoute']);

		app.config(function($routeProvider, $urlRouterProvider){

			$urlRouterProvider.otherwise('/');

			$routeProvider
				.when('/', {
			  	templateUrl: '/views/home.html',
			  	controller: 'homeController',
			  })
			  .when('/monitor', {
			    templateUrl: '/views/monitor.html',
			    controller: 'monitorController'
			  });
		});

		app.controller('homeController', function($scope,$rootScope){
			$scope.appname= 'Twitter Sentiment Analysis';
		});

		app.controller('monitorController', function($scope,$rootScope){
			$rootScope.showLoader= false;
		});

		return app;

	}
);