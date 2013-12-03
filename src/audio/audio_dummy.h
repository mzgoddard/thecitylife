#include "src/obj/index.h"
#include "src/audio/audio.h"

extern AQType AQDummyDriverType;

typedef struct AQDummyDriver {
  AQObj object;

  AQDictMap *soundMap;
} AQDummyDriver;

AQDummyDriver * AQDummyDriver_create();
void AQDummyDriver_setMasterVolume( AQDummyDriver *, double volume );
void AQDummyDriver_setListenerPosition( AQDummyDriver *, double x, double y );
AQSound * AQDummyDriver_loadSound( AQDummyDriver *, AQString *path );
AQSoundInstance * AQDummyDriver_playSound( AQDummyDriver *, AQSound * );
AQSoundInstance * AQDummyDriver_playSoundLoop( AQDummyDriver *, AQSound * );
AQSoundInstance * AQDummyDriver_playSoundAt(
  AQDummyDriver *, AQSound *, double x, double y
);
void AQDummyDriver_stopSound( AQDummyDriver *, AQSoundInstance * );
