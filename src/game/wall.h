#ifndef WALL_H_LEY3WD3T
#define WALL_H_LEY3WD3T

#include "src/obj/index.h"
#include "src/pphys/index.h"

typedef enum {
  BBWallWall,
  BBTableWall
} BBWallEnum;

extern AQType BBWallType;

typedef struct BBWall {
  AQObj object;

  aqaabb aabb;
  AQList *particles;
  AQWorld *world;

  BBWallEnum wallType;

  int dirtyView;
} BBWall;

BBWall * BBWall_create( aqaabb, BBWallEnum );

BBWall * BBWall_clone( BBWall * );

void BBWall_addToWorld( BBWall *, AQWorld * );
void BBWall_removeFromWorld( BBWall *, AQWorld * );
void BBWall_removeParticle( BBWall *, AQParticle * );

#endif /* end of include guard: WALL_H_LEY3WD3T */
