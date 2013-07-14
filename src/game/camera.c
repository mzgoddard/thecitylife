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

  // [  c,  s, 0, 0
  //   -s,  c, 0, 0
  //    0,  0, 1, 0
  //    0,  0, 0, 1 ]
  //
  // [ w, 0, 0, x,
  //   0, h, 0, y,
  //   0, 0, f, z,
  //   0, 0, 0, 1 ]
  //
  // [ w*c, w*-s, 0, x,
  //   h*s,  h*c, 0, y,
  //     0,    0, 1, z,
  //     0,    0, 0, 1 ]

  // [ c*w, h*-s, 0, x*c+y*s
  //   

  // [ 0 4  8 12
  //   1 5  9 13
  //   2 6 10 14
  //   3 7 11 15 ]

  // [ c*w, h*-s, 0, x*c+y*-s
  //   s*w,  c*h, 0, s*x+c*y

  matrix[0]=2/(right-left)*c;
  matrix[4]=2/(top-bottom)*s;
  matrix[1]=2/(right-left)*-s;
  matrix[5]=2/(top-bottom)*c;
  matrix[10]=-2/(zFar-zNear);

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
