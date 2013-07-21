#ifndef DRAW_H_41G099Q1
#define DRAW_H_41G099Q1

#include "src/obj/index.h"
#include "src/pphys/index.h"
#include "src/game/shaders.h"

typedef GLfloat * (*vertexitr)( void * );
typedef struct glcolor * (*coloritr)( void * );

GLfloat * colorvertex_next( void * );
struct glcolor * colorvertex_getcolor( void * );

void * AQDraw_rect( void *vertices, vertexitr, aqaabb );
void * AQDraw_rotatedRect( void *vertices, vertexitr, aqaabb, AQDOUBLE );
void * AQDraw_trig( void *vertices, vertexitr, aqvec2, aqvec2, aqvec2 );
void * AQDraw_polygon(
  void *vertices, vertexitr next,
  int sides, aqvec2 center, float radius, float angle
);
void * AQDraw_color(
  void *start, void *end, vertexitr, coloritr, struct glcolor
);

#endif /* end of include guard: DRAW_H_41G099Q1 */
