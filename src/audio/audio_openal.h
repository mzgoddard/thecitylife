#include "src/obj/index.h"
#include "./audio.h"
#include "openal.h"

extern AQType AQOpenALDriverType;

typedef struct AQOpenALDriver {
  AQObj object;

  ALCdevice *device;
  ALCcontext *context;

  AQDictMap *soundMap;
  AQList *sourceList;
} AQOpenALDriver;

AQOpenALDriver * AQOpenALDriver_create();
void AQOpenALDriver_setMasterVolume( AQOpenALDriver *, double volume );
void AQOpenALDriver_setListenerPosition( AQOpenALDriver *, double x, double y );
AQSound * AQOpenALDriver_loadSound( AQOpenALDriver *, AQString *path );
AQSoundInstance * AQOpenALDriver_playSound( AQOpenALDriver *, AQSound * );
AQSoundInstance * AQOpenALDriver_playSoundLoop( AQOpenALDriver *, AQSound * );
AQSoundInstance * AQOpenALDriver_playSoundAt(
  AQOpenALDriver *, AQSound *, double x, double y
);
void AQOpenALDriver_stopSound( AQOpenALDriver *, AQSoundInstance * );
