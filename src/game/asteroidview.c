#include "src/game/asteroidview.h"
#include "src/game/view.h"
#include "src/game/draw.h"
#include "src/game/colors.h"

void _SLAsteroidGroupView_draw( SLAsteroidGroupView * );

AQViewInterface _SLAsteroidGroupViewView = {
  (const char *) &AQViewId,
  (void (*)(void*)) &_SLAsteroidGroupView_draw
};

SLAsteroidGroupView * SLAsteroidGroupView_init( SLAsteroidGroupView *self ) {
  memset( &self->asteroids, 0, sizeof(SLAsteroidGroupView) - sizeof(AQObj) );
  self->asteroids = aqinit( aqalloc( &AQListType ));
  glGenBuffers( 1, &self->buffer );
  return self;
}

SLAsteroidGroupView * SLAsteroidGroupView_done( SLAsteroidGroupView *self ) {
  glDeleteBuffers( 1, &self->buffer );
  return self;
}

void * SLAsteroidGroupView_getInterface( SLAsteroidGroupView *self, char *ifn ) {
  if ( ifn == AQViewId ) {
    return &_SLAsteroidGroupViewView;
  }
  return NULL;
}

SLAsteroidGroupView * SLAsteroidGroupView_create() {
  return aqcreate( &SLAsteroidGroupViewType );
}

void SLAsteroidGroupView_addAsteroid(
  SLAsteroidGroupView *self, SLAsteroid *asteroid
) {
  AQList_push( self->asteroids, (AQObj*) asteroid );
}

void _SLAsteroidGroupView_iterator(
  SLAsteroid *asteroid, SLAsteroidGroupView *self
) {
  if ( asteroid->isVisible ) {
    self->currentVertex = (struct colorvertex *) AQDraw_color(
      self->currentVertex,
      AQDraw_rect(
        self->currentVertex,
        colorvertex_next,
        aqaabb_makeCenterRadius( asteroid->center, asteroid->radius )
      ),
      colorvertex_next,
      colorvertex_getcolor,
      asteroid->isHome ?
        homeAsteroidColor :
        (struct glcolor) asteroid->color
    );
  }
}

void _SLAsteroidGroupView_draw( SLAsteroidGroupView *self ) {
  self->currentVertex = self->vertices;
  AQList_iterate(
    self->asteroids,
    (AQList_iterator) _SLAsteroidGroupView_iterator,
    self
  );

  AQShaders_useProgram( ColorShaderProgram );
  AQShaders_draw(
    self->buffer,
    self->vertices,
    (void*) self->currentVertex - (void*) self->vertices
  );
}

AQTYPE_INIT_DONE_GETINTERFACE( SLAsteroidGroupView );
