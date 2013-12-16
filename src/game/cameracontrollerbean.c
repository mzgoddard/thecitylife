 #include <math.h>

#include "src/game/cameracontrollerbean.h"
#include "src/game/renderer.h"
#include "src/game/updater.h"
#include "src/input/index.h"

void _BBCameraController_update( BBCameraController *, AQDOUBLE );

SLUpdaterInterface _BBCameraControllerUpdater = {
  (const char *) &SLUpdaterId,
  (void (*)(void*, AQDOUBLE)) &_BBCameraController_update
};

BBCameraController * BBCameraController_init( BBCameraController *self ) {
  aqzero( self );

  self->minScale = 1;
  self->maxScale = 100;
  self->currentScale = 1;
  self->scaleValue = 80;

  return self;
}

BBCameraController * BBCameraController_done( BBCameraController *self ) {
  aqrelease( self->actor );
  return self;
}

void * BBCameraController_getInterface(
  BBCameraController *self, char *interfaceName
) {
  if ( interfaceName == SLUpdaterId ) {
    return &_BBCameraControllerUpdater;
  }
  return NULL;
}

BBCameraController * BBCameraController_create() {
  return aqcreate( &BBCameraControllerType );
}

BBCameraController * BBCameraController_setPlayer(
  BBCameraController *self, AQActor *actor
) {
  aqrelease( self->actor );
  self->actor = aqretain( actor );
  return self;
}

BBCameraController * BBCameraController_inputPress( BBCameraController *self ) {
  self->inputPressed = 1;
  return self;
}

void _BBCameraController_update( BBCameraController *self, AQDOUBLE dt ) {
  float screenWidth, screenHeight;
  AQInput_getScreenSize( &screenWidth, &screenHeight );
  // float widthHeightMax = fmax( screenWidth, screenHeight );
  AQCamera *camera = AQRenderer_camera();
  camera->screen = aqaabb_make( screenHeight, screenWidth, 0, 0 );

  static int once = 1;
  if ( once ) {
    // camera->viewport = aqaabb_make( 6400, 5600, 0, 800 );
    camera->viewport = aqaabb_make( 640, 640, 0, 0 );
    once = 0;
  }

  if ( self->actor ) {
    AQActor *actor = self->actor;
    self->center = aqvec2_lerp(
      self->actor->body->position, self->center, 0.5
    );

    if ( actor->discipline == AQPlayerDiscipline ) {
      AQDOUBLE movementPower = actor->actionData.playerData.movementPower;
      AQDOUBLE movementAngle = actor->actionData.playerData.movementAngle;
      aqvec2 movingToward = aqvec2_add( aqvec2_scale(
        aqvec2_makeAngle( movementAngle ), movementPower * actor->currentSpeed * 0.5
      ), self->center );
      self->center = aqvec2_lerp( self->center, movingToward, 0.1 );
    }
  }

  if ( self->inputPressed ) {
    self->currentScale = 8;
  } else {
    self->currentScale = self->minScale;
  }

  float scale = self->currentScale * self->scaleValue;
  camera->viewport = aqaabb_make(
    self->center.y + scale, self->center.x + scale,
    self->center.y - scale, self->center.x - scale
  );

  self->inputPressed = 0;
}

AQTYPE_INIT_DONE_GETINTERFACE( BBCameraController );
