#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include "src/audio/audio_dummy.h"

static AQAudioDriverInterface _AQDummyDriver_AudioDriverInterface = {
  AQAudioDriverId,
  (void (*)( void *, double volume )) AQDummyDriver_setMasterVolume,
  (void (*)( void *, double x, double y )) AQDummyDriver_setListenerPosition,

  (AQSound * (*)( void *, AQString *path )) AQDummyDriver_loadSound,
  (AQSoundInstance * (*)( void *, AQSound * )) AQDummyDriver_playSound,
  (AQSoundInstance * (*)( void *, AQSound * )) AQDummyDriver_playSoundLoop,
  (AQSoundInstance * (*)( void *, AQSound *, double x, double y ))
    AQDummyDriver_playSoundAt,
  (void (*)( void *, AQSoundInstance * )) AQDummyDriver_stopSound
};

AQDummyDriver * AQDummyDriver_init( AQDummyDriver *self ) {
  memset(
    self + sizeof( AQObj ),
    0,
    sizeof( AQDummyDriver ) - sizeof( AQObj )
  );

  self->soundMap = aqinit( aqalloc( &AQDictMapType ) );
  return self;
}

AQDummyDriver * AQDummyDriver_done( AQDummyDriver *self ) {
  aqrelease( self->soundMap );
  return self;
}

void * AQDummyDriver_getInterface( AQDummyDriver *self, void *id ) {
  if ( id == AQAudioDriverId ) {
    return &_AQDummyDriver_AudioDriverInterface;
  }
  return NULL;
}

AQDummyDriver * AQDummyDriver_create() {
  AQDummyDriver * ctx = aqcreate( &AQDummyDriverType );
  return ctx;
}

void AQDummyDriver_setMasterVolume( AQDummyDriver *self, double volume ) {}

void AQDummyDriver_setListenerPosition(
  AQDummyDriver *self, double x, double y
) {}

AQSound * AQDummyDriver_loadSound(
  AQDummyDriver *self, AQString *path
) {
  AQSound *sound;

  sound = AQMap_get( self->soundMap, path );
  if ( sound ) {
    return sound;
  }

  sound = aqcreate( &AQSoundType );
  sound->path = aqretain( path );
  sound->_buffer = NULL;
  AQMap_set( self->soundMap, path, sound );

  return sound;
}

AQSoundInstance * AQDummyDriver_playSound(
  AQDummyDriver *self, AQSound *sound
) {
  AQSoundInstance *instance = aqcreate( &AQSoundInstanceType );
  instance->sound = aqretain( sound );
  instance->_driverInfo = NULL;
  return instance;
}

AQSoundInstance * AQDummyDriver_playSoundLoop(
  AQDummyDriver *self, AQSound *sound
) {
  AQSoundInstance *instance = aqcreate( &AQSoundInstanceType );
  instance->sound = aqretain( sound );
  instance->_driverInfo = NULL;
  instance->loop = 1;
  return instance;
}

AQSoundInstance * AQDummyDriver_playSoundAt(
  AQDummyDriver *self, AQSound *sound, double x, double y
) {
  AQSoundInstance *instance = aqcreate( &AQSoundInstanceType );
  instance->sound = aqretain( sound );
  instance->_driverInfo = NULL;
  instance->x = x;
  instance->y = y;
  return instance;
}

void AQDummyDriver_stopSound(
  AQDummyDriver *self, AQSoundInstance *soundInstance
) {}

AQTYPE( AQDummyDriver );
