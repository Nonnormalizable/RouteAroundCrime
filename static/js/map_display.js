var map;
var directionsService = new google.maps.DirectionsService();
var directionsDisplay = new google.maps.DirectionsRenderer(preserveViewport=true);
var markersArray = Array(100);

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
    clearResults();
    directionsService.route(request, function(result, status) {
	if (status == google.maps.DirectionsStatus.OK) {
	    directionsDisplay.setDirections(result);
	}
	//lookAtResult(result);
	for (i in result.routes) {
	    var startTime = new Date().getTime();
	    route = result.routes[i];
	    route['routeNum'] = i;
	    jsonToServer = JSON.stringify(route);
	    $.ajax({
		url: "/_points_for_a_path",
		type: "POST",
		dataType: "json",
		contentType: "json",
		data: jsonToServer,
		success: function(data) {
		    var endTime = new Date().getTime();
		    console.log('routeNum =', data.routeNum, 'inside success', 'and time taken =', endTime-startTime);
		    addTableLine(data.routeNum, data.paths[0].pathCount);
		    displayCrimesCount(data, data.routeNum);
		    createMarkersArray(data, data.routeNum);
		    directionsDisplay.setRouteIndex(data.routeNum);
		    displayCrimes(data.routeNum);
		},
		error: function(jqXHR, textStatus, errorThrown) {
		    console.error("ERROR in call to points_for_a_path:", errorThrown);
		}
	    });
	}
    });
}

function addTableLine(routeNum, crimeCount)
{
    var table_body = $("#route_table_body");
    table_body.append($('<tr>', {
//	id: routeString,
	mouseenter: function () {
	    directionsDisplay.setOptions({preserveViewport: true});
	    directionsDisplay.setRouteIndex(parseInt(routeNum));
	    displayCrimes(parseInt(routeNum));
	},
	html: '<td>Google route #'+(parseInt(routeNum)+1)+'</td><td>'+crimeCount+'</td>'
    }));
//    $('#'+routeString).html($('<td>', {
//	html: routeString}));
//    table_body.append($('<td>', {
//	html:crimeCount}));
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

function createMarkersArray(data, which = -1)
{
    if (which == -1) {
	// Assume location in data.paths is for real.
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
	    markersArray[p] = newArray;
	}
    }
    else {
	// Assume data.paths.length==1.
	var newArray = Array();
	var latLons = data.paths[0].latLons;
	for (i in latLons) {
	    var marker = new google.maps.Marker( {
		position: new google.maps.LatLng(latLons[i][0], latLons[i][1]),
		title: "Path "+which+", marker "+i
	    });
	    newArray.push(marker);
	}
	markersArray[which] = newArray;
    }
};

function displayCrimesCount(data, which=-1)
{
    if (which==-1) {
	for (p in data.paths) {
	    var pathCount = data.paths[p].pathCount;
	    $("#route"+p+"_crimeNumber").html(pathCount)
	}
    }
    else {
	var pathCount = data.paths[0].pathCount;
	$("#route"+which+"_crimeNumber").html(pathCount);
    }
};

function removeCrimesCount(which=-1)
{
    if (which==-1) {
	for (var i=0; i<3; i++) {
	    $("#route"+i+"_crimeNumber").html(0)
	}
    }
    else {
	$("#route"+which+"_crimeNumber").html(0);
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

function clearResults()
{
    removeMarkers();
    directionsDisplay.setOptions({preserveViewport: false});
    directionsDisplay.setMap(null);
    directionsDisplay.setMap(map);
    removeCrimesCount();
}

function lookAtResult(directionResult)
{
    for (i=0; i<directionResult.routes.length; i++)
    {
	console.log('Route number ', i)
	console.log(directionResult.routes[i])
    }
}

