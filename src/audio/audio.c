#include <stdlib.h>
#include <string.h>

#include "./audio.h"

static AQObj * _audioDriverContext = NULL;
AQInterfaceId AQAudioDriverId = "AQAudioDriver";

void AQAudioDriver_setContext( AQObj *ctx ) {
  aqrelease( _audioDriverContext );
  _audioDriverContext = aqretain( ctx );
}

AQObj * AQAudioDriver_getContext() {
  return _audioDriverContext;
}

void AQAudioDriver_setMasterVolume( double volume ) {
  AQObj * ctx = AQAudioDriver_getContext();
  AQAudioDriverInterface * interface = aqcast( ctx, AQAudioDriverId );
  if ( interface ) {
    interface->setMasterVolume( ctx, volume );
  }
}

void AQAudioDriver_setListenerPosition( double x, double y ) {
  AQObj * ctx = AQAudioDriver_getContext();
  AQAudioDriverInterface * interface = aqcast( ctx, AQAudioDriverId );
  if ( interface ) {
    interface->setListenerPosition( ctx, x, y );
  }
}

AQSound * AQSound_init( AQSound *self ) {
  self->path = NULL;
  self->_buffer = NULL;
  return self;
}

AQSound * AQSound_done( AQSound *self ) {
  aqrelease( self->path );
  aqrelease( self->_buffer );
  return self;
}

AQSound * AQSound_load( AQString *path ) {
  AQObj * ctx = AQAudioDriver_getContext();
  AQAudioDriverInterface * interface = aqcast( ctx, AQAudioDriverId );
  if ( interface ) {
    return interface->load( ctx, path );
  }
  return NULL;
}

AQSoundInstance * AQSound_play( AQSound *sound ) {
  AQObj * ctx = AQAudioDriver_getContext();
  AQAudioDriverInterface * interface = aqcast( ctx, AQAudioDriverId );
  if ( interface ) {
    return interface->play( ctx, sound );
  }
  return NULL;
}

AQSoundInstance * AQSound_playLoop( AQSound *sound ) {
  AQObj * ctx = AQAudioDriver_getContext();
  AQAudioDriverInterface * interface = aqcast( ctx, AQAudioDriverId );
  if ( interface ) {
    return interface->playLoop( ctx, sound );
  }
  return NULL;
}

AQSoundInstance * AQSound_playAt( AQSound *sound, double x, double y ) {
  AQObj * ctx = AQAudioDriver_getContext();
  AQAudioDriverInterface * interface = aqcast( ctx, AQAudioDriverId );
  if ( interface ) {
    return interface->playAt( ctx, sound, x, y );
  }
  return NULL;
}

AQSoundInstance * AQSoundInstance_init( AQSoundInstance *self ) {
  memset( &( self->sound ), 0, sizeof( AQSoundInstance ) - sizeof( AQObj ));
  return self;
}

AQSoundInstance * AQSoundInstance_done( AQSoundInstance *self ) {
  aqrelease( self->sound );
  aqrelease( self->_driverInfo );
  return self;
}

void AQSoundInstance_stop( AQSoundInstance *self ) {
  AQObj * ctx = AQAudioDriver_getContext();
  AQAudioDriverInterface * interface = aqcast( ctx, AQAudioDriverId );
  if ( interface ) {
    interface->stop( ctx, self );
  }
}

AQTYPE_INIT_DONE( AQSound );
AQTYPE_INIT_DONE( AQSoundInstance );
