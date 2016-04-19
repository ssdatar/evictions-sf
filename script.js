var eviction_data = data; //Import data

//Initialize map, so that you can add-remove it
var map = L.map('map', {
	  scrollWheelZoom: false,
	  //center: [37.773972, -122.431297],
	  zoom: 12
	});

$(document).ready(function() {
	//Don't show container until user has fed in values
	$('#map').hide();
	$('#user-error').hide();
	$('.graph-wrapper').hide();
	
	$('form').submit(function (e) {
		var userInput = $('#location-input').val();
		e.preventDefault();

		//Get coordinates for user input
		var mapzen = 'https://search.mapzen.com/v1/search?'
		$.getJSON( mapzen, {
			api_key: 'search-66RFD1I',
			text: userInput,
			size: 1
		})
		.done(function (data) {
			// console.log(data.features[0]);

			//If it is not in SF, don't plot
			if (data.features[0].properties.county !== "San Francisco County") {
				$('#user-error').show().delay(5000).fadeOut();
				//console.log('Sorry, this location is not in SF');
			} else {
				var userCoordinates = data.features[0].geometry.coordinates;
				var userLat = userCoordinates[1],
					userLong = userCoordinates[0];

				var neighborhood = getNeighborhood(userLat, userLong, eviction_data).neighborhood;

				var evictionPts = pointsToPlot(userLat, userLong, neighborhood);
				//console.log(evictionPts);

				var evictionNum = evictionPts.length;

				//Get GeoJSON of all points within one-mile radius
				var evictionGeoJson = toGeoJSON(pointsToPlot(userLat, userLong, neighborhood));
				//console.log(evictionGeoJson);
				
				//Plot graphs
				plotGraphs(neighborhood);

				//show eviction numbers.
				var text = evictionNum + ' renters have been asked to leave their homes within a 1-mile radius around you, since 2011.';

				var summary = d3.nest()
							.key(function (d) { return d.reason; })
							.entries(evictionPts);
				//console.log(summary)

				summary.sort(function (a, b) {
					return parseInt(b.values.length) - parseInt(a.values.length);
				});

				var highest = summary[0];

				$('#nbd').text(neighborhood);
				$('#total-num').text(evictionNum);
				$('#total-sub').text('evictions since 2011');
				$('#highest-num').text(highest.values.length);
				$('#highest-sub').text('of these were ' + highest.key+' evictions');

				drawMap(userLat, userLong, evictionGeoJson);
			}
		});
	});



/*------- DRAW THE MAP ---*/

function drawMap(userLat, userLong, points) {
	$('#map').show();
	$('#user-error').val('');

	if (map) { 
		map.remove();
	}

	map = L.map('map', {
	  scrollWheelZoom: false,
	  center: [userLat, userLong],
	  zoom: 14
	});

	var marker = L.marker([userLat, userLong]).addTo(map);

	var geojsonMarkerOptions = {
	            radius: 5,
	            fillColor: "#45A1E0",
	            color: "#006CBA",
	            weight: .5,
	            opacity: .5,
	            fillOpacity: 0.7
	        };

	L.tileLayer('http://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', 
		{
			attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors, &copy; <a href="http://cartodb.com/attributions">CartoDB</a>',
			maxZoom: 18
	}).addTo(map);

	var dataLayer = L.geoJson(points, {
		pointToLayer: function(feature, latlng) {
			return L.circleMarker(latlng, geojsonMarkerOptions);
		},
		onEachFeature: function(feature, layer) {
			// var img = 'https://maps.googleapis.com/maps/api/streetview?size=400x400&location=' +
			// feature.geometry.coordinates[1] + ',' + feature.geometry.coordinates[0] + 
			// '&fov=90&heading=235&pitch=10&key=AIzaSyBEMviCy9UbFjO2ATJIhzm-Vac0nlzUSsw';

			// var tooltip = "<img src=" + img + ">";
			var tooltip = feature.properties.reason;

			layer.bindPopup('<p> Reason for eviction: '+ tooltip + '</p>');

		// Street view code, removed it	
		// layer.on('click', function(e) {
		// 		console.log(e);
		// 		var location = e.latlng;
		// 		var sv = new google.maps.StreetViewService();
		// 		var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'));

		// 		sv.getPanorama({location: location, radius: 50}, processSVdata);

		// 		function processSVdata (data, status) {
		// 			if (status === google.maps.StreetViewStatus.OK) {
		// 				panorama.setPano(data.location.pano);
		// 				panorama.setPov({
		// 					heading: 270,
		// 					pitch: 0
		// 				});
		// 				panorama.setVisible(true);
		// 		} else {
		// 			console.error('Street View data not found for this location.');
		// 		}
		// 	}
		// });
	  }
	});
	map.addLayer(dataLayer);
	map.fitBounds(dataLayer.getBounds());
}


/*------- DISTANCE BETWEEN USER POINT AND EVICTION POINTS ---*/

//http://stackoverflow.com/questions/27928/calculate-distance-between-two-latitude-longitude-points-haversine-formula/27943
function calculateDist (userLat, userLong, evLat, evLong) {
	var p = 0.017453292519943295;    // Math.PI / 180
	var c = Math.cos;
	
	var a = 0.5 - c((evLat - userLat) * p)/2 + 
         c(userLat * p) * c(evLat * p) * 
         (1 - c((evLong - userLong) * p))/2; 

    var d = 12742 * Math.asin(Math.sqrt(a)); // 2 * R; R = 6371 km

    return d * 0.621371;
}

/*------- GET POINTS TO PLOT BASED ON USER INPUT ---*/

function pointsToPlot (userLat, userLong, nbd) {

	var filtered_data = eviction_data.filter( function (d) {
		return d.neighborhood == nbd;
	})
	// var dist, evLat, evLong;
	// var nearestPoint;

	// for (var i = 0; i < eviction_data.length; i++) {
	// 	evLat = parseFloat(eviction_data[i]['lat']);
	// 	evLong = parseFloat(eviction_data[i]['long']);
	// 	dist = calculateDist(userLat, userLong, evLat, evLong);
	
	// //If point is within 1 mile radius, show it
	// if (dist <= 0.5) {
	// 	filtered_data.push(eviction_data[i]);
	//    } 
	// }
	return filtered_data;
}

/*------- GET NEIGHBORHOOD TO PLOT GRAPHS ---*/

function getNeighborhood(userLat, userLong, evictionPts) {
	var d = 0.5,
		temp;
	var nearest;

	for (var i = 0; i < evictionPts.length; i++) {
		evLat = parseFloat(evictionPts[i]['lat']);
		evLong = parseFloat(evictionPts[i]['long']);

		temp = calculateDist(userLat, userLong, evLat, evLong);

		if (temp < d) {
			d = temp;
			nearest = evictionPts[i];
		}

	}
	//console.log(d);
	return nearest;
}

/*------- PLOT GRAPHS FOR NEIGHBORHOOD ---*/
function plotGraphs(nbd) {
	$('.graph-wrapper').show();

	var graphPoints;

	graphPoints = eviction_data.filter(function (d) {
		return d.neighborhood == nbd;
	});

	//console.log(graphPoints);
	var totalData = d3.nest()
	    .key(function (d) {return d.reason; })
	    .entries(data);
	
	totalData.sort(function (a, b) {
		return b.values.length - a.values.length;
	});
	
	var top5 = [];

	for (var i = 0; i < 5; i++) {
		top5.push(totalData[i]);
	}

	//console.log(top5)

	makeTotalChart(top5);
}

/*------- MAKE BAR CHART FOR OVERALL TREND ---*/

function makeTotalChart(inData) {

	var margin = {top: 10, right: 10, bottom: 10, left: 10};
	var div = d3.select('#total-graph').node().getBoundingClientRect();

	var width = div.width - margin.left - margin.right,
	    height = div.height - margin.top - margin.bottom,
	    innerPadding = 40;

	var max = inData[0].values.length;
	var min = inData[inData.length - 1].values.length;

	//Scale for x axis
	var xScale = d3.scale.linear()
	.domain([0, max])
	.range([0, width - innerPadding]);

	console.log(max)
	console.log(xScale(max));

	var yScale = d3.scale.ordinal()
	.domain(inData.map( function (d) {
		return d.key;
	}))
	.rangeRoundBands([0, height - 20], .1);

	var xAxis = d3.svg.axis()
	.scale(xScale)
	.orient("bottom");

	var yAxis = d3.svg.axis()	
	.scale(yScale)
	.orient("left")
	.tickFormat(function (d) { return ''; }) //Don't show categories on Y axis

	var svg = d3.select('#total-graph')
	.append('svg')
	.attr('width', '100%')
	.attr('height', '100%')
	.attr('viewBox','0 0 '+ width+ ' ' + height)
    .attr('preserveAspectRatio','xMinYMin')
	.append('g')
	// .attr("transform", "translate(" + Math.min(width,height) / 2 + "," + Math.min(width,height) / 2 + ")");
	.attr('transform', 'translate(' + margin.left + ',0)')

	svg.append('g')
	.attr('class', 'x axis')
	.attr("transform", "translate(0," + (height - 20) + ")")
	.call(xAxis);

	svg.append('g')
	.attr('class', 'y axis')
	.call(yAxis);

	var barG = svg.append('g');

	//Append data
	var barData = barG.selectAll("g")
	.data(inData)
	.enter()
	.append('g');

	barData.append('rect')
	.attr('class', 'bar')
	.attr('x', xScale(0))
	.attr('y', function (d) { return yScale(d.key); })
	.attr('width', 0)
	.transition()
	.attr('width', function (d) { return xScale(d.values.length); })
	.attr('height', yScale.rangeBand() - 10)

	//console.log(barData);

	// Text for types of evictions
	barData.append('text')
	.attr('x', 0)
	.attr('y', function (d) { return yScale(d.key); })
	.attr('class', 'label')
	.text(function (d) { return d.key; })
	.attr('dx', function (d, i) {
		if (i > 2) {
			return '9em';
		} else {
			return '1em';
		}
	})
	.attr('dy', '2em')
	.attr('fill', function (d, i) {
		if (i > 2) {
			return '#545454';
		} else {
			return 'white';
		}
	});

	// Numbers for bar
	barData.append('text')
	.attr('x', function (d) { return xScale(d.values.length) - 15; })
	.attr('y', function (d) { return yScale(d.key); })
	.attr('class', 'number')
	.text(function (d) { return d.values.length; })
	.attr('dy','2.4em')
	.attr('text-anchor', 'end')
	.attr('fill', 'white');
	
}



/*------- CONVERT TO GEOJSON TO DISPLAY ON LEAFLET MAP ---*/

function toGeoJSON (pointsArray) {

	var geoArray = [];
	var featureObj = {};

	var geoData = {
              "type": "FeatureCollection"
            };

	for (var obj in pointsArray) {
		featureObj = {
			"type": "Feature",
			"properties": {
				"zip": pointsArray[obj]['zip'],
				"date": pointsArray[obj]['date'],
				"address": pointsArray[obj]['address'],
				"neighborhood": pointsArray[obj]['neighborhood'],
				"year": pointsArray[obj]['year'],
				"reason": pointsArray[obj]['reason'],
			},
			"geometry" : {
				"type": "Point",
				"coordinates" : [pointsArray[obj]['long'], pointsArray[obj]['lat']]
			}
		};
		geoArray.push(featureObj);
	}

	geoData["features"] = geoArray;

	return geoData;
  }
});
