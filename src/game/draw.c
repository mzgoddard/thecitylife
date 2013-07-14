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
  ((GLfloat*)vertices)[0] = rect.left;
  ((GLfloat*)vertices)[1] = rect.top;
  vertices = itr( vertices );

  ((GLfloat*)vertices)[0] = rect.right;
  ((GLfloat*)vertices)[1] = rect.top;
  vertices = itr( vertices );

  ((GLfloat*)vertices)[0] = rect.right;
  ((GLfloat*)vertices)[1] = rect.bottom;
  vertices = itr( vertices );
  
  ((GLfloat*)vertices)[0] = rect.left;
  ((GLfloat*)vertices)[1] = rect.top;
  vertices = itr( vertices );
  
  ((GLfloat*)vertices)[0] = rect.left;
  ((GLfloat*)vertices)[1] = rect.bottom;
  vertices = itr( vertices );
  
  ((GLfloat*)vertices)[0] = rect.right;
  ((GLfloat*)vertices)[1] = rect.bottom;
  return itr( vertices );
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

// void * AQDraw_trig( void *vertices, vertexitr, aqvec2, aqvec2, aqvec2 );

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
