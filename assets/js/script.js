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
  $('#graph-wrapper').hide();
  
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
  //  evLat = parseFloat(eviction_data[i]['lat']);
  //  evLong = parseFloat(eviction_data[i]['long']);
  //  dist = calculateDist(userLat, userLong, evLat, evLong);
  
  // //If point is within 1 mile radius, show it
  // if (dist <= 0.5) {
  //  filtered_data.push(eviction_data[i]);
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
  $('#graph-wrapper').show();

  var graphPoints;

  graphPoints = eviction_data.filter(function (d) {
    return d.neighborhood == nbd;
  });

  // Data to build overall chart for eviction trends
  // in this particular neighborhood

  var totalData = d3.nest()
    .key(function (d) {return d.reason; })
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
  makeTotalChart(top5, nbd);

  //Data to make time trends for top 5 evictions
  makeTrendChart(top5);
  
}

/*------- MAKE BAR CHART FOR OVERALL TREND ---*/

function makeTotalChart(inData, nbd) {

  //console.log(inData)

  var categs = [],
      data = [];

  _.each(inData, function(d) {
    categs.push(d.key);
    data.push(d.values.length);
  });

  $(function () {
    $('#total-graph').highcharts({
        chart: {
            type: 'column'
        },
        title: {
            text: 'Top 5 reasons for evictions in ' + nbd 
        },
        subtitle: {
          text: 'Source: San Francisco Rent Board',
          x: -20
        },
        xAxis: {
            categories: categs
        },
        yAxis: {
            min: 0,
            title: {
                text: 'Number of eviction notices',
                align: 'high'
            },
            labels: {
              overflow: 'justify'
            },
          },

        plotOptions: {
          column: {
            dataLabels: {
                enabled: true
            }
          }
        },
        credits: {
          enabled: false
        },
        series: [{
          name: 'Evictions in ' + nbd,
          data: data
        }]
      });
    });  
}

function makeTrendChart (inData) {
  var categs = [],
      data = [];

  var a = _.each(inData, function(d) {
    var b = _.groupBy(d.values, function(e) { return e.year; });
    var chartObj = {}
    chartObj.name = d.key;
    chartObj.data = [];

    _.each(b, function(k) {
      chartObj.data.push(k.length);
    })
    //categs.push(d.key);
    data.push(chartObj);
  });

  //console.log(categs)
  //console.log(data)

  $(function () {
    $('#trend-graph').highcharts({
      title: {
          text: 'Eviction trends over past five years',
          x: -20 //center
      },
      subtitle: {
          text: 'Source: San Francisco Rent Board',
          x: -20
      },
      xAxis: {
          categories: ['2011', '2012', '2013', '2014', '2015']
      },
      yAxis: {
          title: {
              text: 'Number of evictions'
          },
          plotLines: [{
              value: 0,
              width: 1,
              color: '#808080'
          }]
      },
      credits: {
        enabled: false
      },
      legend: {
          layout: 'horizontal',
          align: 'right',
          verticalAlign: 'bottom',
          borderWidth: 0
      },
      series: data
    });
  });

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
