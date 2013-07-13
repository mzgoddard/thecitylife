#include <stdlib.h>

#include "src/game/camera.h"

AQCamera * AQCamera_init( AQCamera *self ) {
  self->viewport = aqaabb_make( 1, 1, 0, 0 );
  self->screen = self->viewport;
  self->radians = 0;

  return self;
}

AQCamera * AQCamera_create() {
  return aqcreate( &AQCameraType );
}

AQCamera * AQCamera_setGlMatrix( AQCamera *self, GLfloat *matrix ) {
  float right = self->viewport.right;
  float left = self->viewport.left;
  float top = self->viewport.top;
  float bottom = self->viewport.bottom;
  float zFar = 1000;
  float zNear = 0;

  float tx=-(right+left)/(right-left);
  float ty=-(top+bottom)/(top-bottom);
  float tz=-(zFar+zNear)/(zFar-zNear);

  float c = cos( self->radians );
  float s = sin( self->radians );

  *matrix = *(GLfloat[]) {
    1, 0, 0, 0,
    0, 1, 0, 0,
    0, 0, 1, 0,
    0, 0, 0, 1
  };

  matrix[0]=2/(right-left)*c;
  matrix[1]=2/(right-left)*-s;
  // matrix[3]=-tx;
  matrix[4]=2/(top-bottom)*s;
  matrix[5]=2/(top-bottom)*c;
  // matrix[7]=-ty;
  matrix[10]=-2/(zFar-zNear);  
  // matrix[11]=-tz;
  matrix[12]=tx*c+ty*s;
  matrix[13]=tx*-s+ty*c;
  matrix[14]=tz;

  return self;
}

AQTYPE_ALL(
  AQCamera,
  sizeof( AQCamera ),
  NULL,
  AQCamera_init,
  AQObj_done,
  AQObj_getInterface
);
