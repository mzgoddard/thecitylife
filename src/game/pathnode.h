#ifndef PATHNODE_H_8LQY4BOI
#define PATHNODE_H_8LQY4BOI

#include "src/obj/index.h"
#include "src/pphys/math.h"

extern AQType BBPathNodeType;

typedef struct BBPathNode {
  AQObj object;

  aqvec2 position;
  AQList *neighbors;
} BBPathNode;

BBPathNode * BBPathNode_create( aqvec2 );
BBPathNode * BBPathNode_clone( BBPathNode * );

void BBPathNode_move( BBPathNode *, aqvec2 );

#endif /* end of include guard: PATHNODE_H_8LQY4BOI */
