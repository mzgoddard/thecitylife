#ifndef LEAPERVIEW_H_4LT5MG2Q
#define LEAPERVIEW_H_4LT5MG2Q

#include "src/obj/index.h"
#include "src/pphys/index.h"
#include "src/game/leaper.h"
#include "src/game/opengl.h"
#include "src/game/shaders.h"
#include "src/game/renderer.h"

AQType SLLeaperViewType;

typedef struct SLLeaperView {
  AQObj object;

  SLLeaper *leaper;
  GLuint buffer;
  struct colorvertex vertices[512];
} SLLeaperView;

SLLeaperView * SLLeaperView_create( SLLeaper * );

#endif /* end of include guard: LEAPERVIEW_H_4LT5MG2Q */
