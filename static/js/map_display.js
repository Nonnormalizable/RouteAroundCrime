var map;
var directionsService = new google.maps.DirectionsService();
var directionsDisplay = new google.maps.DirectionsRenderer();
var markersArray = Array()

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
    var start = $("#start").val();
    var end = $("#end").val();
    var request = {
	origin:start,
	destination:end,
	travelMode: google.maps.TravelMode.WALKING,
	provideRouteAlternatives: true
    }
    directionsService.route(request, function(result, status) {
	if (status == google.maps.DirectionsStatus.OK) {
	    directionsDisplay.setDirections(result);
	}
	//lookAtResult(result);
	$.ajax({
	    url: "/_points_for_multiple_paths",
	    type: "POST",
	    dataType: "json",
	    contentType: "json",
	    data: JSON.stringify(result),
	    success: function(data) {displayCrimes(data);},
	    error: function() {console.error("ERROR in call to points_for_multiple_paths");}
	});
    });
}

function displayCrimes(data)
{
    removeMarkers();
    var latLons = data.latLons;
    var pathCount = data.pathCount;
    console.log(latLons.length, data.pathCount);
    for (i in latLons) {
	var marker = new google.maps.Marker({
	    position: new google.maps.LatLng(latLons[i][0], latLons[i][1]),
	    title: "Hello marker! "+i
	});
	markersArray.push(marker)
    }
    for (i in markersArray) {
	markersArray[i].setMap(map);
    }
    $("#route1_crimeNumber").html(pathCount)

};


function removeMarkers() {
  if (markersArray) {
    for (i in markersArray) {
      markersArray[i].setMap(null);
    }
      markersArray.length = 0;
  }
}


function lookAtResult(directionResult)
{
    for (i=0; i<directionResult.routes.length; i++)
    {
	console.log('Route number ', i)
	console.log(directionResult.routes[i])
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
	callback(locations, data.pathCount);
    });
}