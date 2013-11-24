#ifndef LEAPER_H_EFYEZNG8
#define LEAPER_H_EFYEZNG8

#include "src/obj/index.h"
#include "src/pphys/index.h"

typedef enum SLLeaperState {

  // Floating, unattached to any asteroid.
  //
  // Changes to Stuck or PreHanging.
  FloatingLeaperState,

  // Intermediate step between Floating and Stuck. Unused.
  LandingLeaperState,

  // Two of three "legs" are attached to an asteroid.
  //
  // Changes to Rotating or PreHanging.
  StuckLeaperState,

  // Rotating on one its "legs" that is attached to an asteroid.
  //
  // Changes to Stuck or PreHaning.
  RotatingLeaperState,

  // One leg attached as the other two face toward the player's
  // launch trajectory.
  //
  // Changes to Stuck or Rotating.
  PreHangingLeaperState,

  // One leg attached and two facing the player's launch trajectory.
  //
  // Changes to Rotating, PreHanging, or Floating.
  HangingLeaperState,

  // Player lost the game. Ran out of oxygen.
  LostLeaperState,

  // Player won the game. Unused.
  WonLeaperState
} SLLeaperState;

static const int SLLeaper_maxOxygen = 2048;
static const int SLLeaper_maxResource = 256;
static const int SLLeaper_resourceToOxygen = 16;

extern AQType SLLeaperType;

typedef struct SLLeaper {
  AQObj object;

  aqvec2 position;
  AQDOUBLE radius;
  AQDOUBLE radians;

  AQParticle *body;
  AQParticle *trigger;
  AQList *bodies;
  AQList *triggers;
  AQList *sticks;
  AQWorld *world;

  int rotatingOnIndex;
  AQList *_attachedIndices;

  SLLeaperState state;
  AQParticle *lastTouched;
  int isHome;

  void (*onvisit)( unsigned int );
  void (*onresource)( unsigned int );

  int visited;
  int oxygen;
  int resource;
  int totalResource;

  void *view;
} SLLeaper;

SLLeaper * SLLeaper_create( aqvec2 position );
void SLLeaper_applyDirection( SLLeaper *, AQDOUBLE radians );

aqvec2 SLLeaper_calcPosition( SLLeaper * );
double SLLeaper_radians( SLLeaper * );

#endif /* end of include guard: LEAPER_H_EFYEZNG8 */
