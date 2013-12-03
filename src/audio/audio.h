#ifndef AUDIO_H_6CPHX5YJ
#define AUDIO_H_6CPHX5YJ

#include "src/obj/index.h"

extern AQType AQSoundType;

typedef struct AQSound {
  AQObj object;

  AQString *path;
  void *_buffer;
} AQSound;

extern AQType AQSoundInstanceType;

typedef struct AQSoundInstance {
  AQObj object;

  AQSound *sound;
  void * _driverInfo;

  int loop;
  double x, y;
} AQSoundInstance;

extern AQInterfaceId AQAudioDriverId;

typedef struct AQAudioDriverInterface {
  const char * name;

  void (*setMasterVolume)( void *, double volume );
  void (*setListenerPosition)( void *, double x, double y );

  AQSound * (*load)( void *, AQString *path );
  AQSoundInstance * (*play)( void *, AQSound * );
  AQSoundInstance * (*playLoop)( void *, AQSound * );
  AQSoundInstance * (*playAt)( void *, AQSound *, double x, double y );
  void (*stop)( void *, AQSoundInstance * );
} AQAudioDriverInterface;

void AQAudioDriver_setContext( AQObj * );
AQObj * AQAudioDriver_getContext();

void AQAudioDriver_setMasterVolume( double volume );
void AQAudioDriver_setListenerPosition( double x, double y );

AQSound * AQSound_load( AQString *path );
AQSoundInstance * AQSound_play( AQSound * );
AQSoundInstance * AQSound_playLoop( AQSound * );
AQSoundInstance * AQSound_playAt( AQSound *, double x, double y );

void AQSoundInstance_stop( AQSoundInstance * );

#endif /* end of include guard: AUDIO_H_6CPHX5YJ */
