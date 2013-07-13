#include <string.h>

#include "./input.h"

struct {
  float width;
  float height;
} _screenSize;

struct {
  float top;
  float right;
  float bottom;
  float left;
} _worldFrame;

AQArray *_touches = NULL;

AQTouch * AQTouch_init( AQTouch *self ) {
  memset( &self->state, 0, sizeof( AQTouch ) - sizeof( AQObj ));
  return self;
}

void AQInput_setScreenSize( float width, float height ) {
  _screenSize.width = width;
  _screenSize.height = height;
}

void AQInput_getScreenSize( float *width, float *height ) {
  *width = _screenSize.width;
  *height = _screenSize.height;
}

void AQInput_setWorldFrame( float top, float right, float bottom, float left ) {
  _worldFrame.top = top;
  _worldFrame.right = right;
  _worldFrame.bottom = bottom;
  _worldFrame.left = left;
}

void AQInput_screenToWorld( float x, float y, float *wx, float *wy ) {
  *wx = x / _screenSize.width * ( _worldFrame.right - _worldFrame.left ) +
    _worldFrame.left;
  *wy = y / _screenSize.height * ( _worldFrame.top - _worldFrame.bottom ) +
    _worldFrame.bottom;
}

AQArray * AQInput_getTouches() {
  if ( !_touches ) {
    _touches = aqinit( aqalloc( &AQArrayType ));
  }
  return _touches;
}

AQTYPE_ALL(
  AQTouch, sizeof(AQTouch), NULL,
  AQTouch_init, AQObj_done, AQObj_getInterface
);
