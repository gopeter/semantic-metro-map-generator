var SMMG = function() {
  
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
    $(document).on('tap', 'button', $.proxy(this.generateMap, this));
      
  },
  
  /***************************************
  * Helpers 
  ***************************************/

  /***************************************
  * Events
  ***************************************/
  
  generateMap: function() {

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
      
        // ... fetch all stops twice for each direction (0/1 for inbound/outbound)
        for (var direction = 0; direction <= 1; direction++) {
          $.when(
            $.ajax({
              url: self.API.base + 'stops/' + self.API.agency + '/' + route.route_id + '/' + direction,
              dataType: 'json'
            })
          ).then(function(stops) {      
          
            // now lets build our mega object!
            console.log(stops);
            
          });        
        }
        
      });

    });
    
  }
  
};

var smmg = new SMMG();