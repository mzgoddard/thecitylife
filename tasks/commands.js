module.exports = function( grunt ) {
  'use strict';

  var os = require( 'os' );
  var child_process = require('child_process');

  var taskName = 'command';
  var description = 'Run a script from grunt.';

  grunt.registerMultiTask( taskName , description, function() {
    var task = this.data;
    var cmd = task.cmd;
    var args = task.args instanceof Array ? task.args : [];
    var opts = this.options({
      force: true
    });
    var done = this.async();

    child_process.exec( cmd, function( e ) {
      done( e );
    });
  });
};
