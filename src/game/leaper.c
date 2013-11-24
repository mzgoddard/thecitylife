#include <assert.h>
#include <stdlib.h>
#include <string.h>

#include "src/obj/number.h"
#include "src/game/leaper.h"
#include "src/game/view.h"
#include "src/game/updater.h"
#include "src/game/leaperview.h"
#include "src/game/loop.h"
#include "src/game/asteroid.h"
#include "src/game/colors.h"
#include "src/game/particleview.h"
#include "src/game/ambientparticle.h"

#define FRAME_FRACTION 1.0
#define CORRECTION_FRACTION 0.25
#define FLIGHT_SPEED 2
#define TURN_SPEED 5
#define STUCK_TO_HANGING_POWER 0.2

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

void _SLLeaper_setPosition( SLLeaper *self, aqvec2 position ) {
  AQParticle *body;
  AQParticle *trigger;

  for ( int i = 0; i < 3; ++i ) {
    body = (AQParticle *) AQList_at( self->bodies, i );
    trigger = (AQParticle *) AQList_at( self->triggers, i );
    body->position = body->lastPosition =
      trigger->position = trigger->lastPosition =
      (aqvec2) {
        position.x + cos( M_PI / 2 + M_PI * 2 / 3 * i ) * self->radius,
        position.y + sin( M_PI / 2 + M_PI * 2 / 3 * i ) * self->radius,
      };
  }

  self->position = position;
}

SLLeaper * SLLeaper_init( SLLeaper *self ) {
  memset( &self->position, 0, sizeof( SLLeaper ) - sizeof( AQObj ));

  self->radius = 8;

  // self->body = aqinit( aqalloc( &AQParticleType ));
  // self->body->radius = 5;
  // self->body->userdata = self;

  // self->trigger = aqinit( aqalloc( &AQParticleType ));
  // AQParticle_ignoreParticle( self->trigger, self->body );
  // self->trigger->radius = 5;
  // self->trigger->isTrigger = 1;
  // self->trigger->userdata = self;
  // self->trigger->oncollision =
  //   (AQParticleCollisionCallback) _SLLeaper_oncollision;

  self->bodies = aqinit( aqalloc( &AQListType ));
  self->triggers = aqinit( aqalloc( &AQListType ));
  self->sticks = aqinit( aqalloc( &AQListType ));
  self->_attachedIndices = aqinit( aqalloc( &AQListType ));

  AQParticle *body;
  AQParticle *trigger;
  AQStick *stick;
  for ( int i = 0; i < 3; ++i ) {
    body = aqcreate( &AQParticleType );
    for ( int j = 0; j < i; ++j ) {
      AQParticle_ignoreParticle(
        (AQParticle *) AQList_at( self->triggers, j ), body
      );
      assert( AQParticle_doesIgnore( (AQParticle *) AQList_at( self->triggers, j ), body ));
    }
    body->radius = 2;
    body->position = body->lastPosition = (aqvec2) {
      cos( M_PI / 2 + M_PI * 2 / 3 * i ) * self->radius,
      sin( M_PI / 2 + M_PI * 2 / 3 * i ) * self->radius,
    };
    body->userdata = self;
    AQList_push( self->bodies, (AQObj *) body );

    trigger = aqcreate( &AQParticleType );
    for ( int j = 0; j <= i; ++j ) {
      AQParticle_ignoreParticle(
        trigger, (AQParticle *) AQList_at( self->bodies, j )
      );
      assert( AQParticle_doesIgnore( trigger, (AQParticle *) AQList_at( self->bodies, j )));
    }
    for ( int j = 0; j < i; ++j ) {
      AQParticle_ignoreParticle(
        trigger, (AQParticle *) AQList_at( self->triggers, j )
      );
      assert( AQParticle_doesIgnore( trigger, (AQParticle *) AQList_at( self->triggers, j )));
    }
    trigger->radius = 2.5;
    trigger->position = trigger->lastPosition = body->position;
    trigger->isTrigger = 1;
    trigger->userdata = self;
    trigger->oncollision =
      (AQParticleCollisionCallback) _SLLeaper_oncollision;
    AQList_push( self->triggers, (AQObj *) trigger );

    if ( i > 0 ) {
      stick =
        AQStick_create( (AQParticle *) AQList_at( self->bodies, i - 1 ), body );
      AQList_push( self->sticks, (AQObj *) stick );
    }
    if ( i == 2 ) {
      stick =
        AQStick_create( body, (AQParticle *) AQList_at( self->bodies, 0 ));
      AQList_push( self->sticks, (AQObj *) stick );
    }
  }

  self->visited = 0;
  self->oxygen = SLLeaper_maxOxygen;
  self->resource = 0;
  self->totalResource = 0;
  self->view = NULL;

  return self;
}

void _SLLeaper_removeParticleIterator( AQObj *obj, void *_world ) {
  AQWorld_removeParticle( (AQWorld *) _world, (AQParticle *) obj );
}

void _SLLeaper_removeConstraintIterator( AQObj *obj, void *_world ) {
  AQWorld_removeConstraint( (AQWorld *) _world, obj );
}

SLLeaper * SLLeaper_done( SLLeaper *self ) {
  printf( "***SLLeaper_done***\n" );
  if ( self->world ) {
    AQList_iterate(
      self->bodies,
      &_SLLeaper_removeParticleIterator,
      self->world
    );
    AQList_iterate(
      self->triggers,
      &_SLLeaper_removeParticleIterator,
      self->world
    );
    AQList_iterate(
      self->sticks,
      &_SLLeaper_removeConstraintIterator,
      self->world
    );
    aqrelease( self->world );
  }

  aqrelease( self->bodies );
  aqrelease( self->triggers );
  aqrelease( self->sticks );

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

void _SLLeaper_addParticleIterator( AQObj *obj, void *_world ) {
  AQWorld_addParticle( (AQWorld *) _world, (AQParticle *) obj );
}

void _SLLeaper_addConstraintIterator( AQObj *obj, void *_world ) {
  AQWorld_addConstraint( (AQWorld *) _world, obj );
}

SLLeaper * SLLeaper_create( aqvec2 position ) {
  SLLeaper *self = aqcreate( &SLLeaperType );

  // self->body->position = self->body->lastPosition = position;
  // self->trigger->position = self->trigger->lastPosition = position;

  _SLLeaper_setPosition( self, position );

  self->world = aqretain( AQLoop_world() );
  AQList_iterate( self->bodies, &_SLLeaper_addParticleIterator, self->world );
  AQList_iterate( self->triggers, &_SLLeaper_addParticleIterator, self->world );
  AQList_iterate( self->sticks, &_SLLeaper_addConstraintIterator, self->world );

  AQLoop_addUpdater( self );

  self->state = FloatingLeaperState;

  return self;
}

AQDOUBLE (*__Angle_absDiff)(double, double) = aqangle_absDiff;
// double __Angle_absDiff( double a, double b ) {
//   double v = fmod( fabs( a - b ), 2 * M_PI );
// 
//   if ( v > M_PI ) {
//     v = 2 * M_PI - v;
//   }
// 
//   return v;
// }

AQDOUBLE (*__Angle_diff)(double, double) = aqangle_diff;
// double __Angle_diff( double a, double b ) {
//   double v;
//   if ( a < M_PI && b < a - M_PI ) {
//     v = a - 2 * M_PI - b;
//   } else {
//     v = a - b;
//   }
// 
//   return v;
// }

double _SLLeaper_globalAngleFromCenter( aqvec2 position, aqvec2 a ) {
  aqvec2 diff = aqvec2_normalized( aqvec2_sub( a, position ));
  double theta = fmod( atan2( diff.y, diff.x ) + 2 * M_PI, 2 * M_PI );
  return theta;
}

// return angle between two positions in comparison to one center position.
// value returned in [ 0 to 2 PI )
double _SLLeaper_angleOutward( aqvec2 position, aqvec2 a, aqvec2 b ) {
  aqvec2 diff;

  diff = aqvec2_normalized( aqvec2_sub( a, position ));
  double thetaA = fmod( atan2( diff.y, diff.x ) + 2 * M_PI, 2 * M_PI );
  diff = aqvec2_normalized( aqvec2_sub( b, position ));
  double thetaB = fmod( atan2( diff.y, diff.x ) + 2 * M_PI, 2 * M_PI );

  if ( thetaB < thetaA ) {
    double tmp = thetaA;
    thetaA = thetaB;
    thetaB = tmp;
  }

  if ( thetaB > M_PI && thetaA < ( thetaB - M_PI )  ) {
    thetaA += 2 * M_PI;
  }

  return fmod(( thetaA + thetaB ) / 2, 2 * M_PI );
}

void _SLLeaper_otherIndices(
  int selectedIndex, int *detachedIndexA, int *detachedIndexB
) {
  if ( selectedIndex == 0 ) {
    *detachedIndexA = 1;
    *detachedIndexB = 2;
  } else if ( selectedIndex == 1 ) {
    *detachedIndexA = 0;
    *detachedIndexB = 2;
  } else if ( selectedIndex == 2 ) {
    *detachedIndexA = 0;
    *detachedIndexB = 1;
  }
}

double _SLLeaper_launchAngle( SLLeaper *self, int indexA, int indexB ) {
  return _SLLeaper_globalAngleFromCenter(
    ((AQParticle *) AQList_at( self->bodies, indexA ))->position,
    ((AQParticle *) AQList_at( self->bodies, indexB ))->position
  );
}

void _SLLeaper_findIndexAndAngle() {
  
}

int _SLLeaper_numberEqualInt( AQObj *obj, void *ctx ) {
  return AQNumber_asInt( obj ) == *((int *) ctx );
}

void SLLeaper_applyDirection( SLLeaper *self, AQDOUBLE radians ) {
  SLLeaperState targetState = self->state;

  if ( self->state == StuckLeaperState ) {
    double downAngle = _SLLeaper_angleOutward(
      self->position,
      ((AQParticle *) AQList_at(
        self->bodies, AQNumber_asInt( AQList_at( self->_attachedIndices, 0 ))
      ))->position,
      ((AQParticle *) AQList_at(
        self->bodies, AQNumber_asInt( AQList_at( self->_attachedIndices, 1 ))
      ))->position
    );

    downAngle = _SLLeaper_globalAngleFromCenter(
      SLLeaper_calcPosition( self ),
      self->lastTouched->position
    );

    // double diffAngle = ( radians - downAngle + 2 * M_PI );
    // if ( diffAngle > M_PI ) {
    //   diffAngle = M_PI - diffAngle;
    // }
    double diffAngle = aqangle_diff( radians, downAngle );

    // printf( "%f %f %f\n", radians, downAngle, diffAngle );

    int detachedAttachedIndex = -1;
    double detachingBodyPower = 1;
    double floatingRotateAngle;
    double floatingBodyPower = 1;

    if ( fabs( diffAngle ) < M_PI / 4 ) {
      // TODO: detach based on prior rotation.
      // For now a pick the first policy is fine for now.

      detachedAttachedIndex = 0;
      floatingRotateAngle = downAngle + M_PI;
      floatingBodyPower = 0;
      detachingBodyPower = FLIGHT_SPEED * FRAME_FRACTION;

      targetState = FloatingLeaperState;
    } else if ( diffAngle > M_PI / 4 && diffAngle < M_PI * 0.75 ) {
      // rotate cw

      // detach the downAngle + positive angle body
      if ( aqangle_diff( _SLLeaper_globalAngleFromCenter(
        self->position,
        ((AQParticle *) AQList_at(
          self->bodies, AQNumber_asInt( AQList_at( self->_attachedIndices, 0 ))
        ))->position
      ), downAngle ) > 0 ) {
        detachedAttachedIndex = 0;
        floatingRotateAngle = downAngle - M_PI / 2;
      } else {
        detachedAttachedIndex = 1;
        floatingRotateAngle = downAngle - M_PI / 2;
      }

      targetState = RotatingLeaperState;
    } else if ( diffAngle < -M_PI / 4 && diffAngle > -M_PI * 0.75 ) {
      // rotate ccw
    
      // detach the downAngle - position angle body
      if ( aqangle_diff( _SLLeaper_globalAngleFromCenter(
        self->position,
        ((AQParticle *) AQList_at(
          self->bodies, AQNumber_asInt( AQList_at( self->_attachedIndices, 0 ))
        ))->position
      ), downAngle ) < 0 ) {
        detachedAttachedIndex = 0;
        floatingRotateAngle = downAngle + M_PI / 2;
      } else {
        detachedAttachedIndex = 1;
        floatingRotateAngle = downAngle + M_PI / 2;
      }
    
      targetState = RotatingLeaperState;
    }

    if ( !!~detachedAttachedIndex ) {
      int floatingBodyIndex = -1;
      for ( int i = 0; i < 3; ++i ) {
        if ( !~AQList_findIndex(
          self->_attachedIndices,
          _SLLeaper_numberEqualInt,
          &i
        )) {
          floatingBodyIndex = i;
          break;
        }
      }

      AQParticle *detachingBody =
        (AQParticle *) AQList_at( self->bodies, AQNumber_asInt(
          AQList_at( self->_attachedIndices, detachedAttachedIndex )
        ));
      AQList_removeAt( self->_attachedIndices, detachedAttachedIndex );

      // push detachingBody in opposite direction of downAngle
      double inc = TURN_SPEED * FRAME_FRACTION;
      detachingBody->position = aqvec2_add(
        detachingBody->position,
        aqvec2_make(
          cos( downAngle + M_PI ) * inc * detachingBodyPower,
          sin( downAngle + M_PI ) * inc * detachingBodyPower
        )
      );

      if ( targetState == FloatingLeaperState ) {
        detachingBody =
          (AQParticle *) AQList_at( self->bodies, AQNumber_asInt(
            AQList_at( self->_attachedIndices, 0 )
          ));
        AQList_removeAt( self->_attachedIndices, 0 );

        detachingBody->position = aqvec2_add(
          detachingBody->position,
          aqvec2_make(
            cos( downAngle + M_PI ) * inc * detachingBodyPower,
            sin( downAngle + M_PI ) * inc * detachingBodyPower
          )
        );
      }

      if ( !!~floatingBodyIndex ) {
        AQParticle *floatingBody =
          (AQParticle *) AQList_at( self->bodies, floatingBodyIndex );

        floatingBody->position = aqvec2_add(
          floatingBody->position,
          aqvec2_make(
            cos( floatingRotateAngle ) * inc * floatingBodyPower,
            sin( floatingRotateAngle ) * inc * floatingBodyPower
          )
        );
      }

      _SLLeaper_gotoState( self, targetState );
    }
  } else if ( self->state == HangingLeaperState ) {
    double downAngle = _SLLeaper_globalAngleFromCenter(
      self->position, self->lastTouched->position
    );

    int detachedIndexA, detachedIndexB;
    _SLLeaper_otherIndices(
      self->rotatingOnIndex, &detachedIndexA, &detachedIndexB
    );

    double upAngle = _SLLeaper_angleOutward(
      self->position,
      ((AQParticle *) AQList_at( self->bodies, detachedIndexA ))->position,
      ((AQParticle *) AQList_at( self->bodies, detachedIndexB ))->position
    );

    // double diffAngle = ( radians - downAngle + 2 * M_PI );
    // if ( diffAngle > M_PI ) {
    //   diffAngle = M_PI - diffAngle;
    // }
    double diffAngle = aqangle_diff( radians, downAngle );

    int boosterBodyIndex = -1;
    double launchAngle = 0;
    double launchVelocity = TURN_SPEED * FRAME_FRACTION;

    if ( fabs( diffAngle ) < M_PI / 4 ) {
      // launch

      boosterBodyIndex = self->rotatingOnIndex;
      launchAngle = upAngle;
      launchVelocity = FLIGHT_SPEED * FRAME_FRACTION;

      targetState = FloatingLeaperState;
    } else if ( diffAngle > M_PI / 4 && diffAngle < M_PI * 0.75 ) {
      // rotate cw

      // find the body in the direction of rotation
      if ( aqangle_diff( _SLLeaper_globalAngleFromCenter(
        self->position,
        ((AQParticle *) AQList_at( self->bodies, detachedIndexA ))->position
      ), upAngle ) > 0 ) {
        boosterBodyIndex = detachedIndexA;
        launchAngle =
          _SLLeaper_launchAngle( self, detachedIndexB, detachedIndexA );
      } else {
        boosterBodyIndex = detachedIndexB;
        launchAngle =
          _SLLeaper_launchAngle( self, detachedIndexA, detachedIndexB );
      }

      targetState = RotatingLeaperState;
    } else if ( diffAngle < -M_PI / 4 && diffAngle > -M_PI * 0.75 ) {
      // rotate ccw

      // find the body in the direction of rotation
      if ( aqangle_diff( _SLLeaper_globalAngleFromCenter(
        self->position,
        ((AQParticle *) AQList_at( self->bodies, detachedIndexA ))->position
      ), upAngle ) < 0 ) {
        boosterBodyIndex = detachedIndexA;
        launchAngle = _SLLeaper_globalAngleFromCenter(
          ((AQParticle *) AQList_at( self->bodies, detachedIndexB ))->position,
          ((AQParticle *) AQList_at( self->bodies, detachedIndexA ))->position
        );
      } else {
        boosterBodyIndex = detachedIndexB;
        launchAngle = _SLLeaper_globalAngleFromCenter(
          ((AQParticle *) AQList_at( self->bodies, detachedIndexA ))->position,
          ((AQParticle *) AQList_at( self->bodies, detachedIndexB ))->position
        );
      }

      targetState = RotatingLeaperState;
    }

    if ( !!~boosterBodyIndex ) {
      AQParticle *body =
        (AQParticle *) AQList_at( self->bodies, boosterBodyIndex );

      double inc = launchVelocity;
      body->position = aqvec2_add(
        body->position,
        aqvec2_make( cos( launchAngle ) * inc, sin( launchAngle ) * inc )
      );

      _SLLeaper_gotoState( self, targetState );
    }
  }

  // if ( self->state == StuckLeaperState ) {
  //   float c = cos( radians );
  //   float s = sin( radians );
  //   float f = 10;
  //   self->body->position =
  //     aqvec2_add( self->body->position, aqvec2_make( c * 0.2, s * 0.2 ));
  //   self->body->lastPosition =
  //     aqvec2_add( self->body->position, aqvec2_make( c * f, s * f ));
  //   _SLLeaper_gotoState( self, FloatingLeaperState );
  // }
}

void _SLLeaper_stickToAsteroid( AQParticle *body, AQParticle *asteroid ) {
  aqvec2 diff = aqvec2_sub(
    body->position, asteroid->position
  );
  if ( fabs( aqvec2_mag( diff ) - asteroid->radius - body->radius ) > AQEPS ) {
    body->position = aqvec2_add(
      aqvec2_scale(
        aqvec2_normalized( diff ),
        asteroid->radius + body->radius
      ),
      asteroid->position
    );
    body->lastPosition = body->position;
  }
}

double SLLeaper_radians( SLLeaper *self ) {
  return fmod( _SLLeaper_globalAngleFromCenter(
    self->position,
    ((AQParticle *) AQList_at(
      self->bodies, 0
    ))->position
  ) + M_PI, 2 * M_PI ) - M_PI;
}

void _SLLeaper_showAsteroid( SLLeaper *self, SLAsteroid *asteroid ) {
  if ( !asteroid->isVisible && !asteroid->isHome ) {
    self->visited++;
    if ( self->onvisit ) {
      self->onvisit( self->visited );
    }

    // Resource asteroid.
    if ( self->visited == 3 || ( self->visited > 3 && rand() < RAND_MAX / 2 ) ) {
      asteroid->resource = rand() % 64 + 64;
      if ( self->visited == 3 ) {
        asteroid->resource = 128;
      }
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
}

void _SLLeaper_drainAsteroid( SLLeaper *self, SLAsteroid *asteroid ) {
  if ( asteroid->resource && self->resource < SLLeaper_maxResource ) {
    int resource = asteroid->resource < 1 ? asteroid->resource : 1;
    asteroid->resource -= resource;
    self->resource += resource;
    self->totalResource += resource;

    if ( self->onresource ) {
      self->onresource( self->totalResource );
    }

    // float resourcePercent = 1.0 -
    //   asteroid->resource / (float) SLLeaper_maxResource;
    float resourcePercent = 1.0 -
      asteroid->resource / (float) 128;
    asteroid->color = SL_lerpColor(
      normalAsteroidColor, resourceAsteroidColor, resourcePercent
    );
  }
}

double _SLLeaper_bodyAngularVelocity( SLLeaper *self, AQParticle *body ) {
  double positionAngle = _SLLeaper_globalAngleFromCenter(
    self->position,
    body->position
  );
  double lastPositionAngle = _SLLeaper_globalAngleFromCenter(
    self->position,
    body->lastPosition
  );

  return aqangle_diff( positionAngle, lastPositionAngle );
  // if ( positionAngle < M_PI && lastPositionAngle < positionAngle - M_PI ) {
  //   return positionAngle - 2 * M_PI - lastPositionAngle;
  // } else {
  //   return positionAngle - lastPositionAngle;
  // }
}

aqvec2 SLLeaper_calcPosition( SLLeaper *self ) {
  aqvec2 position = aqvec2_zero();

  AQParticle *body;

  int i;

  for ( i = 0; i < 3; ++i ) {
    body = (AQParticle *) AQList_at( self->bodies, i );
    position = aqvec2_add( position, body->position );
  }

  return aqvec2_scale( position, 1.0 / 3.0 );
}

void _SLLeaper_update( SLLeaper *self, AQDOUBLE dt ) {
  // _SLLeaper_setPosition( self, self->position );

  // printf( "%d ", self->state );
  // while ( AQList_length( self->_attachedIndices )) {
  //   AQList_pop( self->_attachedIndices );
  // }
  // return;

  aqvec2 position = aqvec2_zero();

  AQParticle *body;
  AQParticle *trigger;

  int i;
  int attachedIndex;

  for ( i = 0; i < 3; ++i ) {
    body = (AQParticle *) AQList_at( self->bodies, i );
    trigger = (AQParticle *) AQList_at( self->triggers, i );

    AQWorld_wakeParticle( self->world, body );
    AQWorld_wakeParticle( self->world, trigger );

    // if ( i == 0 ) {
    //   body->position = aqvec2_add( body->position, aqvec2_make( 0, 0.01 ));
    //   body->lastPosition = aqvec2_add( body->lastPosition, aqvec2_make( 0, 0.01 ));
    // }

    position = aqvec2_add( position, body->position );
    trigger->position = body->position;
    trigger->lastPosition = body->lastPosition;
  }

  self->position = aqvec2_scale( position, 1.0 / 3.0 );
  // _SLLeaper_setPosition( self, aqvec2_scale( position, 1.0 / 3.0 ));

  // // Rotate to have bottom face direction of flight.
  // if ( self->state == FloatingLeaperState ) {
  //   aqvec2 velocity = aqvec2_sub( self->body->lastPosition, self->body->position );
  //   float angle = atan2( velocity.y, velocity.x );
  //   self->radians = ( angle - self->radians ) * 0.2 + self->radians;
  // }

  // if (
  //   self->state != FloatingLeaperState &&
  //     AQList_length( self->_attachedIndices ) == 0
  // ) {
  //   _SLLeaper_gotoState( self, FloatingLeaperState );
  // }

  if (
    // self->state != PreHangingLeaperState &&
    self->state != StuckLeaperState &&
      // self->state != RotatingLeaperState &&
      // self->state != StuckLeaperState &&
      // (
      //   self->state == PreHangingLeaperState ||
      //   self->state == RotatingLeaperState
      // ) &&
      AQList_length( self->_attachedIndices ) == 1
  ) {
    // find closest non-attached body
    int indexA, indexB;
    _SLLeaper_otherIndices(
      AQNumber_asInt( AQList_at( self->_attachedIndices, 0 )),
      &indexA,
      &indexB
    );
    int nearbyIndex = -1;
    if (
      aqvec2_mag( aqvec2_sub(
        self->lastTouched->position,
        ((AQParticle *) AQList_at( self->bodies, indexA ))->position
      )) < aqvec2_mag( aqvec2_sub(
        self->lastTouched->position,
        ((AQParticle *) AQList_at( self->bodies, indexB ))->position
      ))
    ) {
      nearbyIndex = indexA;
    } else {
      nearbyIndex = indexB;
    }

    AQParticle *nearbyBody =
      (AQParticle *) AQList_at( self->bodies, nearbyIndex );

    // determine rotation direction for body
    double angularVelocity = _SLLeaper_bodyAngularVelocity( self, nearbyBody );
    // printf( "%f ", angularVelocity );

    // accelerate to desired speed
    double angularSpeed = fabs( angularVelocity );
    double speedDiff;
    // if ( self->state == PreHangingLeaperState ) {
    //   speedDiff = STUCK_TO_HANGING_POWER * FRAME_FRACTION - angularSpeed;
    // } else {
    speedDiff = TURN_SPEED * FRAME_FRACTION * CORRECTION_FRACTION - angularSpeed;
    // }
    int angularVelocitySign = angularVelocity < 0 ? -1 : 1;

    if ( self->state == FloatingLeaperState ) {
      speedDiff = TURN_SPEED * FRAME_FRACTION;
      angularVelocitySign = 1;
    }

    double angle =
      _SLLeaper_globalAngleFromCenter( self->position, nearbyBody->position );
    // angle += M_PI / 2;
    // if ( speedDiff > 0 ) {
      nearbyBody->position = aqvec2_add(
        nearbyBody->position,
        aqvec2_make(
          cos( angle ) * speedDiff * angularVelocitySign,
          sin( angle ) * speedDiff * angularVelocitySign
        )
      );
    // }

    if (
      self->state != PreHangingLeaperState &&
        self->state != HangingLeaperState &&
        self->state != RotatingLeaperState &&
        AQList_length( self->_attachedIndices ) == 1
    ) {
      // if rotating towards attached body, set state to rotating,
      // prehaning otherwise
      double downAngle = _SLLeaper_globalAngleFromCenter( self->position, self->lastTouched->position );
      double diffAngleDownAngle = aqangle_diff( downAngle, angle );
      int diffAngleDownAngleSign = diffAngleDownAngle < 0 ? -1 : 1;
      _SLLeaper_gotoState(
        self,
        RotatingLeaperState
        // angularVelocitySign == diffAngleDownAngleSign ?
        //   RotatingLeaperState :
        //   PreHangingLeaperState
      );
    }
  }

  if ( AQList_length( self->_attachedIndices ) >= 2 ) {
    // remove any feet farther than two.
    double distance[] = { INFINITY, INFINITY };
    for ( i = 0; i < AQList_length( self->_attachedIndices ); ++i ) {
      double _distance = aqvec2_mag( aqvec2_sub(
        ((AQParticle *) AQList_at( self->bodies, AQNumber_asInt(
          AQList_at( self->_attachedIndices, i )
        )))->position,
        self->lastTouched->position
      ));
      if ( _distance < distance[0] ) {
        distance[1] = distance[0];
        distance[0] = _distance;
      } else if ( _distance < distance[1] ) {
        distance[1] = _distance;
      }
    }

    for ( i = 0; i < AQList_length( self->_attachedIndices ); ++i ) {
      double _distance = aqvec2_mag( aqvec2_sub(
        ((AQParticle *) AQList_at( self->bodies, AQNumber_asInt(
          AQList_at( self->_attachedIndices, i )
        )))->position,
        self->lastTouched->position
      ));

      if ( _distance > distance[1] ) {
        AQList_removeAt( self->_attachedIndices, i );
        --i;
      }
    }

    if ( self->state != StuckLeaperState ) {
      // printf( "feet %f %f %d ", distance[0], distance[1], AQList_length( self->_attachedIndices ));

      _SLLeaper_gotoState( self, StuckLeaperState );
    }
  }

  if ( self->state == StuckLeaperState ) {
    // Maintain distance to last hit particle.
    for ( i = 0; i < 2; ++i ) {
      attachedIndex = AQNumber_asInt( AQList_at( self->_attachedIndices, i ));

      body = (AQParticle *) AQList_at( self->bodies, attachedIndex );
      _SLLeaper_stickToAsteroid( body, self->lastTouched );
    }

    // Don't move due to velocity when stuck. Other particles can move us.
    for ( i = 0; i < 3; ++i ) {
      body = (AQParticle *) AQList_at( self->bodies, i );
      body->lastPosition = body->position;
    }

    // Update asteroid.
    void *maybeAsteroid = self->lastTouched->userdata;
    if ( maybeAsteroid && aqistype( maybeAsteroid, &SLAsteroidType )) {
      SLAsteroid *asteroid = maybeAsteroid;

      _SLLeaper_showAsteroid( self, asteroid );
      _SLLeaper_drainAsteroid( self, asteroid );
    }
  }

  if (
    self->state == StuckLeaperState ||
      self->state == RotatingLeaperState ||
      self->state == PreHangingLeaperState ||
      self->state == HangingLeaperState
  ) {
    void *maybeAsteroid = self->lastTouched->userdata;
    if ( maybeAsteroid && aqistype( maybeAsteroid, &SLAsteroidType )) {
      SLAsteroid *asteroid = maybeAsteroid;

      _SLLeaper_showAsteroid( self, asteroid );
      _SLLeaper_drainAsteroid( self, asteroid );
    }
  }

  if (
    self->state == RotatingLeaperState ||
      self->state == PreHangingLeaperState ||
      self->state == HangingLeaperState
  ) {
    attachedIndex = self->rotatingOnIndex;
    body = (AQParticle *) AQList_at( self->bodies, attachedIndex );
    _SLLeaper_stickToAsteroid( body, self->lastTouched );

    if ( AQList_length( self->_attachedIndices ) == 2 ) {
      _SLLeaper_gotoState( self, StuckLeaperState );
    }
  }

  if ( self->state == PreHangingLeaperState ) {
    double angularVelocity;

    int detachedIndexA, detachedIndexB;
    _SLLeaper_otherIndices(
      self->rotatingOnIndex, &detachedIndexA, &detachedIndexB
    );

    AQParticle *body = (AQParticle *) AQList_at( self->bodies, detachedIndexA );

    double positionAngle = _SLLeaper_globalAngleFromCenter(
      self->position,
      body->position
    );
    double lastPositionAngle = _SLLeaper_globalAngleFromCenter(
      self->position,
      body->lastPosition
    );

    // if ( positionAngle < M_PI && lastPositionAngle < positionAngle - M_PI ) {
    //   angularVelocity = positionAngle - 2 * M_PI - lastPositionAngle;
    // } else {
    //   angularVelocity = positionAngle - lastPositionAngle;
    // }
    angularVelocity = aqangle_diff( positionAngle, lastPositionAngle );

    AQParticle *bodyB = (AQParticle *) AQList_at( self->bodies, detachedIndexB );

    double upAngle = _SLLeaper_angleOutward(
      self->position,
      body->position,
      bodyB->position
    );

    double downAngle = _SLLeaper_globalAngleFromCenter(
      self->lastTouched->position,
      self->position
    );

    // Used to see when the upAngle of the outward feet are past
    // oppositeDownAngle in the opposite angular direction of the current
    // angular velocity.
    double zenithAngle = fmod( downAngle + 2 * M_PI, 2 * M_PI );

    double zenithAngleDiff = aqangle_diff( zenithAngle, upAngle );
    int angularVelocitySign = angularVelocity >= 0 ? 1 : -1;
    int zenithAngleDiffSign = zenithAngleDiff >= 0 ? 1 : -1;

    if ( zenithAngleDiffSign != angularVelocitySign ) {
      printf( "[[%f %f %f %d %d]]", zenithAngle, upAngle, zenithAngleDiff, angularVelocitySign, zenithAngleDiffSign );
      _SLLeaper_gotoState( self, HangingLeaperState );
    }
  }

  if ( self->state == HangingLeaperState ) {
    // Snap outward feet into place
    int detachedIndexA, detachedIndexB;
    _SLLeaper_otherIndices(
      self->rotatingOnIndex, &detachedIndexA, &detachedIndexB
    );

    double downAngle = _SLLeaper_globalAngleFromCenter(
      self->lastTouched->position,
      self->position
    );
    double zenithAngle = fmod( downAngle + 2 * M_PI, 2 * M_PI );

    AQParticle *attachedBody =
      (AQParticle *) AQList_at( self->bodies, self->rotatingOnIndex );
    AQParticle *bodyA =
      (AQParticle *) AQList_at( self->bodies, detachedIndexA );
    AQParticle *bodyB =
      (AQParticle *) AQList_at( self->bodies, detachedIndexB );

    double upAngle = _SLLeaper_angleOutward(
      self->position,
      bodyA->position,
      bodyB->position
    );

    double bodyAOutAngle = _SLLeaper_globalAngleFromCenter(
      self->position,
      bodyA->position
    );

    double bodyAAngle;
    double bodyBAngle;
    if ( __Angle_diff( bodyAOutAngle, upAngle ) > 0 ) {
      bodyAAngle = zenithAngle + M_PI / 6;
      bodyBAngle = zenithAngle - M_PI / 6;
    } else {
      bodyAAngle = zenithAngle - M_PI / 6;
      bodyBAngle = zenithAngle + M_PI / 6;
    }

    double shipHeight = ( self->radius + self->radius * cos( M_PI / 3 ));
    double shipHypot = shipHeight / cos( M_PI / 6 );
    bodyA->position = bodyA->lastPosition = aqvec2_add(
      attachedBody->position,
      aqvec2_make(
        cos( bodyAAngle ) * shipHypot,
        sin( bodyAAngle ) * shipHypot
      )
    );
    bodyB->position = bodyB->lastPosition = aqvec2_add(
      attachedBody->position,
      aqvec2_make(
        cos( bodyBAngle ) * shipHypot,
        sin( bodyBAngle ) * shipHypot
      )
    );
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

  if ( self->state != FloatingLeaperState ) {
    if ( self->oxygen > 0 ) {
      self->oxygen -= 1;
    } else if ( self->resource > 0 ) {
      self->resource -= 1;
    }
  }
  if ( self->oxygen <= 0 && self->resource <= 0 ) {
    _SLLeaper_gotoState( self, LostLeaperState );
  }

  // Updated during every physics step.
  aqrelease( self->_attachedIndices );
  self->_attachedIndices = aqinit( aqalloc( &AQListType ));
  // while ( AQList_length( self->_attachedIndices )) {
  //   AQList_pop( self->_attachedIndices );
  // }
}

void * _SLLeaper_view( SLLeaper *self ) {
  if ( !self->view ) {
    // Do not retain view to avoid a circular reference. LeaperView will hold a
    // reference to Leaper, and so Leaper can clean up once LeaperView does.
    self->view = SLLeaperView_create( self );
  }
  return self->view;
}

int _SLLeaper_sameParticleFindIterator( AQObj *obj, void *_particle ) {
  return obj == _particle;
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

  if (
    ( b->userdata == NULL || aqistype( b->userdata, &SLAmbientParticleType )) &&
      ( self->state != LostLeaperState && self->state != WonLeaperState )
  ) {
    SLAmbientParticle_startPulse( b->userdata );
    SLParticleView_addAmbientParticle( b );
    b->lastPosition = b->position;
    return;
  }

  int index = AQList_findIndex(
    self->triggers, &_SLLeaper_sameParticleFindIterator, a
  );

  AQList_push( self->_attachedIndices, aqint( index ));

  assert( self );
  assert( a->userdata != b->userdata );

  aqrelease( self->lastTouched );
  self->lastTouched = aqretain( b );

  // _SLLeaper_gotoState( self, StuckLeaperState );
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

  if ( newState == RotatingLeaperState || newState == PreHangingLeaperState ) {
    self->rotatingOnIndex =
      AQNumber_asInt( AQList_at( self->_attachedIndices, 0 ));
  }

  if ( newState == FloatingLeaperState ) {
    AQList_removeAt( self->_attachedIndices, 0 );
  }

  self->state = newState;
}

AQTYPE_INIT_DONE_GETINTERFACE( SLLeaper );
