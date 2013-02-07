var map;
var directionsService = new google.maps.DirectionsService();
var directionsDisplay = new google.maps.DirectionsRenderer(preserveViewport=true);
var markersArray = Array(100);
var arrayOfRouteCrimeObjects = Array();

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
    arrayOfRouteCrimeObjects = Array();
    $('#route_table').hide();
    $('#summary_text').hide();
    directionsService.route(request, function(result, status) {
	if (status == google.maps.DirectionsStatus.OK) {
	    directionsDisplay.setDirections(result);
	}
	//lookAtResult(result);
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
		    console.log('routeNum =', data.routeNum, 'inside success', 'and time taken =', endTime-startTime);
		    var routeCrimeObject = {
			name: "Google_"+data.routeNum,
			numCrimes: data.paths[0].pathCount};
		    // This is the most embarrassing "sort" in the universe. Make more efficient on general principle.
		    var position = 0;
		    while (arrayOfRouteCrimeObjects[position] &&
			   arrayOfRouteCrimeObjects[position].numCrimes < routeCrimeObject.numCrimes)
		    {
			position++;
		    }
		    arrayOfRouteCrimeObjects.splice(position, 0, routeCrimeObject);
		    addTableLine(data.routeNum, data.paths[0].pathCount, position);
		    createMarkersArray(data, data.routeNum);
		    directionsDisplay.setRouteIndex(data.routeNum);
		    displayCrimes(data.routeNum);
		    updateSummary(routeCrimeObject, position);
		},
		error: function(jqXHR, textStatus, errorThrown) {
		    console.error("ERROR in call to points_for_a_path:", errorThrown);
		}
	    });
	}
    });
}

function createRouteTable()
{
    $('#intro_text').hide('slow');
    $('#route_table').remove();
    $('#intro_text').after('\
          <table id="route_table" class="table table-hover">\
            <thead>\
              <tr>\
                <th>Route<img hspace="35"></img></th>\
                <th>Crimes</th>\
              </tr>\
            </thead>\
            <tbody id="route_table_body">\
            </tbody>\
          </table>\
');
}

function addTableLine(routeNum, crimeCount, position)
{
    var table_body = $("#route_table_body");
    if (position==0) {
	table_body.prepend($('<tr>', {
	    id: 'route_table_line_googlerouteNum'+routeNum,
	    mouseenter: function () {
		directionsDisplay.setOptions({preserveViewport: true});
		directionsDisplay.setRouteIndex(parseInt(routeNum));
		displayCrimes(parseInt(routeNum));
	    },
	    html: '<td>Google route #'+(parseInt(routeNum)+1)+'</td><td>'+crimeCount+'</td>'
	}));
    }
    else {
	$("#route_table_body tr:nth-child("+position+")").after($('<tr>', {
	    id: 'route_table_line_googlerouteNum'+routeNum,
	    mouseenter: function () {
		directionsDisplay.setOptions({preserveViewport: true});
		directionsDisplay.setRouteIndex(parseInt(routeNum));
		displayCrimes(parseInt(routeNum));
	    },
	    html: '<td>Google route #'+(parseInt(routeNum)+1)+'</td><td>'+crimeCount+'</td>'
	}));
    }
}

function updateSummary(routeCrimeObject, position)
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
    if (arrayOfRouteCrimeObjects.length >=3)
    {
	var safestIndex = parseInt(arrayOfRouteCrimeObjects[0].name[7]);
	setTimeout(
	    function() {
		$('#summary_text').show();
		directionsDisplay.setRouteIndex(safestIndex);
		displayCrimes(safestIndex);
	    },
	    900);
    }
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

