var SMMG = function() {
  
  this.data = [],
  
  // API settings
  this.API = {
    "base": "http://semantic-metro-map-gtfs-api.herokuapp.com/api/",
    "agency": "caltrain"
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
      
        // ... fetch all stops
        $.ajax({
          url: self.API.base + 'stops/' + self.API.agency + '/' + route.route_id,
          dataType: 'json',
          success: function(stops) {

            self.data.push({
              route: route,
              stops: stops
            });          
            
            // start map generation when all requests are done
            if (self.data.length == self.objectLength(routes)) {
              self.generateMap();
            }
            
          }
        })
        
      });

    });
    
  },
  
  generateMap: function() {
    
    console.log(this.data);
    
  }
  
};

var smmg = new SMMG();