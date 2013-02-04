var map;
var directionsService = new google.maps.DirectionsService();
var directionsDisplay = new google.maps.DirectionsRenderer();

function initialize()
{
    var mapOptions = {
        center: new google.maps.LatLng(37.835, -122.263),
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
			      mapOptions);
    directionsDisplay.setMap(map);
}

function calcRoute(callback)
{
    var start = document.getElementById("start").value;
    var end = document.getElementById("end").value;
    var request = {
	origin:start,
	destination:end,
	travelMode: google.maps.TravelMode.WALKING,
	provideRouteAlternatives: true
    }
    directionsService.route(request, function(result, status)
			    {
				if (status == google.maps.DirectionsStatus.OK) {
				    directionsDisplay.setDirections(result);
				}
				lookAtResult(result);
			    });

    getLocFromServer(function(locations){
	for (var i=0; i<locations.length; i++) {
	    var marker = new google.maps.Marker({
		position: locations[i],
		title: "Hello marker! "+i
	    });
	    marker.setMap(map);
	}
    });
    
}

function lookAtResult(directionResult)
{
    for (i=0; i<directionResult.routes.length; i++)
    {
	console.log('Route number ', i)
	//console.log(directionResult.routes[i])
    }
}

function getLocFromServer(callback)
{
    var locations = new Array();
    $.getJSON("/_points", {}, function(data) {
	for (var i=0; i<data.latLons.length; i++) {
	    locations.push(new google.maps.LatLng(data.latLons[i][0], data.latLons[i][1]));
	}
	//console.log('locations Array', locations);
	callback(locations);
    });
}