#include <errno.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>

#include "src/audio/audio_webaudio.h"
#include "src/sys/app.h"

void AQWebAudioDriver_setMasterVolume( AQWebAudioDriver *, double volume );
void AQWebAudioDriver_setListenerPosition( AQWebAudioDriver *, double x, double y );
AQSound * AQWebAudioDriver_loadSound( AQWebAudioDriver *, AQString *path );
AQSoundInstance * AQWebAudioDriver_playSound( AQWebAudioDriver *, AQSound * );
AQSoundInstance * AQWebAudioDriver_playSoundLoop( AQWebAudioDriver *, AQSound * );
AQSoundInstance * AQWebAudioDriver_playSoundAt(
  AQWebAudioDriver *, AQSound *, double x, double y
);
void AQWebAudioDriver_stopSound( AQWebAudioDriver *, AQSoundInstance * );

static AQAudioDriverInterface _AQWebAudioDriver_AudioDriverInterface = {
  AQAudioDriverId,
  (void (*)( void *, double volume )) AQWebAudioDriver_setMasterVolume,
  (void (*)( void *, double x, double y )) AQWebAudioDriver_setListenerPosition,

  (AQSound * (*)( void *, AQString *path )) AQWebAudioDriver_loadSound,
  (AQSoundInstance * (*)( void *, AQSound * )) AQWebAudioDriver_playSound,
  (AQSoundInstance * (*)( void *, AQSound * )) AQWebAudioDriver_playSoundLoop,
  (AQSoundInstance * (*)( void *, AQSound *, double x, double y ))
    AQWebAudioDriver_playSoundAt,
  (void (*)( void *, AQSoundInstance * )) AQWebAudioDriver_stopSound
};

int _webAudioContextInit();
void _webAudioContextDone( int );
void _webAudioContextSetListenerPosition( int, float, float );
int _webAudioBufferCreate( int, char * );
void _webAudioBufferDelete( int, int );
int _webAudioSourceCreate( int );
void _webAudioSourceDelete( int, int );
int _webAudioSourceIsPlaying( int, int );
void _webAudioSourceSetBuffer( int, int, int );
void _webAudioSourceSetLooping( int, int, int );
void _webAudioSourceSetPosition( int, int, float, float, float );
void _webAudioSourcePlay( int, int );
void _webAudioSourceStop( int, int );

typedef struct _AQWebAudioBuffer {
  AQObj object;

  unsigned int context;
  unsigned int buffer;
} _AQWebAudioBuffer;

_AQWebAudioBuffer * _AQWebAudioBuffer_init( _AQWebAudioBuffer *self ) {
  self->context = 0;
  self->buffer = 0;
  return self;
}

_AQWebAudioBuffer * _AQWebAudioBuffer_done( _AQWebAudioBuffer *self ) {
  _webAudioBufferDelete( self->context, self->buffer );
  return self;
}

AQTYPE_INIT_DONE( _AQWebAudioBuffer );

_AQWebAudioBuffer * _AQWebAudioBuffer_create(
  AQWebAudioDriver *driver, unsigned int buffer
) {
  _AQWebAudioBuffer *self = aqcreate( &_AQWebAudioBufferType );
  self->context = driver->context;
  self->buffer = buffer;
  return self;
}

typedef struct _AQWebAudioSource {
  AQObj object;

  unsigned int context;
  unsigned int source;
} _AQWebAudioSource;

_AQWebAudioSource * _AQWebAudioSource_init( _AQWebAudioSource *self ) {
  self->context = 0;
  self->source = 0;
  return self;
}

_AQWebAudioSource * _AQWebAudioSource_done( _AQWebAudioSource * self ) {
  _webAudioSourceDelete( self->context, self->source );
  return self;
}

AQTYPE_INIT_DONE( _AQWebAudioSource );

_AQWebAudioSource * _AQWebAudioSource_create( AQWebAudioDriver *driver ) {
  _AQWebAudioSource *source = aqcreate( &_AQWebAudioSourceType );
  source->context = driver->context;
  source->source = _webAudioSourceCreate( source->context );
  return source;
}

AQWebAudioDriver * AQWebAudioDriver_init( AQWebAudioDriver *self ) {
  memset(
    self + sizeof( AQObj ),
    0,
    sizeof( AQWebAudioDriver ) - sizeof( AQObj )
  );

  self->context = _webAudioContextInit();

  self->soundMap = aqinit( aqalloc( &AQDictMapType ) );
  self->sourceList = aqinit( aqalloc( &AQListType ) );
  return self;
}

AQWebAudioDriver * AQWebAudioDriver_done( AQWebAudioDriver *self ) {
  _webAudioContextDone( self->context );

  aqrelease( self->soundMap );
  aqrelease( self->sourceList );
  return self;
}

void * AQWebAudioDriver_getInterface( AQWebAudioDriver *self, void *id ) {
  if ( id == AQAudioDriverId ) {
    return &_AQWebAudioDriver_AudioDriverInterface;
  }
  return NULL;
}

AQWebAudioDriver * AQWebAudioDriver_create() {
  AQWebAudioDriver * ctx = aqcreate( &AQWebAudioDriverType );
  return ctx;
}

void AQWebAudioDriver_setMasterVolume( AQWebAudioDriver *self, double volume ) {

}

void AQWebAudioDriver_setListenerPosition(
  AQWebAudioDriver *self, double x, double y
) {
  _webAudioContextSetListenerPosition( self->context, x, y );
}

AQSound * AQWebAudioDriver_loadSound(
  AQWebAudioDriver *self, AQString *path
) {
  AQSound *sound;

  sound = AQMap_get( self->soundMap, path );
  if ( sound ) {
    return sound;
  }

  sound = aqcreate( &AQSoundType );
  sound->path = aqretain( path );

  AQString *_path = AQString_concat(
    // AQString_concat( AQApp_app()->binaryPath, aqstr( "/" ) ),
    aqstr( "sound/" ),
    path
  );

  sound->_buffer = aqretain( _AQWebAudioBuffer_create(
    self,
    _webAudioBufferCreate( self->context, (char *) AQString_cstr( _path ))
  ) );

  AQMap_set( self->soundMap, path, sound );

  return sound;
}

int _AQWebAudioDriver_findNotPlayingSourceIterator( AQObj *obj, void *ctx ) {
  _AQWebAudioSource * source = (_AQWebAudioSource *) obj;
  return !_webAudioSourceIsPlaying( source->context, source->source );
}

void _AQWebAudioDriver_cleanupSources( AQWebAudioDriver *self ) {
  int index;
  if ( !!~( index = AQList_findIndex(
    self->sourceList, _AQWebAudioDriver_findNotPlayingSourceIterator, NULL
  ))) {
    AQList_removeAt( self->sourceList, index );
  }
}

_AQWebAudioSource * _AQWebAudioDriver_createSource(
  AQWebAudioDriver *self, AQSound *sound
) {
  _AQWebAudioDriver_cleanupSources( self );

  _AQWebAudioSource *source = _AQWebAudioSource_create( self);
  AQList_push( self->sourceList, (AQObj *) source );

  _webAudioSourceSetBuffer(
    self->context,
    source->source,
    ( (_AQWebAudioBuffer *) sound->_buffer )->buffer
  );

  return source;
}

AQSoundInstance * AQWebAudioDriver_playSound(
  AQWebAudioDriver *self, AQSound *sound
) {
  _AQWebAudioSource *source = _AQWebAudioDriver_createSource( self, sound );
  _webAudioSourcePlay( self->context, source->source );

  AQSoundInstance *instance = aqcreate( &AQSoundInstanceType );
  instance->sound = aqretain( sound );
  instance->_driverInfo = aqretain( source );
  return instance;
}

AQSoundInstance * AQWebAudioDriver_playSoundLoop(
  AQWebAudioDriver *self, AQSound *sound
) {
  _AQWebAudioSource *source = _AQWebAudioDriver_createSource( self, sound );
  _webAudioSourceSetLooping( self->context, source->source, 1 );
  _webAudioSourcePlay( self->context, source->source );

  AQSoundInstance *instance = aqcreate( &AQSoundInstanceType );
  instance->sound = aqretain( sound );
  instance->_driverInfo = aqretain( source );
  instance->loop = 1;
  return instance;
}

AQSoundInstance * AQWebAudioDriver_playSoundAt(
  AQWebAudioDriver *self, AQSound *sound, double x, double y
) {
  _AQWebAudioSource *source = _AQWebAudioDriver_createSource( self, sound );
  _webAudioSourceSetPosition( self->context, source->source, x, y, 0 );
  _webAudioSourcePlay( self->context, source->source );

  AQSoundInstance *instance = aqcreate( &AQSoundInstanceType );
  instance->sound = aqretain( sound );
  instance->_driverInfo = aqretain( source );
  instance->x = x;
  instance->y = y;
  return instance;
}

void AQWebAudioDriver_stopSound(
  AQWebAudioDriver *self, AQSoundInstance *soundInstance
) {
  
  _webAudioSourceStop(
    self->context,
    ( (_AQWebAudioSource *) soundInstance->_driverInfo )->source
  );
}

AQTYPE( AQWebAudioDriver );
