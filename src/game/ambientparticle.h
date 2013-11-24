#ifndef AMBIENTPARTICLE_H_HK65FK71
#define AMBIENTPARTICLE_H_HK65FK71

#include "src/obj/index.h"
#include "src/game/shaders.h"

extern AQType SLAmbientParticleType;

typedef struct SLAmbientParticle {
  AQObj object;

  int contactPulseValue;
} SLAmbientParticle;

SLAmbientParticle * SLAmbientParticle_create();
void SLAmbientParticle_startPulse( SLAmbientParticle * );
void SLAmbientParticle_tick( SLAmbientParticle * );
struct glcolor SLAmbientParticle_color( SLAmbientParticle * );

#endif /* end of include guard: AMBIENTPARTICLE_H_HK65FK71 */
