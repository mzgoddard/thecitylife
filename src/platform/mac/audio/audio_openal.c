#include <stdlib.h>
#include "src/audio/audio_openal.h"

static AQAudioDriverInterface _AQOpenALDriver_AudioDriverInterface = {
  AQAudioDriverId,
  (void (*)( void *, double volume )) AQOpenALDriver_setMasterVolume,
  (void (*)( void *, double x, double y )) AQOpenALDriver_setListenerPosition,

  (AQSound * (*)( void *, AQString *path )) AQOpenALDriver_loadSound,
  (AQSoundInstance * (*)( void *, AQSound * )) AQOpenALDriver_playSound,
  (AQSoundInstance * (*)( void *, AQSound * )) AQOpenALDriver_playSoundLoop,
  (AQSoundInstance * (*)( void *, AQSound *, double x, double y ))
    AQOpenALDriver_playSoundAt,
  (void (*)( void *, AQSoundInstance * )) AQOpenALDriver_stopSound
};

typedef struct _AQOpenALBuffer {
  AQObj object;

  unsigned int buffer;
} _AQOpenALBuffer;

_AQOpenALBuffer * _AQOpenALBuffer_init( _AQOpenALBuffer *self ) {
  self->buffer = 0;
  return self;
}

_AQOpenALBuffer * _AQOpenALBuffer_done( _AQOpenALBuffer *self ) {
  alDeleteBuffers( 1, &self->buffer );
  return self;
}

AQTYPE_INIT_DONE( _AQOpenALBuffer );

_AQOpenALBuffer * _AQOpenALBuffer_create( unsigned int buffer ) {
  _AQOpenALBuffer *self = aqcreate( &_AQOpenALBufferType );
  self->buffer = buffer;
  return self;
}

typedef struct _AQOpenALSource {
  AQObj object;

  unsigned int source;
} _AQOpenALSource;

_AQOpenALSource * _AQOpenALSource_init( _AQOpenALSource *self ) {
  alGenSources( 1, &self->source );
  return self;
}

_AQOpenALSource * _AQOpenALSource_done( _AQOpenALSource * self ) {
  alDeleteSources( 1, &self->source );
  return self;
}

AQTYPE_INIT_DONE( _AQOpenALSource );

_AQOpenALSource * _AQOpenALSource_create() {
  return aqcreate( &_AQOpenALSourceType );
}

AQOpenALDriver * AQOpenALDriver_init( AQOpenALDriver *self ) {
  self->soundMap = aqinit( aqalloc( &AQDictMapType ) );
  self->sourceList = aqinit( aqalloc( &AQListType ) );
  return self;
}

AQOpenALDriver * AQOpenALDriver_done( AQOpenALDriver *self ) {
  return self;
}

void * AQOpenALDriver_getInterface( AQOpenALDriver *self, void *id ) {
  if ( id == AQAudioDriverId ) {
    return &_AQOpenALDriver_AudioDriverInterface;
  }
  return NULL;
}

AQOpenALDriver * AQOpenALDriver_create() {
  AQOpenALDriver * ctx = aqcreate( &AQOpenALDriverType );

  ctx->device = alcOpenDevice( NULL );
  if ( ctx->device != NULL ) {
    // Create a new OpenAL Context
    // The new context will render to the OpenAL Device just created 
    ctx->context = alcCreateContext( ctx->device, 0 );
    if ( ctx->context != NULL ) {
      // Make the new context the Current OpenAL Context
      alcMakeContextCurrent( ctx->context );
            
      // // Create some OpenAL Buffer Objects
      // alGenBuffers( 1, &buffer );
      // if( ( error = alGetError() ) != AL_NO_ERROR ) {
      //   AQLog( aqstr( "Error Generating Buffers: %x" ), error );
      // }
      //       
      // // Create some OpenAL Source Objects
      // alGenSources( 1, &source );
      // if( ( error = alGetError() ) != AL_NO_ERROR ) {
      //   AQLog( aqstr( "Error generating sources! %x\n" ), error );
      // }
    }
  }
  // clear any errors
  alGetError();

  return ctx;
}

void AQOpenALDriver_setMasterVolume( AQOpenALDriver *self, double volume ) {
  alListenerf( AL_GAIN, volume );
}

void AQOpenALDriver_setListenerPosition(
  AQOpenALDriver *self, double x, double y
) {
  alListener3f( AL_POSITION, x, y, 0 );
}

AQSound * AQOpenALDriver_loadSound(
  AQOpenALDriver *self, AQString *path
) {
  AQSound *sound;

  sound = AQMap_get( self->soundMap, path );
  if ( sound ) {
    return sound;
  }

  sound = aqcreate( &AQSoundType );
  sound->path = aqretain( path );
  sound->_buffer = aqretain( _AQOpenALBuffer_create(
    alutCreateBufferFromFile( AQString_cstr( path ) )
  ) );
  AQMap_set( self->soundMap, path, sound );

  return sound;
}

int _AQOpenALDriver_findSourceIterator( AQObj *obj, void *ctx ) {
  _AQOpenALSource * source = (_AQOpenALSource *) obj;
  int isPlaying;
  alGetSourcei( source->source, AL_SOURCE_STATE, &isPlaying );
  return isPlaying == AL_PLAYING;
}

_AQOpenALSource * _AQOpenALDriver_findSource( AQOpenALDriver *self ) {
  _AQOpenALSource * source = (_AQOpenALSource *) AQList_find(
    self->sourceList, _AQOpenALDriver_findSourceIterator, NULL
  );
  if ( !source ) {
    source = aqcreate( &_AQOpenALSourceType );
    AQList_push( self->sourceList, (AQObj *) source );
  }

  alSourcei( source->source, AL_SOURCE_RELATIVE, AL_FALSE );
  alSourcei( source->source, AL_LOOPING, AL_FALSE );

  return source;
}

AQSoundInstance * AQOpenALDriver_playSound(
  AQOpenALDriver *self, AQSound *sound
) {
  _AQOpenALSource *source = _AQOpenALDriver_findSource( self );
  alSourcei(
    source->source,
    AL_BUFFER,
    ( (_AQOpenALBuffer *) sound->_buffer )->buffer
  );
  alSourcePlay( source->source );

  AQSoundInstance *instance = aqcreate( &AQSoundInstanceType );
  instance->sound = aqretain( sound );
  instance->_driverInfo = aqretain( source );
  return instance;
}

AQSoundInstance * AQOpenALDriver_playSoundLoop(
  AQOpenALDriver *self, AQSound *sound
) {
  _AQOpenALSource *source = _AQOpenALDriver_findSource( self );
  alSourcei(
    source->source,
    AL_BUFFER,
    ( (_AQOpenALBuffer *) sound->_buffer )->buffer
  );
  alSourcei( source->source, AL_LOOPING, AL_TRUE );
  alSourcePlay( source->source );

  AQSoundInstance *instance = aqcreate( &AQSoundInstanceType );
  instance->sound = aqretain( sound );
  instance->_driverInfo = aqretain( source );
  instance->loop = 1;
  return instance;
}

AQSoundInstance * AQOpenALDriver_playSoundAt(
  AQOpenALDriver *self, AQSound *sound, double x, double y
) {
  _AQOpenALSource *source = _AQOpenALDriver_findSource( self );
  alSourcei(
    source->source,
    AL_BUFFER,
    ( (_AQOpenALBuffer *) sound->_buffer )->buffer
  );
  alSource3f( source->source, AL_POSITION, x, y, 0 );
  alSourcePlay( source->source );

  AQSoundInstance *instance = aqcreate( &AQSoundInstanceType );
  instance->sound = aqretain( sound );
  instance->_driverInfo = aqretain( source );
  instance->x = x;
  instance->y = y;
  return instance;
}

void AQOpenALDriver_stopSound(
  AQOpenALDriver *self, AQSoundInstance *soundInstance
) {
  alSourceStop( ( (_AQOpenALSource *) soundInstance->_driverInfo )->source );
}

AQTYPE( AQOpenALDriver );
