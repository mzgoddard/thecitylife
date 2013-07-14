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
