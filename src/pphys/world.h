#ifndef WORLD_H_7U7N9UKM
#define WORLD_H_7U7N9UKM

#include "src/obj/index.h"
#include "./ddvt.h"

extern AQType AQWorldType;

typedef struct AQWorld {
  AQObj object;

  aqaabb aabb;
  AQDdvt *ddvt;
  AQList *particles;
  AQList *constraints;

  aqcollision *headCollision;
  aqcollision *nextCollision;
} AQWorld;

AQWorld * AQWorld_setAabb( AQWorld *, aqaabb );
void AQWorld_step( AQWorld *, AQDOUBLE dt );
void AQWorld_addParticle( AQWorld *, AQParticle * );
void AQWorld_removeParticle( AQWorld *, AQParticle * );
void AQWorld_addConstraint( AQWorld *, void * );
void AQWorld_removeConstraint( AQWorld *, void * );

#endif /* end of include guard: WORLD_H_7U7N9UKM */
