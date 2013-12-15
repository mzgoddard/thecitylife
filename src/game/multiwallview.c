#include "src/game/view.h"
#include "src/game/draw.h"

#include "src/game/multiwallview.h"

void _BBMultiWallView_draw( void * );

AQViewInterface _BBMultiWallViewView = {
  AQViewId,
  _BBMultiWallView_draw
};

BBMultiWallView * BBMultiWallView_init( BBMultiWallView *self ) {
  aqzero( self );
  self->walls = aqinit( aqalloc( &AQListType ));
  glGenBuffers( 1, &self->buffer );
  return self;
}

BBMultiWallView * BBMultiWallView_done( BBMultiWallView *self ) {
  aqrelease( self->walls );
  glDeleteBuffers( 1, &self->buffer );
  return self;
}

void * BBMultiWallView_getInterface( BBMultiWallView *self, AQInterfaceId id ) {
  if ( id == AQViewId ) {
    return &_BBMultiWallViewView;
  }
  return NULL;
}

BBMultiWallView * BBMultiWallView_create() {
  return aqcreate( &BBMultiWallViewType );
}

void BBMultiWallView_addWall( BBMultiWallView *self, BBWall *wall ) {
  AQList_push( self->walls, (AQObj *) wall );
  wall->dirtyView = 1;
}

void BBMultiWallView_removeWall( BBMultiWallView *self, BBWall *wall ) {
  AQList_remove( self->walls, (AQObj *) wall );
}

void _BBMultiWallView_drawWall( AQObj *_wall, void **ctx ) {
  BBWall *wall = (BBWall *) _wall;
  struct glcolor color = { 0, 0, 0, 255 };
  if ( wall->wallType == BBTableWall ) {
    color = (struct glcolor) { 66, 33, 0, 255 };
  }

  *ctx = AQDraw_color(
    *ctx,
    AQDraw_rect( *ctx, colorvertex_next, wall->aabb ),
    colorvertex_next,
    colorvertex_getcolor,
    color
  );
}

void _BBMultiWallView_draw( void *obj ) {
  BBMultiWallView *self = obj;

  void * vertices = self->vertices;
  AQList_iterate(
    self->walls, (AQList_iterator) _BBMultiWallView_drawWall, &vertices
  );

  AQShaders_useProgram( ColorShaderProgram );
  AQShaders_draw(
    self->buffer, self->vertices,
    (((struct colorvertex *) vertices ) - self->vertices ) *
      sizeof( struct colorvertex )
  );
}

AQTYPE( BBMultiWallView );
