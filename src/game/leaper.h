#ifndef LEAPER_H_EFYEZNG8
#define LEAPER_H_EFYEZNG8

#include "src/obj/index.h"
#include "src/pphys/index.h"

typedef enum SLLeaperState {
  FloatingLeaperState,
  LandingLeaperState,
  StuckLeaperState,
  LostLeaperState,
  WonLeaperState
} SLLeaperState;

extern AQType SLLeaperType;

typedef struct SLLeaper {
  AQObj *object;

  aqvec2 position;
  AQDOUBLE radius;
  AQDOUBLE radians;

  AQParticle *body;
  AQParticle *trigger;
  AQWorld *world;

  SLLeaperState state;
  AQParticle *lastTouched;
  int isHome;

  int oxygen;
  int resource;

  void *view;
} SLLeaper;

SLLeaper * SLLeaper_create( aqvec2 position );
void SLLeaper_applyDirection( SLLeaper *, AQDOUBLE radians );

#endif /* end of include guard: LEAPER_H_EFYEZNG8 */
