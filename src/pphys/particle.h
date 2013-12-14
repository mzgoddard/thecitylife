#ifndef PARTICLE_H_11T85QNE
#define PARTICLE_H_11T85QNE

#include "../obj/index.h"
#include "./math.h"

#include "defines.h"

#ifndef kParticleCorrection
#define kParticleCorrection 1.0
#endif

typedef void (*AQParticleCallback)(void *);
typedef void (*AQParticleCollisionCallback)(void *, void *, void *);

extern AQType AQParticleType;

typedef unsigned int AQParticleMask;

typedef struct AQParticle {
  AQObj object;

  aqvec2 position;
  AQDOUBLE radius;
  AQDOUBLE _radius;
  AQDOUBLE mass;
  AQDOUBLE friction;
  AQDOUBLE correction;

  aqvec2 oldPosition;
  aqvec2 lastPosition;
  // aqvec2 lastVelocity;
  aqvec2 acceleration;

  #if !__SSE__
  aqaabb _aabb;
  #else
  _aqaabb _aabb;
  _aqaabb _aabb2;
  #endif
  aqaabb oldAabb;

  aqbool isStatic;
  aqbool isTrigger;
  aqbool isSleeping;
  unsigned char sleepCounter;
  // AQDOUBLE currentAverageCollisionDepth;
  // int collisionCount;
  // AQDOUBLE lastAverageCollisionDepth;

  AQParticleMask collisionType;
  // AQParticleMask collideAgainst;

  AQParticleCollisionCallback oncollision;
  void *userdata;

  void *collideWith;
  void *collideWithNext;

  struct AQParticle *groupParticle;

  void *ignoreParticle;
  void *ignoreGroup;
} AQParticle;

typedef struct aqcollision {
  AQParticle *a;
  AQParticle *b;
  #if !__SSE__
  AQDOUBLE lambx;
  AQDOUBLE lamby;
  #else
  aqvec2 lamb;
  #endif
  AQDOUBLE distance;
  struct aqcollision *next;
} aqcollision;

aqaabb AQParticle_aabb( AQParticle * );
aqaabb AQParticle_lastAabb( AQParticle * );
void AQParticle_integrate( AQParticle *, AQDOUBLE dt );
void AQParticle_testPrep( AQParticle * );
int AQParticle_test( AQParticle *, AQParticle *, aqcollision * );
void AQParticle_solve( AQParticle *, AQParticle *, aqcollision * );
int AQParticle_doesIgnore( AQParticle *, AQParticle * );
void AQParticle_ignoreParticle( AQParticle *, AQParticle * );
void AQParticle_ignoreGroup( AQParticle *, AQParticle * );
void AQParticle_wake( AQParticle * );

typedef void (*aqcollision_iterator)( aqcollision *, void * );

aqcollision * aqcollision_done( aqcollision * );
aqcollision * aqcollision_pop( aqcollision * );
void aqcollision_clear( aqcollision * );
void aqcollision_iterate( aqcollision *, aqcollision_iterator, void * );

void aqparticle_init();

#endif /* end of include guard: PARTICLE_H_11T85QNE */
