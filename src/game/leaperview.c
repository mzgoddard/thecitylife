#include "src/game/leaperview.h"
#include "src/game/view.h"
#include "src/game/loop.h"
#include "src/game/draw.h"

void _SLLeaperView_draw( SLLeaperView * );

AQViewInterface _SLLeaperView = (AQViewInterface) {
  AQViewId,
  (void (*)(void*)) &_SLLeaperView_draw
};

SLLeaperView * SLLeaperView_init( SLLeaperView *self ) {
  glGenBuffers( 1, &self->buffer );
  return self;
}

SLLeaperView * SLLeaperView_done( SLLeaperView *self ) {
  glDeleteBuffers( 1, &self->buffer );
  aqrelease( self->leaper );
  return self;
}

void * SLLeaperView_getInterface(
  SLLeaperView * self, char *interfaceId
) {
  if ( interfaceId == AQViewId ) {
    return &_SLLeaperView;
  }
  return NULL;
}

SLLeaperView * SLLeaperView_create( SLLeaper *leaper ) {
  SLLeaperView *self = aqcreate( &SLLeaperViewType );

  // Hold onto a reference to leaper so that it doesn't destruct without
  // view knowing.
  self->leaper = aqretain( leaper );

  return self;
}

void _SLLeaperView_draw( SLLeaperView *self ) {
  if ( self->leaper->state == LostLeaperState ) {
    // Cleanup the view at a safe time.
    AQLoop_once( (void (*)(void *)) &AQRenderer_removeView, self );
    return;
  }

  aqaabb box = AQParticle_aabb( self->leaper->body );

  // self->vertices[0] =
  //   (struct colorvertex) { box.left, box.top, 255, 255, 255, 255 };
  // self->vertices[1] =
  //   (struct colorvertex) { box.right, box.top, 255, 255, 255, 255 };
  // self->vertices[2] =
  //   (struct colorvertex) { box.right, box.bottom, 255, 255, 255, 255 };
  // self->vertices[3] =
  //   (struct colorvertex) { box.left, box.top, 255, 255, 255, 255 };
  // self->vertices[4] =
  //   (struct colorvertex) { box.left, box.bottom, 255, 255, 255, 255 };
  // self->vertices[5] =
  //   (struct colorvertex) { box.right, box.bottom, 255, 255, 255, 255 };
  float radius = self->leaper->radius * 1.5;
  float radians = self->leaper->radians;
  aqvec2 axis = aqvec2_make( cos( radians ), sin( radians ));
  aqaabb box1 = aqaabb_makeCenterRadius(
    aqvec2_sub(
      aqaabb_center( box ),
      aqvec2_scale( axis, -radius / 2 )
    ),
    radius / 4
  );
  aqaabb box2 = aqaabb_makeCenterRadius(
    aqvec2_sub(
      aqaabb_center( box ),
      aqvec2_scale( axis, radius / 2 )
    ),
    radius
  );
  box1.top += radius / 4;
  box1.bottom -= radius / 4;
  box2.right -= radius / 4;
  box2.left += radius / 4;

  memset( self->vertices, 0, sizeof(self->vertices) );
  void * vertices = AQDraw_color(
    self->vertices,
    AQDraw_rotatedRect(
      self->vertices, colorvertex_next, box2, self->leaper->radians
    ),
    colorvertex_next,
    colorvertex_getcolor,
    (struct glcolor) { 255, 116, 59, 255 }
  );
  vertices = AQDraw_color(
    vertices,
    AQDraw_rotatedRect(
      vertices, colorvertex_next, box1, self->leaper->radians
    ),
    colorvertex_next,
    colorvertex_getcolor,
    (struct glcolor) { 255, 116, 59, 255 }
  );

  // Oxygen.
  aqvec2 oxygenAxis = aqvec2_make( cos( radians + M_PI / 2 ), sin( radians + M_PI / 2 ));
  aqaabb fullBar = aqaabb_makeCenterExtents(
    aqvec2_add(
      aqaabb_center( box ),
      aqvec2_scale( oxygenAxis, radius * 2 )
    ),
    aqvec2_make( radius, 1 )
  );
  vertices = AQDraw_color(
    vertices,
    AQDraw_rotatedRect(
      vertices, colorvertex_next, fullBar, self->leaper->radians - M_PI / 6 
    ),
    colorvertex_next,
    colorvertex_getcolor,
    (struct glcolor) { 145, 255, 85, 64 }
  );

  aqvec2 oxygenAxisAxis = aqvec2_make( cos( radians + M_PI / 2 + M_PI / 3 ), sin( radians + M_PI / 2 + M_PI / 3 ));
  aqaabb filledBar = aqaabb_makeCenterExtents(
    aqvec2_add( aqvec2_add(
      aqaabb_center( box ),
      aqvec2_scale( oxygenAxis, radius * 2 )
    ), aqvec2_scale( oxygenAxisAxis, radius - radius * self->leaper->oxygen / SLLeaper_maxOxygen )),
    aqvec2_make( radius * self->leaper->oxygen / SLLeaper_maxOxygen, 1 )
  );
  vertices = AQDraw_color(
    vertices,
    AQDraw_rotatedRect(
      vertices, colorvertex_next, filledBar, self->leaper->radians - M_PI / 6 
    ),
    colorvertex_next,
    colorvertex_getcolor,
    (struct glcolor) { 145, 255, 85, 255 }
  );

  // Resource.
  aqvec2 resourceAxis = aqvec2_make( cos( radians - M_PI / 2 ), sin( radians - M_PI / 2 ));
  aqaabb fullResourceBar = aqaabb_makeCenterExtents(
    aqvec2_add(
      aqaabb_center( box ),
      aqvec2_scale( resourceAxis, radius * 2 )
    ),
    aqvec2_make( radius, 1 )
  );
  vertices = AQDraw_color(
    vertices,
    AQDraw_rotatedRect(
      vertices, colorvertex_next, fullResourceBar, self->leaper->radians + M_PI / 6 
    ),
    colorvertex_next,
    colorvertex_getcolor,
    (struct glcolor) { 27, 43, 204, 64 }
  );

  aqvec2 resourceAxisAxis = aqvec2_make( cos( radians - M_PI / 2 - M_PI / 3 ), sin( radians - M_PI / 2 - M_PI / 3 ));
  aqaabb filledResourceBar = aqaabb_makeCenterExtents(
    aqvec2_add( aqvec2_add(
      aqaabb_center( box ),
      aqvec2_scale( resourceAxis, radius * 2 )
    ), aqvec2_scale( resourceAxisAxis, radius - radius * self->leaper->resource / SLLeaper_maxResource )),
    aqvec2_make( radius * self->leaper->resource / SLLeaper_maxResource, 1 )
  );
  vertices = AQDraw_color(
    vertices,
    AQDraw_rotatedRect(
      vertices, colorvertex_next, filledResourceBar, self->leaper->radians + M_PI / 6 
    ),
    colorvertex_next,
    colorvertex_getcolor,
    (struct glcolor) { 27, 43, 204, 255 }
  );

  AQShaders_useProgram( ColorShaderProgram );
  AQShaders_draw(
    self->buffer, self->vertices, sizeof(struct colorvertex) * 6 * 6
  );
}

AQTYPE_INIT_DONE_GETINTERFACE( SLLeaperView );
