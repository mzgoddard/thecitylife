#ifndef PARTICLEVIEW_H_OX71P9K
#define PARTICLEVIEW_H_OX71P9K

#include "src/pphys/particle.h"
#include "src/game/shaders.h"

extern AQType SLParticleViewType;

typedef struct SLParticleView {
  AQObj object;

  AQList *particles;
  GLuint buffer;
  struct colorvertex vertices[65535 * 16];
  struct colorvertex *currentVertex;
} SLParticleView;

SLParticleView * SLParticleView_create();
void SLParticleView_addParticle( SLParticleView *, AQParticle * );

SLParticleView * SLParticleView_getAmbientParticleView();
void SLParticleView_addAmbientParticle( AQParticle * );

#endif /* end of include guard: PARTICLEVIEW_H_OX71P9K */
