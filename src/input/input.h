#ifndef INPUT_H_EBAIHCRV
#define INPUT_H_EBAIHCRV

#include "src/obj/index.h"

typedef enum {
  AQTouchBegan = 0x1,
  AQTouchMoved = 0x2,
  AQTouchStationary = 0x4,
  AQTouchEnded = 0x8,
  AQTouchCanceled = 0x10,
  AQTouchTouching = 0x7,
  AQTouchAny = 0xff
} AQTouchState;

extern AQType AQTouchType;

typedef struct AQTouch {
  AQObj object;

  AQTouchState state;

  int finger;

  // screen coordinates
  float x;
  float y;
  float dx;
  float dy;

  // world coordinates
  float wx;
  float wy;
} AQTouch;

void AQInput_setScreenSize( float, float );
void AQInput_getScreenSize( float *, float * );
void AQInput_setWorldFrame( float, float, float, float );
void AQInput_screenToWorld( float, float, float *, float * );

AQArray * AQInput_getTouches();

#endif /* end of include guard: INPUT_H_EBAIHCRV */
