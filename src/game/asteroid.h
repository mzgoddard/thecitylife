#ifndef ASTEROID_H_HFUI9Q91
#define ASTEROID_H_HFUI9Q91

#include "src/obj/index.h"
#include "src/pphys/index.h"

// Line of trigger particles that apply acceleration in their direction.
extern AQType SLAsteroidType;

typedef struct SLAsteroid {
  AQObj object;

  aqvec2 center;
  AQDOUBLE radius;
  AQDOUBLE mass;

  AQWorld *world;
  AQList *particles;
  // AQList *sticks;

  int isVisible;
  float visibility;
  int isHome;
} SLAsteroid;

SLAsteroid * SLAsteroid_create(
  AQWorld *world, aqvec2 center, AQDOUBLE radius
);

void SLAsteroid_setIsHome( SLAsteroid *, int home );
int AQParticle_isHomeAsteroid( AQParticle *p );

#endif /* end of include guard: ASTEROID_H_HFUI9Q91 */
