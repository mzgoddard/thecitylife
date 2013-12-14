#ifndef ACTORVIEW_H_YP9AI4W3
#define ACTORVIEW_H_YP9AI4W3

#include "src/game/actor.h"
#include "src/game/shaders.h"

extern AQType AQActorViewType;

typedef struct AQActorView {
  AQObj object;

  AQActor *actor;
  GLuint buffer;
  struct colorvertex vertices[512];
} AQActorView;

AQActorView * AQActorView_create( AQActor *actor );

#endif /* end of include guard: ACTORVIEW_H_YP9AI4W3 */
