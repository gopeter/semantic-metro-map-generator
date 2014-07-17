var SMMG = function() {
  
  this.data = [];
  this.triples = [];
  
  // vars for coordinate calculation
  this.pixelOrigin_ = new google.maps.Point(256 / 2, 256 / 2);
  this.pixelsPerLonDegree_ = 256 / 360;
  this.pixelsPerLonRadian_ = 256 / (2 * Math.PI);    
  
  // API settings
  this.API = {
    "base": "http://semantic-metro-map-gtfs-api.herokuapp.com/api/",
    "agency": "flixbus-gmbh"
  };    
  
  // Init!
  this.init();
};

SMMG.prototype = {

  init: function() {
  
    // event handler
    $(document).hammer();
    $(document).on('tap', 'button', $.proxy(this.fetchData, this));
      
  },
  
  /***************************************
  * Helpers 
  ***************************************/  
    
  objectLength: function(obj) {
    var len = 0;
    for (var o in obj) {
        len++;
    }
    return len;
  },
  
  convertCoordinatesToPixels: function() {

    // iterate through all triples to convert coordinates to pixels
    var coordinates = [];
    for (i in this.triples) {    
    
      var obj = this.triples[i];
      var point = this.fromLatLngToPoint(new google.maps.LatLng(obj.details.stop_lat, obj.details.stop_lon));
      
      var tmp = {
        "stop_id": obj.details.stop_id,
        "x": point.x,
        "y": point.y 
      };
      
      coordinates.push(tmp);
      
    }

    // sort array to find the point in the upper left corner so we can transfer map coordinates to zeroed coordinates for svg elements
    var origin = [];
    var max = {"x": 0, "y": 0};

    coordinates.sort(function(a, b) {
      return parseFloat(a['x']) - parseFloat(b['x']);
    });
    
    origin['x'] = coordinates[0].x;

    coordinates.sort(function(a, b) {
      return parseFloat(a['y']) - parseFloat(b['y']);
    });    
    
    origin['y'] = coordinates[0].y;
    
    // set new x,y pixel coordinates to tripel object
    for (i in this.triples) {    
    
      var obj = this.triples[i];
      
      // get the right coordinate object
      var coordinate = coordinates.filter(function(c) {
        return c['stop_id'] == obj.details.stop_id;
      });
      
      var x = ((coordinate[0].x - origin.x) * 200) + 40;
      var y = ((coordinate[0].y - origin.y) * 200) + 40;
      
      if (x > max.x) max.x = x;
      if (y > max.y) max.y = y;      

      obj.details['position'] = {};      
      obj.details['position']['x'] = x;
      obj.details['position']['y'] = y;      
      
    }    
    
    // set dimensions of SVG element accroding to the highes x and y values
    $('#svg').css({
      'width': max.x + 62,
      'height': max.y + 62,      
    });
    
  },
  
  // some helpers from https://google-developers.appspot.com/maps/documentation/javascript/examples/full/map-coordinates 
  bound: function(value, opt_min, opt_max) {
    if (opt_min != null) value = Math.max(value, opt_min);
    if (opt_max != null) value = Math.min(value, opt_max);
    return value;
  },
  
  degreesToRadians: function(deg) {
    return deg * (Math.PI / 180);
  },

  radiansToDegrees: function(rad) {
    return rad / (Math.PI / 180);
  }, 
  
  fromLatLngToPoint: function(latLng, opt_point) {
  
    var map = this.map;
    var point = opt_point || new google.maps.Point(0, 0);
    var origin = this.pixelOrigin_;

    point.x = origin.x + latLng.lng() * this.pixelsPerLonDegree_;

    var siny = this.bound(Math.sin(this.degreesToRadians(latLng.lat())), -0.9999, 0.9999);
    point.y = origin.y + 0.5 * Math.log((1 + siny) / (1 - siny)) * -this.pixelsPerLonRadian_;

    return point;

  },
  
  /***************************************
  * Events/Core functions
  ***************************************/  
  
  fetchData: function() {

    var self = this;

    // fetch routes
    $.when(
      $.ajax({
        url: self.API.base + 'routes/' + self.API.agency,
        dataType: 'json'
      })
    ).then(function(routes) {

      // for each route ...
      $.each(routes, function(i, route) {
      
        // ... fetch all stops ...
        $.ajax({
          url: self.API.base + 'stops/' + self.API.agency + '/' + route.route_id,
          dataType: 'json',
          success: function(stops) {

            // append object with route and stop details to global array
            self.data.push({
              route: route,
              stops: stops
            });          
            
            // start map generation when all requests are done
            if (self.data.length == self.objectLength(routes)) {
              self.generateTriples();
            }
            
          }
        })
        
      });

    });
    
  },
  
  generateTriples: function() {
  
    var self = this;
    
    // generate triples
    $.each(this.data, function(i, obj) {
    
      for (var i = 0; i < obj.stops.length - 1; i++) {
      
        // new index for next object
        var j = i + 1;
        
        // check if array is already created
        if (!self.triples[obj.stops[i].stop_name]) {

          self.triples[obj.stops[i].stop_name] = {};        
          self.triples[obj.stops[i].stop_name]['via'] = [];        
        
          self.triples[obj.stops[i].stop_name]['details'] = {
            "stop_name": obj.stops[i].stop_name,
            "stop_id": obj.stops[i].stop_id,
            "stop_lat": obj.stops[i].stop_lat, 
            "stop_lon": obj.stops[i].stop_lon
          };
        }
        
        tmp = {
          "stop_name": obj.stops[j].stop_name,
          "stop_id": obj.stops[j].stop_id,
          "line": obj.route.route_id,
          "duration": Math.floor((Math.random() * 5) + 1) // use random duration because we can't query the duration between two stops
        };
        
        self.triples[obj.stops[i].stop_name]['via'].push(tmp);
      }
        
    });
    
    this.generateSVG();
    
  },
  
  generateSVG: function() {

    var self = this;
    // var rdf = this.generateRDF();
    this.convertCoordinatesToPixels();    
    
    // generate new snap SVG 
    var svg = Snap("#svg");
    var svgNodes = [];
    var svgEdges = [];    

    for (i in this.triples) {

      // draw nodes          
      var obj = this.triples[i];
      svgNodes[obj.details.stop_id] = svg.circle(obj.details.position.x, obj.details.position.y, 22);    
      svgNodes[obj.details.stop_id].attr({
        fill: "#fff",
        stroke: "#000",
        strokeWidth: 2
      });  
      
      // draw edges
      
    }
    
  },
  
  generateRDF: function() {
    
  }
  
};

$(function() {
  var smmg = new SMMG();
});