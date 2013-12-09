var AQAudioContext;

(function() {
  var diskette = null;

  AQAudioContext = function _AQAudioContext() {
    this.id = AQAudioContext.prototype._nextId++;
    AQAudioContext.contexts[ this.id ] = this;

    this.nextBufferId = 0;
    this.buffers = {};
    this.nextSourceId = 0;
    this.sources = {};

    this.chainPromise = when();

    var contextConstructor = (
      window.webkitAudioContext || window.mozAudioContext || window.AudioContext
    );

    if ( !contextConstructor ) {
      console.error( 'WebAudio is not supported. Sound will not be played.' );
      return;
    }

    this.webAudioContext = new contextConstructor();

    this.webAudioDestination = this.webAudioContext.destination;

    this.webAudioDynamics = this.webAudioContext.createDynamicsCompressor();
    this.webAudioDynamics.connect( this.webAudioDestination );

    this.webAudioMasterGain = this.webAudioContext.createGain();
    this.webAudioMasterGain.connect( this.webAudioDynamics );

    this.targetNode = this.webAudioMasterGain;
  };

  AQAudioContext.prototype._nextId = 0;

  AQAudioContext.contexts = {};

  AQAudioContext.context = function( id ) {
    return this.contexts[ id ];
  };

  AQAudioContext.prototype._initDiskette = function() {
    if ( !this.webAudioContext ) {
      return {
        read: function() {
          return when.defer().promise;
        }
      };
    }

    if ( diskette === null ) {
      diskette = new Diskette();
      diskette.config( 'diskette.json' );
    }
    return diskette;
  };

  AQAudioContext.prototype._chain = function( promise ) {
    this.chainPromise = when.all([ this.chainPromise, promise ]);
    return this.chainPromise;
  };

  AQAudioContext.prototype.done = function() {};

  AQAudioContext.prototype.setListenerPosition = function( x, y ) {
    if ( this.webAudioContext ) {
      this.webAudioContext.listener.setPosition( x, y, 0 );
    }
  };

  AQAudioContext.prototype.createBuffer = function( path ) {
    var self = this;
    var bufferId = self.nextBufferId++;

    var bufferData = {
      id: bufferId,
      buffer: null
    };
    self.buffers[ bufferId ] = bufferData;

    this._chain(
      self._initDiskette().read( path, 'arraybuffer' ).then(function( data ) {
        var defer = when.defer();
        if ( self.webAudioContext ) {
          self.webAudioContext.decodeAudioData( data, function( buffer ) {
            bufferData.buffer = buffer;
            defer.resolve( bufferData );
          }, defer.reject );
        }
        return defer.promise;
      })
    );

    return bufferData;
  };

  AQAudioContext.prototype.deleteBuffer = function( buffer ) {
    var self = this;
    self.chainPromise.then(function() {
      delete self.buffers[ buffer.id ];
      delete self.bufferData[ buffer.id ];
    });
  };

  AQAudioContext.prototype.createSource = function() {
    var source = new AQAudioSource( this );
    this.sources[ source.id ] = source;
    return source;
  };

  AQAudioContext.prototype.deleteSource = function( source ) {
    delete this.sources[ source.id ];
  };

  AQAudioContext.prototype.buffer = function( id ) {
    return this.buffers[ id ];
  };

  AQAudioContext.prototype.source = function( id ) {
    return this.sources[ id ];
  };

  function AQAudioSource( ctx ) {
    this.id = ctx.nextSourceId++;
    this.context = ctx;

    this.playing = false;

    if ( !ctx.webAudioContext ) {
      return;
    }

    this.sourceNode = ctx.webAudioContext.createBufferSource();
    this.sourceNode.onended = function() {
      this.playing = false;
    }.bind( this );

    this.pannerNode = null;
    this.gainNode = null;

    this.playNode = this.sourceNode;
  }

  AQAudioSource.prototype.isPlaying = function() {
    return this.playing;
  };

  AQAudioSource.prototype.setBuffer = function( buffer ) {
    if ( buffer.buffer !== null ) {
      this.sourceNode.buffer = buffer.buffer;
    }
  };

  AQAudioSource.prototype.setPosition = function( x, y ) {
    if ( this.pannerNode !== null ) { return; }

    if ( !this.context.webAudioContext ) {
      return;
    }

    this.pannerNode = this.context.webAudioContext.createPanner();
    this.pannerNode.setPosition( x, y, 0 );
    this.playNode.connect( this.pannerNode );
    this.playNode = this.pannerNode;
  };

  AQAudioSource.prototype.play = function() {
    if ( !this.context.webAudioContext ) {
      return;
    }

    this.playNode.connect( this.context.targetNode );
    this.sourceNode.start( 0 );

    this.playing = true;
  };

  AQAudioSource.prototype.stop = function() {
    this.sourceNode.stop( 0 );

    this.playing = false;
  };
}());
