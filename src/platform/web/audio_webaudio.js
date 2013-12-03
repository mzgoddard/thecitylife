(function() {
  var Audio_WebAudio = {
    // int _webAudioContextInit();
    _webAudioContextInit: function() {
      var ctx = new AQAudioContext();
      return ctx.id;
    },

    // void _webAudioContextDone( int );
    _webAudioContextDone: function( ctxId ) {
      var ctx = AQAudioContext.context( ctxId );
      delete AQAudioContext.contexts[ ctxId ];
      ctx.done();
    },

    // void _webAudioContextSetListenerPosition( int, float, float );
    _webAudioContextSetListenerPosition: function( ctxId, x, y ) {
      var ctx = AQAudioContext.context( ctxId );
      ctx.setListenerPosition( x, y );
    },

    // int _webAudioBufferCreate( int, char * );
    _webAudioBufferCreate: function( ctxId, path ) {
      path = Module.Pointer_stringify( path );
      var ctx = AQAudioContext.context( ctxId );
      return ctx.createBuffer( path ).id;
    },

    // void _webAudioBufferDelete( int, int );
    _webAudioBufferDelete: function( ctxId, bufferId ) {
      var ctx = AQAudioContext.context( ctxId );
      ctx.deleteBuffer( ctx.buffer( bufferId ));
    },

    // int _webAudioSourceCreate( int );
    _webAudioSourceCreate: function( ctxId ) {
      var ctx = AQAudioContext.context( ctxId );
      return ctx.createSource().id;
    },

    // void _webAudioSourceDelete( int, int );
    _webAudioSourceDelete: function( ctxId, sourceId ) {
      var ctx = AQAudioContext.context( ctxId );
      ctx.deleteSource( ctx.source( sourceId ));
    },

    // int _webAudioSourceIsPlaying( int, int );
    _webAudioSourceIsPlaying: function( ctxId, sourceId ) {
      var ctx = AQAudioContext.context( ctxId );
      var source = ctx.source( sourceId );
      return source ? ( source.isPlaying() ? 1 : 0 ) : 0;
    },

    // void _webAudioSourceSetBuffer( int, int, int );
    _webAudioSourceSetBuffer: function( ctxId, sourceId, bufferId ) {
      var ctx = AQAudioContext.context( ctxId );
      var source = ctx.source( sourceId );
      if ( source ) {
        source.setBuffer( ctx.buffer( bufferId ));
      }
    },

    // void _webAudioSourceSetLooping( int, int, int );
    _webAudioSourceSetLooping: function( ctxId, sourceId, loop ) {
      var ctx = AQAudioContext.context( ctxId );
      var source = ctx.source( sourceId );
      if ( source ) {
        source.setLooping( !!loop );
      }
    },

    // void _webAudioSourceSetPosition( int, int, float, float, float );
    _webAudioSourceSetPosition: function( ctxId, sourceId, x, y, z ) {
      var ctx = AQAudioContext.context( ctxId );
      var source = ctx.source( sourceId );
      if ( source ) {
        source.setPosition( x, y, z );
      }
    },

    // void _webAudioSourcePlay( int, int );
    _webAudioSourcePlay: function( ctxId, sourceId ) {
      var ctx = AQAudioContext.context( ctxId );
      var source = ctx.source( sourceId );
      if ( source ) {
        source.play();
      }
    },

    // void _webAudioSourceStop( int, int );
    _webAudioSourceStop: function( ctxId, sourceId ) {
      var ctx = AQAudioContext.context( ctxId );
      var source = ctx.source( sourceId );
      if ( source ) {
        source.stop();
      }
    }
  };

  mergeInto(LibraryManager.library, Audio_WebAudio);
}());
