#include <math.h>

#include "src/game/cameracontroller.h"
#include "src/game/renderer.h"
#include "src/game/updater.h"
#include "src/input/index.h"

void _SLCameraController_update( SLCameraController *, AQDOUBLE );

SLUpdaterInterface _SLCameraControllerUpdater = {
  (const char *) &SLUpdaterId,
  (void (*)(void*, AQDOUBLE)) &_SLCameraController_update
};

SLCameraController * SLCameraController_init( SLCameraController *self ) {
  memset( &self->state, 0, sizeof(SLCameraController) - sizeof(AQObj) );
  self->minScale = 1;
  self->maxScale = 10;
  self->currentScale = 1;
  self->scaleValue = 80;
  return self;
}

SLCameraController * SLCameraController_done( SLCameraController *self ) {
  aqrelease( self->leaper );
  return self;
}

void * SLCameraController_getInterface(
  SLCameraController *self, char *interfaceName
) {
  if ( interfaceName == SLUpdaterId ) {
    return &_SLCameraControllerUpdater;
  }
  return NULL;
}

SLCameraController * SLCameraController_create() {
  return aqcreate( &SLCameraControllerType );
}

SLCameraController * SLCameraController_setLeaper(
  SLCameraController *self, SLLeaper *target
) {
  aqrelease( self->leaper );
  self->leaper = aqretain( target );
  return self;
}

void SLCameraController_inputPress( SLCameraController *self ) {
  self->inputPressed = 1;
}

void _SLCameraController_update( SLCameraController *self, AQDOUBLE dt ) {
  float screenWidth, screenHeight;
  AQInput_getScreenSize( &screenWidth, &screenHeight );
  float widthHeightMax = fmax( screenWidth, screenHeight );
  AQCamera *camera = AQRenderer_camera();
  camera->screen = aqaabb_make( screenHeight, screenWidth, 0, 0 );

  static int once = 1;
  if ( once ) {
    // camera->viewport = aqaabb_make( 6400, 5600, 0, 800 );
    camera->viewport = aqaabb_make( 640, 640, 0, 0 );
    once = 0;
  }

  if ( self->inputPressed ) {
    self->currentScale += 0.1;
  } else {
    self->currentScale -= 0.05;
  }

  // Clamp currentScale.
  self->currentScale =
    fmax( self->minScale, fmin( self->maxScale, self->currentScale ));

  SLLeaper *leaper = self->leaper;

  if ( leaper ) {
    float scale = self->currentScale * self->scaleValue;
    camera->viewport = aqaabb_make(
      leaper->position.y + scale, leaper->position.x + scale,
      leaper->position.y - scale, leaper->position.x - scale
    );

    if ( leaper->state == StuckLeaperState ) {
      aqvec2 dir = aqvec2_normalized( aqvec2_sub(
        leaper->body->position,
        self->leaper->lastTouched->position
      ));

      // Lerp to new angle.
      camera->radians = camera->radians +
        ( atan2( dir.y, dir.x ) - M_PI / 2 - camera->radians ) * 0.1;
    }
  }

  self->inputPressed = 0;
}

AQTYPE_INIT_DONE_GETINTERFACE( SLCameraController );
