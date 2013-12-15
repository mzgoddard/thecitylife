#ifndef MULTIWALLVIEW_H_A5FX76WG
#define MULTIWALLVIEW_H_A5FX76WG

#include "src/obj/index.h"
#include "src/game/shaders.h"
#include "src/game/wall.h"

extern AQType BBMultiWallViewType;

typedef struct BBMultiWallView {
  AQObj object;

  AQList *walls;
  GLuint buffer;
  struct colorvertex vertices[65536];
} BBMultiWallView;

BBMultiWallView * BBMultiWallView_create();
void BBMultiWallView_addWall( BBMultiWallView *, BBWall * );
void BBMultiWallView_removeWall( BBMultiWallView *, BBWall * );

#endif /* end of include guard: MULTIWALLVIEW_H_A5FX76WG */
