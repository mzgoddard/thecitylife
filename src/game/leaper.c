#include <assert.h>
#include <stdlib.h>
#include <string.h>

#include "src/game/leaper.h"
#include "src/game/view.h"
#include "src/game/updater.h"
#include "src/game/leaperview.h"
#include "src/game/loop.h"
#include "src/game/asteroid.h"
#include "src/game/colors.h"

void _SLLeaper_update( SLLeaper *, AQDOUBLE );
void * _SLLeaper_view( SLLeaper * );

void _SLLeaper_oncollision( AQParticle *, AQParticle *, void * );
void _SLLeaper_gotoState( SLLeaper *, SLLeaperState );
// void _SLLeaper_...

// AQIMPLEMENT( SLLeaper, AQViewable,
//   _SLLeaper_view
// );
// 
// AQIMPLEMENT( SLLeaper, SLUpdater,
//   _SLLeaper_update
// );

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

  self->radius = 5;

  self->body = aqinit( aqalloc( &AQParticleType ));
  self->body->radius = 5;
  self->body->userdata = self;

  self->trigger = aqinit( aqalloc( &AQParticleType ));
  AQParticle_ignoreParticle( self->trigger, self->body );
  self->trigger->radius = 5;
  self->trigger->isTrigger = 1;
  self->trigger->userdata = self;
  self->trigger->oncollision =
    (AQParticleCollisionCallback) _SLLeaper_oncollision;

  self->oxygen = SLLeaper_maxOxygen;

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

// AQGETINTERFACE( SLLeaper,
//   AQVIEWABLE( AQViewable ),
//   AQUPDATER( SLUpdater )
// )

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

void SLLeaper_applyDirection( SLLeaper *self, AQDOUBLE radians ) {
  if ( self->state == StuckLeaperState ) {
    float c = cos( radians );
    float s = sin( radians );
    float f = 10;
    self->body->position =
      aqvec2_add( self->body->position, aqvec2_make( c * 0.2, s * 0.2 ));
    self->body->lastPosition =
      aqvec2_add( self->body->position, aqvec2_make( c * f, s * f ));
    _SLLeaper_gotoState( self, FloatingLeaperState );
  }
}

void _SLLeaper_update( SLLeaper *self, AQDOUBLE dt ) {
  self->position = self->body->position;
  self->trigger->position = self->body->position;
  self->trigger->lastPosition = self->body->lastPosition;

  if ( self->state == FloatingLeaperState ) {
    aqvec2 velocity = aqvec2_sub( self->body->lastPosition, self->body->position );
    float angle = atan2( velocity.y, velocity.x );
    self->radians = ( angle - self->radians ) * 0.2 + self->radians;
  }

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

    // Update asteroid.
    void *maybeAsteroid = self->lastTouched->userdata;
    if ( maybeAsteroid && aqistype( maybeAsteroid, &SLAsteroidType )) {
      SLAsteroid *asteroid = maybeAsteroid;

      if ( !asteroid->isVisible && !asteroid->isHome ) {
        self->visited++;
        if ( self->onvisit ) {
          self->onvisit( self->visited );
        }

        // Resource asteroid.
        if ( self->visited == 3 || ( self->visited > 3 && rand() < RAND_MAX / 2 ) ) {
          asteroid->resource = rand() % 128;
          asteroid->color = resourceAsteroidColor;
        // Normal asteroid.
        } else {
          float percent = rand() / (float) RAND_MAX;
          asteroid->color = (struct glcolor) {
            normalAsteroidColor.r / 2 + percent * normalAsteroidColor.r / 2,
            normalAsteroidColor.g / 2 + percent * normalAsteroidColor.g / 2,
            normalAsteroidColor.b / 2 + percent * normalAsteroidColor.b / 2,
            normalAsteroidColor.a
          };
        }
      }

      asteroid->isVisible = 1;
      asteroid->center = self->lastTouched->position;

      if ( asteroid->resource && self->resource < SLLeaper_maxResource ) {
        int resource = asteroid->resource < 1 ? asteroid->resource : 1;
        asteroid->resource -= resource;
        self->resource += resource;
        self->totalResource += resource;

        if ( self->onresource ) {
          self->onresource( self->totalResource );
        }

        float resourcePercent = 1.0 -
          asteroid->resource / (float) SLLeaper_maxResource;
        asteroid->color = SL_lerpColor(
          normalAsteroidColor, resourceAsteroidColor, resourcePercent
        );
      }
    }
  }

  //
  // Update oxygen.
  if ( self->isHome ) {
    int oxygen = self->resource < 5 ? self->resource : 5;
    if ( oxygen > ( SLLeaper_maxOxygen - self->oxygen ) / SLLeaper_resourceToOxygen ) {
      oxygen = ( SLLeaper_maxOxygen - self->oxygen ) / SLLeaper_resourceToOxygen;
    }
    self->resource -= oxygen;
    self->oxygen += oxygen * SLLeaper_resourceToOxygen;
  }

  self->oxygen -= 1;
  if ( self->oxygen < 0 ) {
    _SLLeaper_gotoState( self, LostLeaperState );
  }
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

  aqrelease( self->lastTouched );
  self->lastTouched = aqretain( b );

  _SLLeaper_gotoState( self, StuckLeaperState );
}

void _SLLeaper_gotoState( SLLeaper *self, SLLeaperState newState ) {
  if ( self->state == LostLeaperState ) {
    return;
  }

  if ( newState == StuckLeaperState ) {
    SLAsteroid *asteroid = (SLAsteroid *) self->lastTouched->userdata;
    if ( asteroid && aqistype( asteroid, &SLAsteroidType ) && asteroid->isHome ) {
      self->isHome = 1;
    }
  } else {
    self->isHome = 0;
  }

  self->state = newState;
}

AQTYPE_INIT_DONE_GETINTERFACE( SLLeaper );
