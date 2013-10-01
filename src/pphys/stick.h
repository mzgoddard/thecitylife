#ifndef STICK_H_S03CCDZ0
#define STICK_H_S03CCDZ0

#include "src/obj/index.h"
#include "src/pphys/particle.h"

extern AQType AQStickType;

typedef struct AQStick {
  AQObj object;

  AQParticle *a;
  AQParticle *b;
  double restLength;
} AQStick;

AQStick * AQStick_create( AQParticle *a, AQParticle *b );

void AQStick_update( AQStick * );

#endif /* end of include guard: STICK_H_S03CCDZ0 */
