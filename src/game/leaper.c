#include <assert.h>
#include <string.h>

#include "src/game/leaper.h"
#include "src/game/view.h"
#include "src/game/updater.h"
#include "src/game/leaperview.h"
#include "src/game/loop.h"

void _SLLeaper_update( SLLeaper *, AQDOUBLE );
void * _SLLeaper_view( SLLeaper * );

void _SLLeaper_oncollision( AQParticle *, AQParticle *, void * );
void _SLLeaper_gotoState( SLLeaper *, SLLeaperState );
// void _SLLeaper_...

AQViewableInterface _SLLeaperViewable = (AQViewableInterface) {
  (const char *) &AQViewableId,
  (void *(*)(void*)) &_SLLeaper_view
};

SLUpdaterInterface _SLLeaperUpdater = (SLUpdaterInterface) {
  (const char *) &SLUpdaterId,
  (void (*)(void*, AQDOUBLE)) &_SLLeaper_update
};

SLLeaper * SLLeaper_init( SLLeaper *self ) {
  memset( &self->position, 0, sizeof( SLLeaper ) - sizeof( AQObj ));

  self->body = aqinit( aqalloc( &AQParticleType ));
  self->body->radius = 5;
  self->body->userdata = self;

  self->trigger = aqinit( aqalloc( &AQParticleType ));
  AQParticle_ignoreParticle( self->trigger, self->body );
  self->body->radius = 5;
  self->trigger->isTrigger = 1;
  self->trigger->userdata = self;
  self->trigger->oncollision =
    (AQParticleCollisionCallback) _SLLeaper_oncollision;

  return self;
}

SLLeaper * SLLeaper_done( SLLeaper *self ) {
  if ( self->world ) {
    AQWorld_removeParticle( self->world, self->body );
    AQWorld_removeParticle( self->world, self->trigger );
    aqrelease( self->world );
  }

  aqrelease( self->body );
  aqrelease( self->trigger );

  return self;
}

void * SLLeaper_getInterface( SLLeaper *self, const char * interfaceId ) {
  if ( interfaceId == AQViewableId ) {
    return &_SLLeaperViewable;
  } else if ( interfaceId == SLUpdaterId ) {
    return &_SLLeaperUpdater;
  }
  return NULL;
}

SLLeaper * SLLeaper_create( aqvec2 position ) {
  SLLeaper *self = aqcreate( &SLLeaperType );

  self->body->position = self->body->lastPosition = position;
  self->trigger->position = self->trigger->lastPosition = position;

  self->world = aqretain( AQLoop_world() );
  AQWorld_addParticle( self->world, self->body );
  AQWorld_addParticle( self->world, self->trigger );

  AQLoop_addUpdater( self );

  self->state = FloatingLeaperState;

  return self;
}

// void SLLeaper_applyDirection( SLLeaper *self, AQDOUBLE radians ) {
//   if ( self->state )
// }

void _SLLeaper_update( SLLeaper *self, AQDOUBLE dt ) {
  self->position = self->body->position;
  self->trigger->position = self->body->position;
  self->trigger->lastPosition = self->body->lastPosition;

  if ( self->state == StuckLeaperState ) {
    // Maintain distance to last hit particle.
    aqvec2 diff = aqvec2_sub(
      self->body->position, self->lastTouched->position
    );
    if ( aqvec2_mag( diff ) > self->lastTouched->radius + self->body->radius ) {
      self->body->position = aqvec2_add(
        aqvec2_scale(
          aqvec2_normalized( diff ),
          self->lastTouched->radius + self->body->radius
        ),
        self->lastTouched->position
      );
    }

    // Don't move due to velocity when stuck. Other particles can move us.
    self->body->lastPosition = self->body->position;
  }

  // printf( "update %s\n", aqvec2_cstr( self->trigger->position ));
}

void * _SLLeaper_view( SLLeaper *self ) {
  if ( !self->view ) {
    // Do not retain view to avoid a circular reference. LeaperView will hold a
    // reference to Leaper, and so Leaper can clean up once LeaperView does.
    self->view = SLLeaperView_create( self );
  }
  return self->view;
}

void _SLLeaper_oncollision( AQParticle *a, AQParticle *b, void *collision ) {
  SLLeaper *self;
  if ( aqistype( a->userdata, &SLLeaperType )) {
    self = a->userdata;
  } else {
    self = b->userdata;

    // After this point `a` is always the Leaper trigger particle.
    AQParticle *tmp = a;
    a = b;
    b = tmp;
  }

  assert( self );
  assert( b != self->body );

  _SLLeaper_gotoState( self, StuckLeaperState );
  self->lastTouched = aqretain( b );
}

void _SLLeaper_gotoState( SLLeaper *self, SLLeaperState newState ) {
  self->state = newState;
}

AQTYPE_INIT_DONE_GETINTERFACE( SLLeaper );
