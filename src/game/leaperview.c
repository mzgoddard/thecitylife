#include "src/game/leaperview.h"
#include "src/game/view.h"
#include "src/game/loop.h"
#include "src/game/draw.h"
#include "src/game/colors.h"

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
  printf( "***SLLeaperView_done***\n" );
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
  // return;

  // aqaabb box = AQParticle_aabb( self->leaper->body );
  self->leaper->position = SLLeaper_calcPosition( self->leaper );
  aqvec2 center = self->leaper->position;

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
  float radius = self->leaper->radius;
  float radians = SLLeaper_radians( self->leaper );
  aqvec2 axis = aqvec2_make( cos( radians ), sin( radians ));
  aqaabb box1 = aqaabb_makeCenterRadius(
    aqvec2_sub(
      // aqaabb_center( box ),
      center,
      aqvec2_scale( axis, -radius * 0.75 )
    ),
    radius / 4
  );
  aqaabb box2 = aqaabb_makeCenterRadius(
    aqvec2_sub(
      // aqaabb_center( box ),
      center,
      aqvec2_scale( axis, 0 )
    ),
    radius * 9 / 10
  );
  box1.top += radius / 4;
  box1.bottom -= radius / 4;
  box2.right -= radius / 3;
  box2.left += radius / 3;

  memset( self->vertices, 0, sizeof(self->vertices) );
  void * vertices = self->vertices;
  vertices = AQDraw_color(
    self->vertices,
    AQDraw_rotatedRect(
      self->vertices, colorvertex_next, box2, radians
    ),
    colorvertex_next,
    colorvertex_getcolor,
    leaperColor
  );
  vertices = AQDraw_color(
    vertices,
    AQDraw_rotatedRect(
      vertices, colorvertex_next, box1, radians
    ),
    colorvertex_next,
    colorvertex_getcolor,
    leaperColor
  );
  vertices = AQDraw_color(
    vertices,
    // vertices,
    // AQDraw_rotatedRect(
    //   vertices, colorvertex_next, box1, radians
    // ),
    AQDraw_polygon(
      AQDraw_polygon(
        // vertices,
        AQDraw_polygon(
          vertices,
          colorvertex_next,
          16,
          // center,
          ((AQParticle *) AQList_at( self->leaper->bodies, 2 ))->position,
          ((AQParticle *) AQList_at( self->leaper->bodies, 2 ))->radius,
          0.0
        ),
        colorvertex_next,
        16,
        // center,
        ((AQParticle *) AQList_at( self->leaper->bodies, 1 ))->position,
        ((AQParticle *) AQList_at( self->leaper->bodies, 1 ))->radius,
        0.0
      ),
      colorvertex_next,
      16,
      // center,
      ((AQParticle *) AQList_at( self->leaper->bodies, 0 ))->position,
      ((AQParticle *) AQList_at( self->leaper->bodies, 0 ))->radius,
      0.0
    ),
    colorvertex_next,
    colorvertex_getcolor,
    leaperColor
  );

  // Oxygen.
  aqvec2 oxygenAxis = aqvec2_make( cos( radians + M_PI / 2 ), sin( radians + M_PI / 2 ));
  aqaabb fullBar = aqaabb_makeCenterExtents(
    aqvec2_add(
      // aqaabb_center( box ),
      center,
      aqvec2_scale( oxygenAxis, radius * 2 )
    ),
    aqvec2_make( radius, 1 )
  );
  vertices = AQDraw_color(
    vertices,
    AQDraw_rotatedRect(
      vertices, colorvertex_next, fullBar, radians - M_PI / 6 
    ),
    colorvertex_next,
    colorvertex_getcolor,
    leaperOxygenBarBackColor
  );

  aqvec2 oxygenAxisAxis = aqvec2_make( cos( radians + M_PI / 2 + M_PI / 3 ), sin( radians + M_PI / 2 + M_PI / 3 ));
  aqaabb filledBar = aqaabb_makeCenterExtents(
    aqvec2_add( aqvec2_add(
      // aqaabb_center( box ),
      center,
      aqvec2_scale( oxygenAxis, radius * 2 )
    ), aqvec2_scale( oxygenAxisAxis, radius - radius * self->leaper->oxygen / SLLeaper_maxOxygen )),
    aqvec2_make( radius * self->leaper->oxygen / SLLeaper_maxOxygen, 1 )
  );
  vertices = AQDraw_color(
    vertices,
    AQDraw_rotatedRect(
      vertices, colorvertex_next, filledBar, radians - M_PI / 6 
    ),
    colorvertex_next,
    colorvertex_getcolor,
    leaperOxygenBarForeColor
  );

  // Resource.
  aqvec2 resourceAxis = aqvec2_make( cos( radians - M_PI / 2 ), sin( radians - M_PI / 2 ));
  aqaabb fullResourceBar = aqaabb_makeCenterExtents(
    aqvec2_add(
      // aqaabb_center( box ),
      center,
      aqvec2_scale( resourceAxis, radius * 2 )
    ),
    aqvec2_make( radius, 1 )
  );
  vertices = AQDraw_color(
    vertices,
    AQDraw_rotatedRect(
      vertices, colorvertex_next, fullResourceBar, radians + M_PI / 6 
    ),
    colorvertex_next,
    colorvertex_getcolor,
    leaperResourceBarBackColor
  );

  aqvec2 resourceAxisAxis = aqvec2_make( cos( radians - M_PI / 2 - M_PI / 3 ), sin( radians - M_PI / 2 - M_PI / 3 ));
  aqaabb filledResourceBar = aqaabb_makeCenterExtents(
    aqvec2_add( aqvec2_add(
      // aqaabb_center( box ),
      center,
      aqvec2_scale( resourceAxis, radius * 2 )
    ), aqvec2_scale( resourceAxisAxis, radius - radius * self->leaper->resource / SLLeaper_maxResource )),
    aqvec2_make( radius * self->leaper->resource / SLLeaper_maxResource, 1 )
  );
  vertices = AQDraw_color(
    vertices,
    AQDraw_rotatedRect(
      vertices, colorvertex_next, filledResourceBar, radians + M_PI / 6 
    ),
    colorvertex_next,
    colorvertex_getcolor,
    leaperResourceBarForeColor
  );

  AQShaders_useProgram( ColorShaderProgram );
  AQShaders_draw(
    self->buffer, self->vertices, (((struct colorvertex *) vertices ) - self->vertices ) * sizeof( struct colorvertex )
  );
}

AQTYPE_INIT_DONE_GETINTERFACE( SLLeaperView );
