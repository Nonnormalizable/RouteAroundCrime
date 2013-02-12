var map;
var directionsService = new google.maps.DirectionsService();
var directionsDisplay = new google.maps.DirectionsRenderer(preserveViewport=true);
var markersArray = Array(100);
var polyLineArray = Array();
var arrayOfRouteCrimeObjects = Array();
var useCustomRouteDisplay = true;
var doDisplayCrimeMarkers = false;
var rateMax = 1.02;

// Full brightness and saturation, hues 126 to 0
// http://www.eyecon.ro/colorpicker/
// Google maps doesn't like rbga, apparently.
var arrayOfColors = [
    "#00ff1a",
    "#22ff00", // green
    "#5eff00",
    "#99ff00", // green-yellow
    "#d5ff00",
    "#ffee00", // yellow
    "#ffb300",
    "#ff7700", // orange
    "#ff3c00",
    "#ff0000" // red
]
var arrayOfColorsTransparent = [
    "rgba(0,255,26,0.7)",
    "rgba(34,255,0,0.7)", // green
    "rgba(94,255,0,0.7)",
    "rgba(153,255,0,0.7)", // green-yellow
    "rgba(213,255,0,0.7)",
    "rgba(255,238,0,0.7)", // yellow
    "rgba(255,179,0,0.7)",
    "rgba(255,119,0,0.7)", // orange
    "rgba(255,60,0,0.7)",
    "rgba(255,0,0,0.7)" // red
]

$(function() {
    $("#submitButton").click(function() {
        calcRoute();
    });

    $("#ex_1").click(function() {
	start = '59th & Genoa, Oakland, CA';
	end = '55th & Telegraph, Oakland, CA';
	$('#start').val(start);
	$('#end').val(end);
        calcRoute(start, end);
    });
    $("#ex_2").click(function() {
	start = 'Tunnel & Bridge, Oakland, CA';
	end = 'Gravatt & Grand View, Oakland, CA';
	$('#start').val(start);
	$('#end').val(end);
        calcRoute(start, end);
    });
    $("#ex_3").click(function() {
	start = '3rd & Castro, Oakland, CA';
	end = '12th & Broadway, Oakland, CA';
	$('#start').val(start);
	$('#end').val(end);
        calcRoute(start, end);
    });
});

function initialize()
{
    var mapOptions = {
        center: new google.maps.LatLng(37.83, -122.263),
        zoom: 14,
        mapTypeId: google.maps.MapTypeId.ROADMAP
    };
    map = new google.maps.Map(document.getElementById("map_canvas"),
			      mapOptions);
    directionsDisplay.setMap(map);
}

function calcRoute(start, end)
{
    start = typeof start !== 'undefined' ? start : $("#start").val();
    end = typeof end !== 'undefined' ? end : $("#end").val();
    var request = {
	origin:start,
	destination:end,
	travelMode: google.maps.TravelMode.WALKING,
	provideRouteAlternatives: true
    }
    clearResults();
    arrayOfRouteCrimeObjects = Array();
    $('#route_table').hide();
    $('#summary_text').hide();
    directionsService.route(request, function(result, status) {
	if (status == google.maps.DirectionsStatus.OK) {
	    if (useCustomRouteDisplay) {
		// Set defaule Google route display to invisible
		// and just use for zooming viewport once.
		directionsDisplay.setOptions({polylineOptions: {visible: false}});
		directionsDisplay.setOptions({preserveViewport: false});
		directionsDisplay.setRouteIndex(0);
		directionsDisplay.setDirections(result);
		showRouteNumber(0);
	    } else {
		directionsDisplay.setOptions({preserveViewport: false});
		directionsDisplay.setDirections(result);
	    }
	}
	for (i in result.routes) {
	    var polyLineArrayOfThisRoute = Array();
	    for (j in result.routes[i].legs[0].steps) {
		var polyLineCoordsOfThisStep = [];
		var path = result.routes[i].legs[0].steps[j].path;
		for (k in path) {
		    polyLineCoordsOfThisStep.push(new google.maps.LatLng(path[k].Ya, path[k].Za))
		}
		var polylineOfThisStep = new google.maps.Polyline({
		    path: polyLineCoordsOfThisStep,
		    strokeColor: "#000000",
		    strokeOpacity: 0.9,
		    strokeWeight: 5
		});
		polyLineArrayOfThisRoute.push(polylineOfThisStep);
	    }
	    polyLineArray.push(polyLineArrayOfThisRoute);
	    }
	createRouteTable();
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
		    var routeLength = result.routes[data.routeNum].legs[0].distance.value;
		    var routeCrimeCount = data.paths[0].pathCount;
		    var rate = routeCrimeCount/routeLength;
		    // If route N has half as many total crimes as route 0, I don't care about its length.
		    // Normalize to crime rate of 0th route.
		    var adjustedRate = routeCrimeCount/result.routes[0].legs[0].distance.value;
		    console.log('routeNum =', data.routeNum,
				'and time taken =', endTime-startTime,
				'route length', routeLength,
				', crime count', routeCrimeCount,
				', c/l', rate,
				'adjustedRate', adjustedRate);
		    var routeCrimeObject = {
			name: "Google_"+data.routeNum,
			numCrimes: routeCrimeCount};
		    // This is the most embarrassing "sort" in the universe. Make more efficient on general principle.
		    var position = 0;
		    while (arrayOfRouteCrimeObjects[position] &&
			   arrayOfRouteCrimeObjects[position].numCrimes < routeCrimeObject.numCrimes)
		    {
			position++;
		    }
		    arrayOfRouteCrimeObjects.splice(position, 0, routeCrimeObject);
		    addTableLine(data.routeNum, data.paths[0].pathCount, position,
				 adjustedRate);
		    createMarkersArray(data, data.routeNum);
		    for (j in polyLineArray[data.routeNum]) {
			polyLineArray[data.routeNum][j].setOptions({strokeColor: colorForCrimeRate(adjustedRate, false)});
		    }
		    showRouteNumber(data.routeNum);
		    displayCrimes(data.routeNum);
		    updateSummary(routeCrimeObject, position, result.routes.length);
		},
		error: function(jqXHR, textStatus, errorThrown) {
		    console.error("ERROR in call to points_for_a_path:", errorThrown);
		}
	    });
	}
    });
}

function colorForCrimeRate(rate, transparent)
{
    var c;
    if (rate < 0.1*rateMax) {c=0;}
    else if (rate < 0.2*rateMax) {c=1;}
    else if (rate < 0.3*rateMax) {c=2;}
    else if (rate < 0.4*rateMax) {c=3;}
    else if (rate < 0.5*rateMax) {c=4;}
    else if (rate < 0.6*rateMax) {c=5;}
    else if (rate < 0.7*rateMax) {c=6;}
    else if (rate < 0.8*rateMax) {c=7;}
    else if (rate < 0.9*rateMax) {c=8;}
    else {c=9;}
    
    var color;
    
    if (transparent) {color = arrayOfColorsTransparent[c];}
    else {color = arrayOfColors[c];}
    return color;
}

function showRouteNumber(num) {
    if (useCustomRouteDisplay) {
	for (i in polyLineArray) {
	    if (i==num) {
		for (j in polyLineArray[i]) {
		    if (!polyLineArray[i][j].getMap()) polyLineArray[i][j].setMap(map);
		}
	    }
	    else {
		for (j in polyLineArray[i]) {
		    if (polyLineArray[i][j].getMap()) polyLineArray[i][j].setMap(null);
		}
	    }
	}
    }
    else {
	directionsDisplay.setOptions({preserveViewport: true});
	directionsDisplay.setRouteIndex(num);
    }
}

function createRouteTable()
{
    $('#intro_text').hide('slow');
    $('#route_table').remove();
    $('#intro_text').after('\
          <table id="route_table" class="table">\
            <thead>\
              <tr>\
                <th>Route<img hspace="35"></img></th>\
                <th>Crime Rating, 0&ndash;100</th>\
              </tr>\
            </thead>\
            <tbody id="route_table_body">\
            </tbody>\
          </table>\
');
}

function addTableLine(routeNum, crimeCount, position, rate)
{
    var rateString = (rate/rateMax*100).toFixed(0);
    //if (rateString>10) {rateString = (rateString).toFixed(0);}
    //else {rateString = (rateString).toFixed(1);}
    var table_body = $("#route_table_body");
    if (position==0) {
	table_body.prepend($('<tr>', {
	    id: 'route_table_line_googlerouteNum'+routeNum,
	    mouseenter: function () {
		showRouteNumber(parseInt(routeNum));
		displayCrimes(parseInt(routeNum));
		$(this).css('font-weight', 'bold');
	    },
	    mouseleave: function() {
		$(this).css('font-weight', 'normal');
	    },
	    html: '<td>Google route #'+(parseInt(routeNum)+1)+'</td><td>'+rateString+'</td>'
	}));
    }
    else {
	$("#route_table_body tr:nth-child("+position+")").after($('<tr>', {
	    id: 'route_table_line_googlerouteNum'+routeNum,
	    mouseenter: function () {
		showRouteNumber(parseInt(routeNum));
		displayCrimes(parseInt(routeNum));
	    },
	    html: '<td>Google route #'+(parseInt(routeNum)+1)+'</td><td>'+rateString+'</td>'
	}));
    }
    var color = colorForCrimeRate(rate, true);
    $('#route_table_line_googlerouteNum'+routeNum).css('background', color)
}

function updateSummary(routeCrimeObject, position, numRoutes)
{
    if (position == 0) {
	var ntext;
	switch (routeCrimeObject.name) {
	case 'Google_0': ntext = "1st"; break;
	case 'Google_1': ntext = "2nd"; break;
	case 'Google_2': ntext = "3rd"; break;
	}
	$('#summary_text').html('Your safest route is Google&rsquo;s '+ntext+' choice!');
    }
    if (arrayOfRouteCrimeObjects.length >= numRoutes)
    {
	var safestIndex = parseInt(arrayOfRouteCrimeObjects[0].name[7]);
	setTimeout(
	    function() {
		$('#summary_text').show();
		showRouteNumber(safestIndex);
		displayCrimes(safestIndex);
	    },
	    900);
    }
}

function displayCrimes(which)
{
    if (doDisplayCrimeMarkers) {
	which = typeof which !== 'undefined' ? which : -1;
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
    }
};

function createMarkersArray(data, which)
{
    which = typeof which !== 'undefined' ? which : -1;
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

function launchAdditionalRoutes(result)
{
    //waypoints: [{location: new google.maps.LatLng(37.844890, -122.264520), stopover: false}]
    
}

function removeCrimesCount(which)
{
    which = typeof which !== 'undefined' ? which : -1;
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
    for (i in polyLineArray) {
	for (j in polyLineArray[i]) {
	    polyLineArray[i][j].setMap(null);
	}
	polyLineArray[i].length = 0;
    }
    polyLineArray.length = 0;
}


