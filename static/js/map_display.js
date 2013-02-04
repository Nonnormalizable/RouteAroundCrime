var map;
var directionsService = new google.maps.DirectionsService();
var directionsDisplay;

var testLoc = new google.maps.LatLng(37.84200, -122.26245);
var marker = new google.maps.Marker({
    position: testLoc,
    title: "Hello marker!"
});

function initialize()
{
    directionsDisplay = new google.maps.DirectionsRenderer();
    var mapOptions = {
        center: new google.maps.LatLng(37.835, -122.263),
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
			      mapOptions);
    directionsDisplay.setMap(map);
    marker.setMap(map);
}

function calcRoute()
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
}

function lookAtResult(directionResult)
{
    for (i=0; i<directionResult.routes.length; i++)
    {
	console.log(i)
	//console.log(directionResult.routes[i])
    }
}
