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
	$('.graph-wrapper').hide();
	
	$('form').submit(function (e) {
		var neighborhood = $('#nbd').val();
		e.preventDefault();

		$('#total-graph').empty();

		var evictionPts = pointsToPlot(neighborhood);

		var evictionNum = evictionPts.length;

		var evictionGeoJson = toGeoJSON(evictionPts);

		//Plot graphs
		plotGraphs(neighborhood);

		//show eviction numbers.
		var text = evictionNum + ' renters have been asked to leave their homes within a 1-mile radius around you, since 2011.';

		var summary = d3.nest()
					.key(function (d) { return d.reason; })
					.entries(evictionPts);

		summary.sort(function (a, b) {
			return parseInt(b.values.length) - parseInt(a.values.length);
		});

		var highest = summary[0];
		var second = summary[1];

		$('#nbd-name').text(neighborhood);
		$('#total-num').text(evictionNum);
		$('#total-sub').text('eviction notices since 2011');
		$('#highest-num').text(highest.values.length);
		$('#highest-sub').text('were ' + highest.key+' evictions');
		$('#second-num').text(second.values.length);
		$('#second-sub').text('were ' + second.key+' evictions');

		drawMap(evictionGeoJson);

	});

/*------- DRAW THE MAP ---*/

function drawMap(points) {
	$('#map').show();

	if (map) { 
		map.remove();
	}

	map = L.map('map', {
	  scrollWheelZoom: false,
	  //center: [37.759288, -122.421964],
	  zoom: 14
	});

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

		//Set style for each dot based on type of eviction
		style: function (feature, layer) {
			var f = feature.properties.reason.toLowerCase();
			f = f.replace(' ', '-');

			return { className: f };
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

function pointsToPlot (nbd) {

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

	// Data to build overall chart for eviction trends
	// in this particular neighborhood
	var totalData = d3.nest()
		.key(function (d) {return d.reason; })
		// .rollup(function (d) {
		// 		var result = {};
		// 	return d.map( function (el) {
		// 		return el.year;
		// 		})
		// 	})
		.entries(graphPoints);

		//console.log(totalData)
	
	totalData.sort(function (a, b) {
		return b.values.length - a.values.length;
	});
	
	var top5 = [];
	var overallData = [];

	for (var i = 0; i < 5; i++) {
		top5.push(totalData[i]);
	}

	var others = {key: "Others", values: []}
	overallData.push(others);

	totalData.forEach(function(d) {
		if (d.key === "Breach" || d.key === "Nuisance") {
			overallData.push(d);
		} else {
			d.values.forEach(function(el) {
				overallData[0].values.push(el);
			});
		}		
	});

	overallData.sort(function(a,b) {
		return a.values.length - b.values.length; 
	})
	
	// Pass it to function to build the 
	// overall trend chart
	makeTotalChart(top5);

	//Data to make time trends for top 5 evictions
	makeTrendChart(top5);
	
	// d3.nest()
	//     .key( function (d) { 
	//     	d.values.forEach(function (v) {
	//     		return v.year;
	//     	})
	//     })
	//     .entries(top5)
		// .sort(function (a, b) {
		// 	return b.values.length - a.values.length;
		// })
	 //console.log(trendData)
}

/*------- MAKE BAR CHART FOR OVERALL TREND ---*/

function makeTotalChart(inData) {

	var margin = {top: 10, right: 10, bottom: 10, left: 10};
	var div = d3.select('#total-graph').node().getBoundingClientRect();

	var width = div.width - margin.left - margin.right,
		height = div.height - margin.top - margin.bottom,
		innerPadding = 40;

	var min = inData[0].values.length;
	var max = d3.max(inData, function(d){ return d.values.length; });

	//Scale for X coordinates
	var xScale = d3.scale.linear()
	.domain([0, max])
	.range([0, width - innerPadding]);

	// Scale for Y coordinates
	var yScale = d3.scale.ordinal()
	.domain(inData.map( function (d) {
		return d.key;
	}))
	.rangeRoundBands([0, height - 20], .5, .5);

	// Declare axes
	var xAxis = d3.svg.axis()
	.scale(xScale)
	.orient("bottom");

	var yAxis = d3.svg.axis()	
	.scale(yScale)
	.orient("left")
	.tickFormat(function (d) { return ''; }) //Don't show categories on Y axis

	// Append svg
	var svg = d3.select('#total-graph')
	.append('svg')
	.attr('width', '100%')
	.attr('height', '100%')
	.attr('viewBox','0 0 '+ width + ' ' + height)
	.attr('preserveAspectRatio','xMinYMin')
	.append('g')
	// .attr("transform", "translate(" + Math.min(width,height) / 2 + "," + Math.min(width,height) / 2 + ")");
	.attr('transform', 'translate(' + margin.left + ',0)')

	//Call axes
	svg.append('g')
	.attr('class', 'x axis')
	.attr("transform", "translate(0," + (height - 20) + ")")
	.call(xAxis);

	svg.append('g')
	.attr('class', 'y axis')
	.call(yAxis);

	var barG = svg.append('g');

	//Data joins
	var barData = barG.selectAll("g")
	.data(inData)
	.enter()
	.append('g');

	// Bars
	barData.append('rect')
	.attr('class', 'bar')
	.attr('x', xScale(0))
	.attr('y', function (d) { return yScale(d.key); })
	.attr('width', 0)
	.transition()
	.attr('width', function (d) { return xScale(d.values.length); })
	.attr('height', yScale.rangeBand());

	// Text for types of evictions
	barData.append('text')
	.attr('x', function (d) {
		// If it's a small bar, put text outside it
		if (xScale(d.values.length) < 166) {
			return xScale(d.values.length) + 20;
		} else {
			return 0; // Let name be inside
		}
	})
	.attr('y', function (d) { return yScale(d.key); })
	.attr('class', 'label')
	.text(function (d) { return d.key; })
	.attr('dx', '1em')
	.attr('dy', '1.7em')
	.attr('fill', function(d) {
		if (xScale(d.values.length) < 166) {
			return "#545454";
		}
		return "white";
	});

	// Numbers at the end of the bar
	barData.append('text')
	.attr('x', function (d) {
		return xScale(d.values.length); 
	})
	.attr('y', function (d) { return yScale(d.key); })
	.attr('class', 'number')
	.text(function (d) { return d.values.length; })
	.attr('dx', '-.4em')
	.attr('dy','2.4em')
	.attr('text-anchor', 'end')
	.attr('fill', 'white');
	
}

function makeTrendChart (inData) {
	var margin = {top: 10, right: 10, bottom: 10, left: 10};
	var div = d3.select('#trend-graph').node().getBoundingClientRect();

	var width = div.width - margin.left - margin.right,
		height = div.height - margin.top - margin.bottom,
		innerPadding = 40;

	var temp = [];
	var k, yearObj;	

	for (var j in inData) {
		k = inData[j].key;
		yearObj = {'2011': 0,
				  '2012': 0,
				  '2013': 0,
				  '2014': 0,
				  '2015': 0}

		if (!temp[k]) { temp[k] = yearObj;}
	}


	// for (var j=0; j < inData.length; j++) {
	// 	k = inData[j].key;
	// 	obj.k = ''
	// 	temp[j] = obj;
	// }

	 // inData.forEach( function (d) {
		// return d.values (function (el) {
		// 	if (temp[d.key].key == el) {
		// 		temp[d.key][el] += 1
		// 	}
		// })
	 // })

	 // var wrangledData = inData.forEach(function (d) {
	 // 	d.values.forEach( function (v)  {
	 // 		if (!temp[d.key][v]) {
	 // 			temp[d.key][v] = 1;
	 // 		} else {
	 // 			temp[d.key][v] += 1;
	 // 		}
	 // 	})
	 // })
	 //console.log(temp)

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
