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
void * AQDraw_color(
  void *start, void *end, vertexitr, coloritr, struct glcolor
);

#endif /* end of include guard: DRAW_H_41G099Q1 */
