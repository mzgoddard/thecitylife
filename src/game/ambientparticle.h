#ifndef AMBIENTPARTICLE_H_HK65FK71
#define AMBIENTPARTICLE_H_HK65FK71

#include "src/obj/index.h"
#include "src/pphys/particle.h"
#include "src/game/shaders.h"

extern AQType SLAmbientParticleType;

typedef struct SLAmbientParticle {
  AQObj object;

  AQParticle *particle;
  int contactPulseValue;
} SLAmbientParticle;

SLAmbientParticle * SLAmbientParticle_create();
void SLAmbientParticle_startPulse( SLAmbientParticle * );
void SLAmbientParticle_tick( SLAmbientParticle * );
void SLAmbientParticle_setParticle( SLAmbientParticle *, AQParticle * );
struct glcolor SLAmbientParticle_color( SLAmbientParticle * );

#endif /* end of include guard: AMBIENTPARTICLE_H_HK65FK71 */
