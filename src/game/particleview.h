#ifndef PARTICLEVIEW_H_OX71P9K
#define PARTICLEVIEW_H_OX71P9K

#include "src/pphys/particle.h"
#include "src/game/shaders.h"
#include "src/game/leaper.h"
#include "src/game/asteroid.h"

extern AQType SLParticleViewType;

typedef struct SLParticleView {
  AQObj object;

  int dirty;
  AQDOUBLE homePulse;
  AQList *particles;
  SLLeaper *leaper;
  SLAsteroid *homeAsteroid;

  GLuint buffer;
  struct colorvertex vertices[65535 * 16];
  struct colorvertex *currentVertex;
} SLParticleView;

SLParticleView * SLParticleView_create();
void SLParticleView_addParticle( SLParticleView *, AQParticle * );
void SLParticleView_setLeaper( SLParticleView *, SLLeaper * );
void SLParticleView_setHomeAsteroid( SLParticleView *, SLAsteroid * );

SLParticleView * SLParticleView_getAmbientParticleView();
void SLParticleView_addAmbientParticle( AQParticle * );

#endif /* end of include guard: PARTICLEVIEW_H_OX71P9K */
