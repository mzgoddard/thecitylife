#include <assert.h>
#include <stdlib.h>
#include <stddef.h>

#include "./world.h"
#include "./constraint.h"

AQWorld * AQWorld_init( AQWorld *self ) {
  self->ddvt = aqretain( AQDdvt_create( aqaabb_make( 0, 0, 0, 0 )));
  self->particles = aqretain( aqcreate( &AQListType ));
  self->constraints = aqretain( aqcreate( &AQListType ));
  self->headCollision = aqcollision_pop( NULL );
  self->nextCollision = self->headCollision;
  return self;
}

AQWorld * AQWorld_done( AQWorld *self ) {
  aqrelease( self->ddvt );
  aqrelease( self->particles );
  aqrelease( self->constraints );
  aqcollision_done( self->headCollision );
  return self;
}

struct _AQWorld_integrateContext {
  AQWorld *world;
  AQDOUBLE dt;
};

void _AQWorld_integrateIterator( AQObj *item, void *ctx ) {
  AQParticle *particle = (AQParticle *) item;
  struct _AQWorld_integrateContext *self =
    (struct _AQWorld_integrateContext *) ctx;
  assert( !isnan(particle->position.x) && !isnan(particle->position.y) );
  // particle->lastAverageCollisionDepth = (
  //   particle->lastAverageCollisionDepth +
  //   particle->currentAverageCollisionDepth
  // ) / 2;
  // if ( particle->isSleeping ) {
  //   AQParticle_testPrep( particle );
  //   particle->acceleration = (aqvec2) { 0, 0 };
  //   return;
  // }
  AQParticle_integrate( particle, self->dt );
  AQParticle_testPrep( particle );
  // particle->currentAverageCollisionDepth = 0;
  // particle->collisionCount = 0;

  aqaabb newAabb = particle->_aabb = AQParticle_aabb( particle );
  if ( aqvec2_mag2( aqvec2_sub( particle->position, particle->oldPosition )) > particle->radius / 10 ) {
    AQDdvt_updateParticle( self->world->ddvt, particle, particle->oldAabb, newAabb );
    particle->oldPosition = particle->position;
    particle->oldAabb = newAabb;
  }
}

void _AQWorld_boxTestIterator( AQParticle *a, AQParticle *b, void *ctx ) {
  AQWorld *self = (AQWorld *) ctx;
  // if ( a->isSleeping && b->isSleeping ) {
  //   return;
  // }
  if (
    aqaabb_intersectsBox( a->_aabb, b->_aabb ) &&
      AQParticle_test( a, b, self->nextCollision )
  ) {
    self->nextCollision = aqcollision_pop( self->nextCollision );
  }
}

void _AQWorld_solveIterator( aqcollision *col, void *ctx ) {
  // const AQDOUBLE sleepDistance = 0.1;
  // const int counterReset = 5;
  // if ( col->distance / 2 > col->a->currentAverageCollisionDepth ) {
  //   col->a->currentAverageCollisionDepth = col->distance / 2;
  // }
  // if ( col->distance / 2 > col->b->currentAverageCollisionDepth ) {
  //   col->b->currentAverageCollisionDepth = col->distance / 2;
  // }
  // col->a->currentAverageCollisionDepth += col->distance / 2;
  // col->b->currentAverageCollisionDepth += col->distance / 2;
  // col->a->collisionCount++;
  // col->b->collisionCount++;
  // if ( col->a->isSleeping && col->distance > sleepDistance ) {
  //   col->a->sleepCounter = counterReset;
  //   col->a->isSleeping = 0;
  // } else if ( col->b->isSleeping && col->distance > sleepDistance ) {
  //   col->a->sleepCounter = counterReset;
  // } else if ( col->b->isSleeping &&
  //   fdim( col->b->position.x, col->b->lastPosition.x ) < 1e-1 &&
  //   fdim( col->b->position.y, col->b->lastPosition.y ) < 1e-1
  // ) {
  //   col->a->sleepCounter--;
  // }
  // if ( col->b->isSleeping && col->distance > sleepDistance ) {
  //   col->b->sleepCounter = counterReset;
  //   col->b->isSleeping = 0;
  // } else if ( col->a->isSleeping && col->distance > sleepDistance ) {
  //   col->b->sleepCounter = counterReset;
  // } else if ( col->a->isSleeping &&
  //   fdim( col->b->position.x, col->b->lastPosition.x ) < 1e-1 &&
  //   fdim( col->b->position.y, col->b->lastPosition.y ) < 1e-1
  // ) {
  //   col->b->sleepCounter--;
  // }
  AQParticle_solve( col->a, col->b, col );
}

void _AQWorld_performConstraints( AQInterfacePtr *interfacePtr, void *ctx ) {
  AQInterfacePtr_call0(
    interfacePtr,
    offsetof( AQConstraintInterface, update )
  );
}

void _AQWorld_maintainBoxIterator( AQParticle *particle, void *ctx ) {
  AQWorld *world = (AQWorld *) ctx;
  aqaabb aabb = AQParticle_aabb( particle );

  int wallContact = 0;
  if ( aabb.left < world->aabb.left ) {
    particle->position.x += world->aabb.left - aabb.left;
    wallContact = 1;
  }
  if ( aabb.right > world->aabb.right ) {
    particle->position.x += world->aabb.right - aabb.right;
    wallContact = 1;
  }
  if ( aabb.bottom < world->aabb.bottom ) {
    particle->position.y += world->aabb.bottom - aabb.bottom;
    particle->lastPosition.y = particle->position.y;
    wallContact = 1;
  }
  if ( aabb.top > world->aabb.top ) {
    particle->position.y += world->aabb.top - aabb.top;
    wallContact = 1;
  }

  // if ( particle->collisionCount ) {
  //   particle->currentAverageCollisionDepth /= (float) particle->collisionCount;
  // }

  // if ( particle->currentAverageCollisionDepth / 2 > particle->radius - particle->_radius ) {
  //   // particle->radius = fmin( particle->_radius + fmin( particle->currentAverageCollisionDepth, particle->radius * 3 ), particle->radius + 0.001 );
  //   // if ( particle->radius < particle->_radius * 10 )
  //   // particle->radius += 0.001;
  //   // particle->radius = particle->radius * 1.05;
  //   particle->mass = M_PI * particle->radius * particle->radius;
  // } else if ( particle->radius > particle->_radius ) {
  //   // particle->radius -= 0.0005;
  //   particle->mass = M_PI * particle->radius * particle->radius;
  // }

  // if (
  //   // wallContact &&
  //     fdim( particle->position.x, particle->lastPosition.x ) < 1e-2 &&
  //     fdim( particle->position.y, particle->lastPosition.y ) < 1e-2
  // ) {
  //   particle->sleepCounter--;
  // } else {
  //   particle->sleepCounter = 10;
  //   particle->isSleeping = 0;
  // }
  // 
  // if ( particle->sleepCounter <= 0 && !particle->isSleeping ) {
  //   particle->lastPosition = particle->position;
  //   particle->isSleeping = 1;
  // }
}

AQWorld * AQWorld_setAabb( AQWorld *self, aqaabb aabb ) {
  self->aabb = aabb;
  self->ddvt->aabb = aabb;
  return self;
}

void AQWorld_step( AQWorld *self, AQDOUBLE dt ) {
  // integrate all
  struct _AQWorld_integrateContext integrateContext = {
    self,
    dt
  };
  AQList_iterate(
    self->particles, _AQWorld_integrateIterator, &integrateContext
  );

  // iterate pairs and test for collisions
  AQDdvt_iteratePairs( self->ddvt, _AQWorld_boxTestIterator, self );

  // solve all collisions
  aqcollision_iterate( self->headCollision, _AQWorld_solveIterator, self );
  aqcollision_clear( self->headCollision );
  self->nextCollision = self->headCollision;

  AQList_iterate(
    self->constraints, (AQList_iterator) _AQWorld_performConstraints, NULL
  );

  AQList_iterate(
    self->particles, (AQList_iterator) _AQWorld_maintainBoxIterator, self
  );
}

void AQWorld_addParticle( AQWorld *self, AQParticle *particle ) {
  assert( !isnan(particle->position.x) && !isnan(particle->position.y) );
  AQDdvt_addParticle( self->ddvt, particle );
  AQList_push( self->particles, (AQObj *) particle );
  particle->_radius = particle->radius;
  particle->oldPosition = particle->position;
  particle->oldAabb = AQParticle_aabb( particle );
}

void AQWorld_removeParticle( AQWorld *self, AQParticle *particle ) {
  AQDdvt_removeParticle( self->ddvt, particle, particle->oldAabb );
  AQList_remove( self->particles, (AQObj *) particle );
}

void AQWorld_addConstraint( AQWorld *self, void *_constraint ) {
  AQInterfacePtr *constraintPtr = aqcastptr( _constraint, AQConstraintId );
  if ( constraintPtr ) {
    AQInterfacePtr_call1(
      constraintPtr,
      offsetof( AQConstraintInterface, setWorld ),
      self
    );
    AQList_push( self->constraints, (AQObj *) constraintPtr );
  }
}

int _AQWorld_findConstraintIterator(
  AQInterfacePtr *constraintPtr, void *ctx
) {
  return constraintPtr->context == ctx;
}

void AQWorld_removeConstraint( AQWorld *self, void *_constraint ) {
  int index = AQList_findIndex(
    self->constraints,
    (AQList_findIterator) _AQWorld_findConstraintIterator,
    _constraint
  );
  if ( !!~index ) {
    AQList_removeAt( self->constraints, index );
  }
}

AQTYPE_INIT_DONE(AQWorld);
