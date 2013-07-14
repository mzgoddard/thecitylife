#include <stdlib.h>

#include "src/game/camera.h"
#include "src/game/renderer.h"
#include "src/game/shaders.h"
#include "src/game/view.h"

typedef struct AQRenderer {
  AQObj object;

  AQCamera *camera;
  AQList *views;
} AQRenderer;

AQRenderer *_renderer;

AQRenderer * AQRenderer_init( AQRenderer *self ) {
  self->camera = aqinit( aqalloc( &AQCameraType ));
  self->views = aqinit( aqalloc( &AQListType ));
  return self;
}

AQRenderer * AQRenderer_done( AQRenderer *self ) {
  aqrelease( self->camera );
  aqrelease( self->views );
  return self;
}

AQTYPE_INIT_DONE( AQRenderer );

void AQRenderer_boot() {
  _renderer = aqinit( aqalloc( &AQRendererType ));

  glClearColor(0, 0, 0, 0);
  glEnable(GL_BLEND);
  glBlendFunc(GL_SRC_ALPHA, GL_ONE_MINUS_SRC_ALPHA);

  AQShaders_boot();
}

AQCamera * AQRenderer_camera() {
  return _renderer->camera;
}

void AQRenderer_addView( void *object ) {
  AQView_addToList( _renderer->views, object );
}

void AQRenderer_removeView( void *object ) {
  AQView_removeFromList( _renderer->views, object );
}

void AQRenderer_draw() {
  glClearColor( 10 / 255.0, 22 / 255.0, 31 / 255.0, 1 );
  glClear(GL_COLOR_BUFFER_BIT);

  static GLfloat matrix[16] = {
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  };
  AQCamera_setGlMatrix( _renderer->camera, matrix );
  AQShaders_setMatrix( matrix );

  AQView_iterateList( _renderer->views );
}
