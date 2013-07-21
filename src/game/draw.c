#include <string.h>

#include "src/game/draw.h"

GLfloat * colorvertex_next( void *vertices ) {
  return vertices + sizeof(struct colorvertex);
}

struct glcolor * colorvertex_getcolor( void *vertex ) {
  return vertex + sizeof(GLfloat[2]);
}

void * AQDraw_rect( void *vertices, vertexitr itr, aqaabb rect
) {
  vertices = AQDraw_trig( vertices, itr,
    (aqvec2){rect.left,rect.top},
    (aqvec2){rect.right,rect.top},
    (aqvec2){rect.right,rect.bottom}
  );

  return AQDraw_trig( vertices, itr,
    (aqvec2){rect.left,rect.top},
    (aqvec2){rect.left,rect.bottom},
    (aqvec2){rect.right,rect.bottom}
  );
}

void * AQDraw_rotatedRect(
  void *vertices, vertexitr itr, aqaabb rect, AQDOUBLE radians
) {
  float c = cos( radians );
  float s = sin( radians );

  aqvec2 center = aqaabb_center( rect );
  aqvec2 extents = aqaabb_extents( rect );
  // float mag = aqvec2_mag( extents );
  // float tmp = extents.x;
  // extents.x = extents.x * c + extents.y * s;
  // extents.y = extents.y * c + tmp * s;

  // tl
  ((GLfloat*)vertices)[0] = center.x + extents.x * c - extents.y * s;
  ((GLfloat*)vertices)[1] = center.y + extents.y * c + extents.x * s;
  vertices = itr( vertices );

  // tr
  ((GLfloat*)vertices)[0] = center.x - extents.x * c - extents.y * s;
  ((GLfloat*)vertices)[1] = center.y + extents.y * c - extents.x * s;
  vertices = itr( vertices );

  // br
  ((GLfloat*)vertices)[0] = center.x - extents.x * c + extents.y * s;
  ((GLfloat*)vertices)[1] = center.y - extents.y * c - extents.x * s;
  vertices = itr( vertices );

  // tl
  ((GLfloat*)vertices)[0] = center.x + extents.x * c - extents.y * s;
  ((GLfloat*)vertices)[1] = center.y + extents.y * c + extents.x * s;
  vertices = itr( vertices );

  // bl
  ((GLfloat*)vertices)[0] = center.x + extents.x * c + extents.y * s;
  ((GLfloat*)vertices)[1] = center.y - extents.y * c + extents.x * s;
  vertices = itr( vertices );

  // br
  ((GLfloat*)vertices)[0] = center.x - extents.x * c + extents.y * s;
  ((GLfloat*)vertices)[1] = center.y - extents.y * c - extents.x * s;
  return itr( vertices );
}

void * AQDraw_trig(
  void *vertices, vertexitr next, aqvec2 a, aqvec2 b, aqvec2 c
) {
  ((GLfloat*)vertices)[0] = a.x;
  ((GLfloat*)vertices)[1] = a.y;
  vertices = next( vertices );

  ((GLfloat*)vertices)[0] = b.x;
  ((GLfloat*)vertices)[1] = b.y;
  vertices = next( vertices );

  ((GLfloat*)vertices)[0] = c.x;
  ((GLfloat*)vertices)[1] = c.y;
  return next( vertices );
}

void * AQDraw_polygon(
  void *vertices, vertexitr next,
  int sides, aqvec2 center, float radius, float angle
) {
  aqmat22 rotation = aqmat22_makeRotation( 2 * M_PI / sides );
  aqvec2 v = aqvec2_rotate( (aqvec2) { 0, radius }, angle );
  aqvec2 v2 = aqmat22_transform( rotation, v );
  v = aqvec2_add( center, v );

  for ( int i = 0; i < sides; ++i ) {
    aqvec2 tmp = aqvec2_add( center, v2 );
    vertices = AQDraw_trig(
      vertices, next,
      v,
      tmp,
      center
    );
    v = tmp;
    v2 = aqmat22_transform( rotation, v2 );
  }

  return vertices;
}

void * AQDraw_color(
  void *start, void *end,
  vertexitr next, coloritr getcolor,
  struct glcolor color
) {
  void *ptr = start;
  void *colorptr;
  for ( ; ptr < end; ptr = next( ptr ) ) {
    colorptr = getcolor( ptr );
    memcpy( colorptr, &color, sizeof(struct glcolor) );
  }
  return end;
}
