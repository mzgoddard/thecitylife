#include <stdio.h>
#include <stdlib.h>
#include "src/pphys/constraint.h"
#include "src/pphys/stick.h"
#include "src/pphys/world.h"

void AQStick_setWorld( AQStick *self, AQWorld *world );

AQConstraintInterface _AQStick_ConstraintInterface = {
  AQConstraintId,
  (void (*)(void *, void *)) &AQStick_setWorld,
  (void (*)(void *)) &AQStick_update
};

AQStick * AQStick_init( AQStick *self ) {
  self->a = NULL;
  self->b = NULL;
  self->restLength = 0;
  return self;
}

AQStick * AQStick_done( AQStick *self ) {
  aqrelease( self->a );
  aqrelease( self->b );
  return self;
}

void * AQStick_getInterface( AQStick *self, AQInterfaceId id ) {
  if ( id == AQConstraintId ) {
    return &_AQStick_ConstraintInterface;
  }
  return NULL;
}

AQStick * AQStick_create( AQParticle *a, AQParticle *b ) {
  AQStick *self = aqcreate( &AQStickType );
  self->a = aqretain( a );
  self->b = aqretain( b );
  self->restLength = aqvec2_mag( aqvec2_sub(
    self->a->position,
    self->b->position
  ) );
  return self;
}

void AQStick_setWorld( AQStick *self, AQWorld *world ) {
  return;
}

void AQStick_update( AQStick *self ) {
  AQParticle *a = self->a;
  AQParticle *b = self->b;

  // diff = a - b
  aqvec2 diff = aqvec2_sub( a->position, b->position );
  aqvec2 unitDiff = aqvec2_normalized( diff );
  // fullDiff = scale( normDiff, restLength )
  // diffDiff = scale( normDiff, restLength - mag( diff ) )
  diff = aqvec2_scale( unitDiff, self->restLength - aqvec2_mag( diff ) );
  // totalMass = a.mass + b.mass
  double totalMass = a->mass + b->mass;
  // a += scale( diffDiff, a->mass / totalMass )
  a->position = aqvec2_add(
    a->position,
    aqvec2_scale( diff, a->mass / totalMass * 0.5 )
  );
  // b -= scale( diffDiff, b->mass / totalMass )
  b->position = aqvec2_sub(
    b->position,
    aqvec2_scale( diff, b->mass / totalMass * 0.5 )
  );
}

AQTYPE( AQStick );
