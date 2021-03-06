var SMMG = function() {
  
  this.data = [];
  this.triples = {};
  this.points = [];
  this.zoom = 200;
  this.svgWrapper = $('#svg').html();
  
  // vars for coordinate calculation
  this.pixelOrigin_ = new google.maps.Point(256 / 2, 256 / 2);
  this.pixelsPerLonDegree_ = 256 / 360;
  this.pixelsPerLonRadian_ = 256 / (2 * Math.PI);    
  
  // API settings
  if (document.location.hostname == "localhost") {
    this.API = {
      "base": "http://localhost:5001/api/",      
      "agency": "flixbus-gmbh"
    };    
  } else {
    this.API = {
      "base": "http://semantic-metro-map-gtfs-api.herokuapp.com/api/",
      "agency": "flixbus-gmbh"
    };    
  }  
  
  // init!
  this.init();
};

SMMG.prototype = {

  init: function() {
  
    // event handler
    $(document).hammer();
    $(document).on('tap', '#generate', $.proxy(this.start, this));
    $(document).on('tap', '#download', $.proxy(this.download, this));    
    $(document).on('change', '#agency', $.proxy(this.setAgency, this));    
    $(document).on('tap', '#zoom-correct', $.proxy(this.setCorrectZoom, this));        
    $(document).on('tap', '#zoom-apply', $.proxy(this.setZoom, this));            
    
    this.loadAgencies();
      
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
  
  sortArray: function(arr) {
    arr.sort(function(a, b){
      if(a < b) return -1;
      if(a > b) return 1;
      return 0;
    });
    return arr;
  },
  
  removeSpecialChars: function(str) {
    return str.replace(/[^\w]/gi, ''); 
  },
    
  circleToPath: function(cx, cy, r) {
  	var cx = parseFloat(cx); 		
  	var cy = parseFloat(cy); 		
  	var r = parseFloat(r); 		
		
		var path = "M" + (cx-r).toString() + "," + cy.toString();
		path += "a" + r.toString() + "," + r.toString() + " 0 1,0 " + (2 * r).toString() + ",0";
		path += "a" + r.toString() + "," + r.toString() + " 0 1,0 " + (-2 * r).toString() + ",0";

    return path;
    
  },
  
  getTriangleCoordinates: function(ax, ay, x1, y1, x2, y2) {
  
    var h = 5;
    var b = 3.5
    var xd = x2 - x1;;
    
    var m1 = (y2 - y1) / (x2 - x1);
    var m2 = -1 / m1;  
    
    var m1x = h / (Math.sqrt(1 + Math.pow(m1, 2)));
    var m1y = (h * m1) / Math.sqrt(1 + Math.pow(m1, 2));             
    
    var m2x = b / (Math.sqrt(1 + Math.pow(m2, 2)));
    var m2y = (b * m2) / Math.sqrt(1 + Math.pow(m2, 2));  
    
    if (xd > 0) {
        var pabX = ax - m1x;
        var pabY = ay - m1y;                    
    } else {
        var pabX = ax + m1x;
        var pabY = ay + m1y;            
    }
    
    var pacX = pabX - m2x;
    var pacY = pabY - m2y;          
    
    var pbcX = pabX + m2x;
    var pbcY = pabY + m2y;      
   
    return [ax, ay, pacX, pacY, pbcX, pbcY];
  },
  
  convertCoordinatesToPixels: function() {

    // iterate through all triples to convert coordinates to pixels
    var coordinates = [];
    this.points = []; // used to find the nearest points
    for (i in this.triples) {    
    
      var obj = this.triples[i];
      var point = this.fromLatLngToPoint(new google.maps.LatLng(obj.details.stop_lat, obj.details.stop_lon));
      
      var tmp = {
        "stop_id": obj.details.stop_id,
        "x": point.x,
        "y": point.y 
      };
      
      coordinates.push(tmp);
      
      var p = {"x":point.x, "y":point.y};
        
      if (this.points.length > 0) {      

        // check if object is already in array
        var contains = false;
        for (var a = 0; a < this.points.length; a++) {
          if (this.points[a].x == p.x && this.points[a].y == p.y) {
            contains = true;
          }
        }
        
        if (!contains) {
          this.points.push(p);
        }
          
      } else {
        this.points.push(p);                
      }      
      
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
    
    // set new x,y pixel coordinates to tripel object according to the zoom
    for (i in this.triples) {    
    
      var obj = this.triples[i];
      
      // get the right coordinate object
      var coordinate = coordinates.filter(function(c) {
        return c['stop_id'] == obj.details.stop_id;
      });
      
      var x = ((coordinate[0].x - origin.x) * this.zoom) + 40;
      var y = ((coordinate[0].y - origin.y) * this.zoom) + 40;
      
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
  
  // some geo helpers from https://google-developers.appspot.com/maps/documentation/javascript/examples/full/map-coordinates 
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
  
  // closest pair of points problem, using this algorithm: http://rosettacode.org/wiki/Closest-pair_problem#JavaScript
  distance: function(p1, p2) {
    var dx = Math.abs(p1.x - p2.x);
    var dy = Math.abs(p1.y - p2.y);
    return Math.sqrt(dx * dx + dy * dy);
  },
 
  bruteforceClosestPair: function(arr) {
  
    if (arr.length < 2) {
      return Infinity;
    } else {
      var minDist = this.distance(arr[0], arr[1]);
      var minPoints = arr.slice(0, 2);
   
      for (var i=0; i<arr.length-1; i++) {
        for (var j=i+1; j<arr.length; j++) {
          if (this.distance(arr[i], arr[j]) < minDist) {
            minDist = this.distance(arr[i], arr[j]);
            minPoints = [ arr[i], arr[j] ];
          }
        }
      }
      return {
        distance: minDist,
        points: minPoints
      };
    }
  },  
  
  /***************************************
  * Events/Core functions
  ***************************************/  
  
  loadAgencies: function() {
    
    var self = this;
    
    $.when(
      $.ajax({
        url: self.API.base + 'agencies',
        dataType: 'json'
      })
    ).then(function(agencies) {    
      
      var $select = $('#agency');
      
      $.each(agencies, function(i, agency) {
        var selected = (agency.agency_key == 'flixbus-gmbh') ? 'selected' : '';
        $select.append('<option ' + selected + ' value="' + agency.agency_key + '">' + agency.agency_name + '</option>');
      });
      
    });
    
  },
  
  setAgency: function(el) {
    this.API.agency = $(el.target).val();
  },

  setCorrectZoom: function() {
    
    // find the distance between the nearest points to get the minimum zoom factor to prevent overlapping nodes
    var distance = this.bruteforceClosestPair(this.points);
    
    // points should have a spacing of 5px
    // nodes radius is 24px so use 53px as base
    this.zoom = 53 / distance.distance;
    $('input[name="zoom-level"]').val(this.zoom);
    
  },
  
  setZoom: function() {
    this.zoom = parseFloat($('input[name="zoom-level"]').val());
    this.start();
  },
  
  start: function() {
     
    // reset
    this.data = [];
    this.triples = {};    
    $('#svg').html(this.svgWrapper);    

    var self = this;

    // fetch routes
    $.when(
      $.ajax({
        url: self.API.base + 'routes/' + self.API.agency,
        dataType: 'json',
        beforeSend: function() {
          $('.spinner').addClass('show');
        }
      })
    ).then(function(routes) {
    
      // create random colors for all routes
      self.colors = Please.make_color({
      	colors_returned: routes.length
      });

      // for each route ...
      $.each(routes, function(i, route) {
      
        // if route has no color, use a random one
        if (typeof route.route_color === 'undefined' || route.route_color == '') {
          route.route_color = self.colors[i];
        } else {
          // check if color is a valid hex value
          if (!route.route_color.match(/#/)) {
            route.route_color = '#' + route.route_color;
          }
        }
      
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
    
      for (var i = 0; i < obj.stops.length; i++) {
      
        // new index for next object
        var j = i + 1;
        
        // check if array is already created
        if (!self.triples[obj.stops[i].stop_id]) {

          self.triples[obj.stops[i].stop_id] = {};        
          self.triples[obj.stops[i].stop_id]['via'] = [];        
        
          self.triples[obj.stops[i].stop_id]['details'] = {
            "stop_name": obj.stops[i].stop_name,
            "stop_id": obj.stops[i].stop_id,
            "stop_lat": obj.stops[i].stop_lat, 
            "stop_lon": obj.stops[i].stop_lon
          };
        }
        
        // there is no trip from the last stop
        if (i < obj.stops.length - 1) {        
          tmp = {
            "stop_name": obj.stops[j].stop_name,
            "stop_id": obj.stops[j].stop_id,
            "line": obj.route.route_id,
            "color": obj.route.route_color,
            "duration": Math.floor((Math.random() * 5) + 1) // use random duration because we can't query the duration between two stops at the moment
          };
          
          self.triples[obj.stops[i].stop_id]['via'].push(tmp);          
          
        }
      }
        
    });
    
    this.generateSVG();
    
  },
  
  generateSVG: function() {

    var self = this;
    var rdf = this.generateRDF();
    
    $('#svg').find('metadata').append(rdf);
    
    this.convertCoordinatesToPixels();    
    
    // generate new snap SVG 
    var svg = Snap('#svg');
    
    var snapEdges = {};
    var svgEdges = svg.g().attr({id: 'Edges'});     
    
    var snapNodes = {};
    var svgNodes = svg.g().attr({id: 'Nodes'});        

    // draw edges
    for (i in this.triples) {
    
      // draw edge line
      var obj = this.triples[i];    
      var routes = obj.via;
      var from = obj.details.position;
      var from_id = obj.details.stop_id;
      
      $.each(obj.via, function(j, route) {
        
        var to = self.triples[route.stop_id].details.position;
        var to_id = self.triples[route.stop_id].details.stop_id;
        
        // sort IDs ascending to make it accessible by the metro-map frontend
        var ids = self.sortArray([from_id, to_id]);                 
        var id = self.removeSpecialChars(ids.join(''));
        var line = self.removeSpecialChars(route.line);        
        
        // create tmp arrow
        // correct coordinates will be added after parallel shifting of line
        var t = svg.polyline(-10, -10, -20, -20, -30, -10)
          .attr({
            fill: route.color,
            id: 'Arrow' + id + 'Line' + line
          })
          .data({
            'target-x': to.x,
            'target-y': to.y            
          });       
        
        var l = svg.path('M' + from.x + ' ' + from.y + ' L' + to.x + ' ' + to.y)
          .attr({
            stroke: route.color,
            strokeWidth: 1,
            id: 'Edge' + id + 'Line' + line
          });
        
        var tmp = svg.g(l, t);
        
        if (!snapEdges[id]) {
          snapEdges[id] = [];
        }

        snapEdges[id].push(tmp)        
      });

    }
    
    $.each(snapEdges, function(i, edges) {
  
      // group edges
      var g = svg.g();
      $.each(edges, function(j, edge) {
        g.add(edge);
      });
      
      var factor = 4;
      var x = 0;
      
      // get first edge of group to calculate pitch and move all other edges parallel to the first one
      var edge = edges[0];
      
      var path = Snap.parsePathString(edge[0].attr('path'));
      
      // edge[1] = arrow, edge[0] = line
      var x1 = path[0][1];
      var x2 = path[1][1];
      var y1 = path[0][2];
      var y2 = path[1][2];
      
      // add spacing between lines when there are multiple connections between two nodes    
      if (edges.length > 1) {
        
        var m1 = (y2 - y1) / (x2 - x1);
        var m2 = -1 / m1;
        
        // move all grouped lines to center lines 
        var correct = ((edges.length * factor) / 2) - factor;

        for (var x = 0; x < edges.length; x++) {
        
          // get x1, y1, x2, y2 for each edge once again to get the right direction
          var singlePath = Snap.parsePathString(edges[x][0].attr('path'));
          var x1 = singlePath[0][1];
          var x2 = singlePath[1][1];
          var y1 = singlePath[0][2];
          var y2 = singlePath[1][2];          

          var l = factor * x;
          var vx = l / (Math.sqrt(1 + Math.pow(m2,2)));
          var vy = (l * m2) / Math.sqrt(1 + Math.pow(m2,2));
          
          // move edge
          var tx1 = (x1 + vx) - correct;
          var ty1 = (y1 + vy) - correct;
          var tx2 = (x2 + vx) - correct;
          var ty2 = (y2 + vy) - correct;                              
          
          var path = 'M' + tx1 + ' ' + ty1 + ' L' + tx2 + ' ' + ty2;
          var circlePath = self.circleToPath(edges[x][1].data('target-x'), edges[x][1].data('target-y'), 24);
          
          edges[x][0].attr({
            'path': path
          });
          
          // move arrow
          var intersection = Snap.path.intersection(path, circlePath);
          if (intersection.length > 0) {
            edges[x][1].attr({
              'points': self.getTriangleCoordinates(intersection[0].x, intersection[0].y, tx1, ty1, tx2, ty2)
            }); 
          }
                    
        }
            
      } else {

        // move single arrow        
        var path = Snap.parsePathString(edges[0][0].attr('path'));
        var circlePath = self.circleToPath(edges[0][1].data('target-x'), edges[0][1].data('target-y'), 24);        
        var intersection = Snap.path.intersection(path, circlePath);

        if (intersection.length > 0) {
          edges[0][1].attr({
            'points': self.getTriangleCoordinates(intersection[0].x, intersection[0].y, x1, y1, x2, y2)
          }); 
        }
      }    
      
      // group edges
      svgEdges.add(g);
      
    });

    // draw nodes          
    for (i in this.triples) {

      // draw node circle
      var obj = this.triples[i];
      var path = self.circleToPath(obj.details.position.x, obj.details.position.y, 22);
      var c = svg.path(path).attr({
        fill: '#fff',
        stroke: '#000',
        strokeWidth: 2
      });
      
      // draw node text
      var t = svg.text(obj.details.position.x, obj.details.position.y + 4, obj.details.stop_id).attr({
        'font-family': 'Arial',
        'font-size': '10',
        'text-anchor': 'middle'
      });    
      
      // group circle and text and append id to group
      var n = this.removeSpecialChars(obj.details.stop_id);
      snapNodes[obj.details.stop_id] = svg.g(c, t).attr({
        id: 'Node' + n
      });
      
      svgNodes.add(snapNodes[obj.details.stop_id]);
      
    }
    
    // generate file
    var svg = $('#svg-wrapper').html();
    $.ajax({
      url: '/create',
      type: 'post',
      data: {
        svg: svg
      }, success: function(file) {
        self.file = file;
        $('#download').show();
        $('#zoom').show();
        $('#svg').show();         
        setTimeout(function() {
          $('.spinner').removeClass('show');
        }, 500);
      }
    });    
    
  },
  
  generateRDF: function() {
  
    var self = this;
    var rdf = '<rdf:RDF>';
  
    for (i in this.triples) {
    
      var obj = this.triples[i];
      var stop_from = this.removeSpecialChars(obj.details.stop_id);
      rdf += '<rdf:Description rdf:about="http://example.com/' + stop_from + '">';
        
        $.each(obj.via, function(i, route) {
          
          var stop_to = self.removeSpecialChars(route.stop_id);
          var line = self.removeSpecialChars(route.line);
          
          rdf += '<ex:via rdf:parseType="Resource">';
            rdf += '<ex:Stop rdf:resource="http://example.com/' + stop_to + '" />';          
            rdf += '<ex:Line rdf:resource="http://example.com/Line' + line + '" />';		
            rdf += '<ex:Duration>' + route.duration + '</ex:Duration>';			
				  rdf += '</ex:via>';
          
        });
        
      rdf += '</rdf:Description>';      
    
    }
    
    rdf += '</rdf:RDF>';
    
    return rdf;
    
  },
  
  download: function() {
    window.open('/maps/' + this.file);
  }
  
};

$(function() {
  var smmg = new SMMG();
}); 