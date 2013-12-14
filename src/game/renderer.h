#ifndef RENDERER_H_7LOXJDF4
#define RENDERER_H_7LOXJDF4

#include "src/obj/index.h"
#include "src/game/camera.h"

void AQRenderer_boot();

AQCamera * AQRenderer_camera();

void AQRenderer_setClearColor( int, int, int );
void AQRenderer_addView( void * );
void AQRenderer_removeView( void * );

void AQRenderer_draw();

#endif /* end of include guard: RENDERER_H_7LOXJDF4 */
