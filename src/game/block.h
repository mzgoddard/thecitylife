#ifndef WORLDBLOCK_H_Y3YA0JXG
#define WORLDBLOCK_H_Y3YA0JXG

#include "src/obj/index.h"
#include "src/pphys/index.h"
#include "src/game/room.h"

typedef enum {
  BBBlockOpenSide,
  BBBlockClosedSide,
  BBBlockHalfSide,
  BBBlockAlleySide
} BBBlockSide;

extern AQType BBBlockType;

typedef struct BBBlock {
  AQObj object;

  aqaabb aabb;
  BBRotation rotation;
  AQWorld *world;

  BBBlockSide sides[4];
  AQList *rooms;
  AQList *items;
  AQList *pathNodes;
} BBBlock;

BBBlock * BBBlock_clone( BBBlock * );
BBBlock * BBBlock_rotateTo( BBBlock *, BBRotation );
BBBlock * BBBlock_move( BBBlock *, aqvec2 diff );
BBBlock * BBBlock_moveTo( BBBlock *, aqvec2 tl );

void BBBlock_addToWorld( BBBlock *, AQWorld * );
void BBBlock_removeFromWorld( BBBlock *, AQWorld * );

#endif /* end of include guard: WORLDBLOCK_H_Y3YA0JXG */
