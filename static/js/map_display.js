var map;
var directionsService = new google.maps.DirectionsService();
var directionsDisplay = new google.maps.DirectionsRenderer(preserveViewport=true);
var markersArray = Array()

$(function() {
    $("#route0_line").mouseenter(function() {
	directionsDisplay.setOptions({preserveViewport: true});
	directionsDisplay.setRouteIndex(0);
	displayCrimes(0);
    });
    $("#route1_line").mouseenter(function() {
	directionsDisplay.setOptions({preserveViewport: true});
	directionsDisplay.setRouteIndex(1);
	displayCrimes(1);
    });
    $("#route2_line").mouseenter(function() {
	directionsDisplay.setOptions({preserveViewport: true});
	directionsDisplay.setRouteIndex(2);
	displayCrimes(2);
    });
});
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
    directionsDisplay.setOptions({preserveViewport: false});
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
	    success: function(data) {
		console.log('Total paths ', data.paths.length);
		displayCrimesCount(data);
		createMarkersArray(data);
		displayCrimes(0);
	    },
	    error: function() {console.error("ERROR in call to points_for_multiple_paths");}
	});
    });
}

function displayCrimes(which = -1)
{
    for (i in markersArray) {
	if (i == which || which == -1) {
	    for (j in markersArray[i]) {
		markersArray[i][j].setMap(map);
	    }
	}
	else {
	    for (j in markersArray[i]) {
		markersArray[i][j].setMap(null);
	    }
	}
    }
};

function createMarkersArray(data)
{
    removeMarkers();
    for (p in data.paths) {
	var newArray = Array();
	var latLons = data.paths[p].latLons;
	for (i in latLons) {
	    var marker = new google.maps.Marker({
		position: new google.maps.LatLng(latLons[i][0], latLons[i][1]),
		title: "Path "+p+", marker "+i
	    });
	    newArray.push(marker);
	}
	markersArray.push(newArray);
    }
};

function displayCrimesCount(data)
{
    for (p in data.paths) {
	var pathCount = data.paths[p].pathCount;
	$("#route"+p+"_crimeNumber").html(pathCount)
    }
};


function removeMarkers()
{
    if (markersArray) {
	for (i in markersArray) {
	    for (j in markersArray[i]) {
		markersArray[i][j].setMap(null);
	    }
	    markersArray[i].length = 0;
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