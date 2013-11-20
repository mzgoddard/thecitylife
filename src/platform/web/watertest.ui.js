(function() {

var setupStats = function() {
  var stats = new Stats();
  document.body.appendChild( stats.domElement );

  var stepStart = function() {
    stats.begin();
  };
  var stepEnd = function() {
    stats.end();
  };

  Module.ccall(
    'setEventListener',
    'undefined',
    [ 'number', 'number' ],
    [ 0, Runtime.addFunction( stepStart ) ]
  );

  Module.ccall(
    'setEventListener',
    'undefined',
    [ 'number', 'number' ],
    [ 1, Runtime.addFunction( stepEnd ) ]
  );
};

setupStats();
}());
