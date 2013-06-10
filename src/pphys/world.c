#include <assert.h>
#include <stdlib.h>

#include "./world.h"

AQWorld * AQWorld_init( AQWorld *self ) {
  self->ddvt = aqretain( AQDdvt_create( aqaabb_make( 0, 0, 0, 0 )));
  self->particles = aqretain( aqcreate( &AQListType ));
  self->headCollision = aqcollision_pop( NULL );
  self->nextCollision = self->headCollision;
  return self;
}

AQWorld * AQWorld_done( AQWorld *self ) {
  aqrelease( self->ddvt );
  aqrelease( self->particles );
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
  AQParticle_integrate( particle, self->dt );
  AQParticle_testPrep( particle );
  aqaabb newAabb = particle->_aabb = AQParticle_aabb( particle );
  AQDdvt_updateParticle( self->world->ddvt, particle, particle->oldAabb, newAabb );
  particle->oldAabb = newAabb;
}

void _AQWorld_boxTestIterator( AQParticle *a, AQParticle *b, void *ctx ) {
  AQWorld *self = (AQWorld *) ctx;
  if (
    aqaabb_intersectsBox( a->_aabb, b->_aabb ) &&
      AQParticle_test( a, b, self->nextCollision )
  ) {
    self->nextCollision = aqcollision_pop( self->nextCollision );
  }
}

void _AQWorld_solveIterator( aqcollision *col, void *ctx ) {
  AQParticle_solve( col->a, col->b, col );
}

void _AQWorld_maintainBoxIterator( AQParticle *particle, void *ctx ) {
  AQWorld *world = (AQWorld *) ctx;
  aqaabb aabb = AQParticle_aabb( particle );

  if ( aabb.left < world->aabb.left ) {
    particle->position.x += world->aabb.left - aabb.left;
  }
  if ( aabb.right > world->aabb.right ) {
    particle->position.x += world->aabb.right - aabb.right;
  }
  if ( aabb.bottom < world->aabb.left ) {
    particle->position.y += world->aabb.bottom - aabb.bottom;
  }
  if ( aabb.top > world->aabb.top ) {
    particle->position.y += world->aabb.top - aabb.top;
  }
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

  AQList_iterate( self->particles, (AQList_iterator) _AQWorld_maintainBoxIterator, self );
}

void AQWorld_addParticle( AQWorld *self, AQParticle *particle ) {
  assert( !isnan(particle->position.x) && !isnan(particle->position.y) );
  AQDdvt_addParticle( self->ddvt, particle );
  AQList_push( self->particles, (AQObj *) particle );
  particle->oldAabb = AQParticle_aabb( particle );
}

void AQWorld_removeParticle( AQWorld *self, AQParticle *particle ) {
  AQDdvt_removeParticle( self->ddvt, particle, particle->oldAabb );
  AQList_remove( self->particles, (AQObj *) particle );
}

AQTYPE_INIT_DONE(AQWorld);
