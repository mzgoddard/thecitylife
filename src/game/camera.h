#ifndef CAMERA_H_XS64TWRD
#define CAMERA_H_XS64TWRD

#include "src/obj/obj.h"
#include "src/pphys/math.h"
#include "src/game/opengl.h"

extern AQType AQCameraType;

typedef struct AQCamera {
  AQObj *object;

  aqaabb viewport;
  aqaabb screen;
  AQDOUBLE radians;
} AQCamera;

AQCamera * AQCamera_create();
AQCamera * AQCamera_setGlMatrix( AQCamera *, GLfloat * );

#endif /* end of include guard: CAMERA_H_XS64TWRD */
