#ifndef RAY_H_3FOINAUS
#define RAY_H_3FOINAUS

#include "src/obj/obj.h"
#include "src/pphys/math.h"
#include "src/pphys/particle.h"
#include "src/pphys/world.h"

extern AQType AQRayType;

typedef struct AQRay {
  AQObj object;

  aqvec2 position;
  aqvec2 direction;
  AQDOUBLE distance;
} AQRay;

AQRay * AQRay_create( aqvec2 position, aqvec2 direction, AQDOUBLE distance );
int AQRay_testParticle( AQRay *, AQParticle * );
AQParticle * AQRay_testWorld( AQRay *, AQWorld *, AQParticleMask );

#endif /* end of include guard: RAY_H_3FOINAUS */
