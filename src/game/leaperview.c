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
  memset( self->vertices, 0, sizeof(self->vertices) );
  void * vertices = AQDraw_color(
    self->vertices,
    AQDraw_rect( self->vertices, colorvertex_next, box ),
    colorvertex_next,
    colorvertex_getcolor,
    (struct glcolor) { 255, 0, 0, 255 }
  );

  AQShaders_useProgram( ColorShaderProgram );
  AQShaders_draw(
    self->buffer, self->vertices, sizeof(struct colorvertex) * 6
  );
}

AQTYPE_INIT_DONE_GETINTERFACE( SLLeaperView );
