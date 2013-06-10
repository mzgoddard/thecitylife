#ifndef PARTICLE_H_11T85QNE
#define PARTICLE_H_11T85QNE

#include "../obj/index.h"
#include "./math.h"

typedef void (*AQParticleCallback)(void *);
typedef void (*AQParticleCollisionCallback)(void *, void *, void *);

extern AQType AQParticleType;

typedef unsigned int AQParticleMask;

typedef struct AQParticle {
  AQObj object;

  aqvec2 position;
  AQDOUBLE radius;
  AQDOUBLE mass;
  AQDOUBLE friction;

  aqvec2 lastPosition;
  aqvec2 acceleration;

  aqaabb _aabb;
  aqaabb oldAabb;

  aqbool isStatic;
  aqbool isTrigger;

  AQParticleMask collisionType;
  AQParticleMask collideAgainst;

  AQParticleCollisionCallback oncollision;
  void *userdata;

  void *collideWith;
  void *collideWithNext;
} AQParticle;

typedef struct aqcollision {
  AQParticle *a;
  AQParticle *b;
  AQDOUBLE lambx;
  AQDOUBLE lamby;
  AQDOUBLE distance;
  struct aqcollision *next;
} aqcollision;

aqaabb AQParticle_aabb( AQParticle * );
aqaabb AQParticle_lastAabb( AQParticle * );
void AQParticle_integrate( AQParticle *, AQDOUBLE dt );
void AQParticle_testPrep( AQParticle * );
int AQParticle_test( AQParticle *, AQParticle *, aqcollision * );
void AQParticle_solve( AQParticle *, AQParticle *, aqcollision * );

typedef void (*aqcollision_iterator)( aqcollision *, void * );

aqcollision * aqcollision_done( aqcollision * );
aqcollision * aqcollision_pop( aqcollision * );
void aqcollision_clear( aqcollision * );
void aqcollision_iterate( aqcollision *, aqcollision_iterator, void * );

void aqparticle_init();

#endif /* end of include guard: PARTICLE_H_11T85QNE */
