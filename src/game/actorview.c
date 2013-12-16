#include "src/game/view.h"
#include "src/game/draw.h"
#include "src/game/actorview.h"

void _AQActorView_draw( void * );

AQViewInterface _AQActorViewView = {
  AQViewId,
  &_AQActorView_draw
};

AQActorView * AQActorView_init( AQActorView *self ) {
  aqzero( self );
  glGenBuffers( 1, &self->buffer );
  return self;
}

AQActorView * AQActorView_done( AQActorView *self ) {
  glDeleteBuffers( 1, &self->buffer );
  aqrelease( self->actor );
  return self;
}

void * AQActorView_getInterface( AQActorView *self, AQInterfaceId id ) {
  if ( id == AQViewId ) {
    return &_AQActorViewView;
  }
  return NULL;
}

AQActorView * AQActorView_create( AQActor *actor ) {
  AQActorView *view = aqcreate( &AQActorViewType );
  view->actor = aqretain( actor );
  return view;
}

void _AQActorView_draw( void *_self ) {
  AQActorView *self = _self;

  void * vertices = self->vertices;
  vertices = AQDraw_color(
    self->vertices,
    AQDraw_polygon(
      self->vertices, colorvertex_next, 32,
      self->actor->body->position, self->actor->body->radius, 0
    ),
    colorvertex_next,
    colorvertex_getcolor,
    (struct glcolor) { 0, 0, 0, 255 }
  );

  vertices = AQDraw_color(
    vertices,
    AQDraw_polygon(
      vertices, colorvertex_next, 32,
      self->actor->body->position, self->actor->body->radius - 1, 0
    ),
    colorvertex_next,
    colorvertex_getcolor,
    (struct glcolor) { 255, 255, 255, 255 }
  );

  AQShaders_useProgram( ColorShaderProgram );
  AQShaders_draw(
    self->buffer, self->vertices,
    (((struct colorvertex *) vertices ) - self->vertices ) *
      sizeof( struct colorvertex )
  );
}

AQTYPE( AQActorView );
