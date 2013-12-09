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

extern AQType AQInputActionType;

typedef struct AQInputAction {
  AQObj object;

  // Name of action.
  AQString *name;

  // Key codes that can activate this action.
  AQList *keyCodes;

  // Key code that last activated this action.
  int activeKeyCode;

  // Was this action just pressed. Set to false after the frame that it was
  // pressed on whehter or not a key is still pressed for it.
  int pressPulse;

  // Was this action just released. Set to true on the frame that the key was
  // released and set to false on the following frame.
  int releasePulse;

  // Is this action active. True as long as activeKeyCode's key is held.
  int active;
} AQInputAction;

AQInputAction * AQInputAction_create( AQString * );

void AQInput_setScreenSize( float, float );
void AQInput_getScreenSize( float *, float * );
void AQInput_setWorldFrame( float, float, float, float );
void AQInput_screenToWorld( float, float, float *, float * );

AQArray * AQInput_getTouches();

AQInputAction * AQInput_findAction( AQString * );
void AQInput_setActionToKey( AQInputAction *, int keyCode );
void AQInput_setActionToKeys( AQInputAction *, ... );
void AQInput_unsetActionToKey( AQInputAction *, int keyCode );
void AQInput_unsetAction( AQInputAction * );

void AQInput_pressKey( int keyCode );
void AQInput_releaseKey( int keyCode );

void AQInput_step();

#endif /* end of include guard: INPUT_H_EBAIHCRV */
