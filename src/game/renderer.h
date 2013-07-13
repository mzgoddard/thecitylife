#ifndef RENDERER_H_7LOXJDF4
#define RENDERER_H_7LOXJDF4

#include "src/obj/index.h"

void AQRenderer_boot();

AQCamera * AQRenderer_camera();

void AQRenderer_addView( AQObj * );
void AQRenderer_removeView( AQObj * );

void AQRenderer_draw();

#endif /* end of include guard: RENDERER_H_7LOXJDF4 */
