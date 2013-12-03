#include "src/obj/index.h"
#include "./audio.h"
// #include "WebAudio.h"

extern AQType AQWebAudioDriverType;

typedef struct AQWebAudioDriver {
  AQObj object;

  unsigned int context;

  AQDictMap *soundMap;
  AQList *sourceList;
} AQWebAudioDriver;

AQWebAudioDriver * AQWebAudioDriver_create();
