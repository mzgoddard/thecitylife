#ifndef ASTEROIDVIEW_H_NUPWYDAT
#define ASTEROIDVIEW_H_NUPWYDAT

#include "src/obj/index.h"

#include "src/game/opengl.h"
#include "src/game/shaders.h"
#include "src/game/asteroid.h"

extern AQType SLAsteroidGroupViewType;

typedef struct SLAsteroidGroupView {
  AQObj object;

  AQList *asteroids;
  GLuint buffer;
  struct colorvertex vertices[65535]; // 768kb
  struct colorvertex *currentVertex;
} SLAsteroidGroupView;

SLAsteroidGroupView * SLAsteroidGroupView_create();
void SLAsteroidGroupView_addAsteroid( SLAsteroidGroupView *, SLAsteroid * );

#endif /* end of include guard: ASTEROIDVIEW_H_NUPWYDAT */
