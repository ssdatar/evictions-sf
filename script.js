var eviction_data = data; //Import data

//Initialize map, so that you can add-remove it
var map = L.map('map', {
	  scrollWheelZoom: false,
	  center: [37.773972, -122.431297],
	  zoom: 12
	});

$(document).ready(function() {
	//Don't show container until user has fed in values
	$('#map').hide();
	// $('#user-error').hide();
	
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
				$('#user-error').text(' Sorry, this location is not in San Francisco');
				//console.log('Sorry, this location is not in SF');
			} else {
				var userCoordinates = data.features[0].geometry.coordinates;
				var userLat = userCoordinates[1],
					userLong = userCoordinates[0];

				var evictionNum = pointsToPlot(userLat, userLong).length;

				//Get GeoJSON of all points within one-mile radius
				var evictionPts = toGeoJSON(pointsToPlot(userLat, userLong));

				var text = evictionNum + ' renters have been asked to leave their homes within a 1-mile radius around you, since 2011.';
				
				$('#eviction-count').text(text);

				drawMap(userLat, userLong, evictionPts);
			}
		});
	});



/*------- DRAW THE MAP ---*/

function drawMap(userLat, userLong, evictionPts) {
	$('#map').show();
	$('#user-error').empty();

	if (map !== undefined) { 
		map.remove();
	}

	map = L.map('map', {
	  scrollWheelZoom: false,
	  center: [userLat, userLong],
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

	var dataLayer = L.geoJson(evictionPts, {
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

			layer.on('click', function(e) {
				console.log(e);
				var location = e.latlng;
				var sv = new google.maps.StreetViewService();
				var panorama = new google.maps.StreetViewPanorama(document.getElementById('pano'));

				sv.getPanorama({location: location, radius: 50}, processSVdata);

				function processSVdata (data, status) {
					if (status === google.maps.StreetViewStatus.OK) {
						panorama.setPano(data.location.pano);
						panorama.setPov({
							heading: 270,
							pitch: 0
						});
						panorama.setVisible(true);
				} else {
					console.error('Street View data not found for this location.');
				}
			}
		});
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

function pointsToPlot (userLat, userLong) {
	var filtered_data = [];
	var dist, evLat, evLong;

	for (var i = 0; i < eviction_data.length; i++) {
		evLat = parseFloat(eviction_data[i]['lat']);
		evLong = parseFloat(eviction_data[i]['long']);
		dist = calculateDist(userLat, userLong, evLat, evLong);
	
	//If point is within 1 mile radius, show it
	if (dist <= 1) {
		filtered_data.push(eviction_data[i]);
	   } 
	}
	return filtered_data;
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
