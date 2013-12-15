#include "src/game/updater.h"
#include "src/game/actor.h"
#include "src/game/actorview.h"
#include "src/game/view.h"

void * _AQActor_view( void * );

AQViewableInterface _AQActor_viewableInterface = {
  AQViewableId,
  _AQActor_view
};

void _AQActor_update( void *, AQDOUBLE );

SLUpdaterInterface _AQActor_updaterInterface = {
  SLUpdaterId,
  _AQActor_update
};

void _AQActor_setCurrentSpeed( AQActor *self );
void _AQActor_setBodyValues( AQActor *self );
void _AQActor_buildPath( AQActor *self, aqvec2 pt );
void _AQActor_move(
  AQActor *self, AQDOUBLE dt, AQDOUBLE direction, AQDOUBLE power
);

AQActor * AQActor_init( AQActor *self ) {
  aqzero( self );
  self->baseSpeed = 40;
  self->size = 8;
  _AQActor_setCurrentSpeed( self );

  self->money = 0;

  self->angle = 0;

  self->body = aqinit( aqalloc( &AQParticleType ));
  self->trigger = aqinit( aqalloc( &AQParticleType ));
  self->trigger->isTrigger = 1;
  _AQActor_setBodyValues( self );

  self->path = aqinit( aqalloc( &AQListType ));
  self->inventorySlot = NULL;

  return self;
}

AQActor * AQActor_done( AQActor *self ) {
  aqrelease( self->body );
  aqrelease( self->path );
  aqrelease( self->_view );
  return self;
}

void * AQActor_getInterface( AQActor *self, AQInterfaceId id ) {
  if ( id == SLUpdaterId ) {
    return &_AQActor_updaterInterface;
  } else if ( id == AQViewableId ) {
    return &_AQActor_viewableInterface;
  }
  return NULL;
}

void * _AQActor_view( void *_self ) {
  AQActor *self = _self;
  if ( !self->_view ) {
    self->_view = AQActorView_create( self );
  }
  return self->_view;
}

void _AQActor_update( void *_self, AQDOUBLE dt ) {
  AQActor *self = _self;

  //
  if ( self->action == AQPlayerAction ) {
    AQWorld_wakeParticle( self->world, self->body );
    _AQActor_move(
      self, dt,
      self->actionData.playerData.movementAngle,
      self->actionData.playerData.movementPower
    );
  }
}

void _AQActor_setCurrentSpeed( AQActor *self ) {
  self->currentSpeed = self->baseSpeed;
}

void _AQActor_setBodyValues( AQActor *self ) {
  self->body->radius = self->trigger->radius =
    self->size / 2;
  self->body->mass = M_PI * self->size * self->size / 2 / 2;
}

void _AQActor_move(
  AQActor *self, AQDOUBLE dt, AQDOUBLE direction, AQDOUBLE power
) {
  aqvec2 diff = aqvec2_scale(
    aqvec2_makeAngle( direction ),
    power * self->currentSpeed * dt
  );

  self->body->position =
    self->body->lastPosition =
    self->trigger->position =
    self->trigger->lastPosition = aqvec2_add( self->body->position, diff );
}

void AQActor_updateData( AQActor *self ) {
  _AQActor_setCurrentSpeed( self );
  _AQActor_setBodyValues( self );
}

void AQActor_setWorld( AQActor *self, AQWorld *world ) {
  aqrelease( self->world );
  self->world = aqretain( world );
  AQWorld_addParticle( self->world, self->body );
}

AQTYPE( AQActor );
