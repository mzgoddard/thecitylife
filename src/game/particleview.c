#include <stdlib.h>

#include "./colors.h"
#include "./draw.h"
#include "./particleview.h"
#include "./view.h"
#include "./updater.h"
#include "src/game/ambientparticle.h"

void SLParticleView_draw( void *_self );
void SLParticleView_update( void *_self, double );

AQViewInterface SLParticleViewView = {
  AQViewId,
  (void (*)( void * )) SLParticleView_draw
};

SLUpdaterInterface SLParticleViewUpdater = {
  SLUpdaterId,
  (void (*)( void *, AQDOUBLE )) SLParticleView_update
};

void * SLParticleView_init( void *_self ) {
  SLParticleView *self = _self;
  self->dirty = 1;
  self->particles = aqinit( aqalloc( &AQListType ));
  self->leaper = NULL;
  self->homeAsteroid = NULL;
  glGenBuffers( 1, &self->buffer );
  return _self;
}

void * SLParticleView_done( void *_self ) {
  SLParticleView *self = _self;
  aqrelease( self->particles );
  return _self;
}

void * SLParticleView_getInterface( void *_self, AQInterfaceId id ) {
  if ( id == AQViewId ) {
    return &SLParticleViewView;
  }
  if ( id == SLUpdaterId ) {
    return &SLParticleViewUpdater;
  }
  return NULL;
}

SLParticleView * SLParticleView_create() {
  SLParticleView *self = aqcreate( &SLParticleViewType );
  return self;
}

void SLParticleView_addParticle( SLParticleView *self, AQParticle *particle ) {
  if ( !~AQList_indexOf( self->particles, (AQObj *) particle )) {
    AQList_push( self->particles, (AQObj *) particle );
  }
}

void SLParticleView_setLeaper( SLParticleView *self, SLLeaper *leaper ) {
  self->leaper = leaper;
}

void SLParticleView_setHomeAsteroid( SLParticleView *self, SLAsteroid *home ) {
  self->homeAsteroid = home;
}

extern GLfloat * _colorvertex_next3( void *vertex );

void _SLParticleView_iterator(
  AQParticle *particle, SLParticleView *self
) {
  // struct glcolor asteroidColor = asteroid->isHome ?
  //   homeAsteroidColor :
  //   (struct glcolor) asteroid->color;
  // asteroidColor.a = asteroid->resource * 2;

  // void * glowStart = self->currentVertex;

  // if ( asteroidColor.a ) {
  //   self->currentVertex = (struct colorvertex *) AQDraw_color(
  //     self->currentVertex,
  //     AQDraw_polygon(
  //       self->currentVertex,
  //       colorvertex_next,
  //       16,
  //       asteroid->center,
  //       asteroid->radius * 5,
  //       M_PI / 4
  //     ),
  //     colorvertex_next,
  //     colorvertex_getcolor,
  //     (struct glcolor) { 0, 0, 0, 0 }
  //   );
  // 
  //   AQDraw_color(
  //     glowStart + sizeof( struct colorvertex ) * 2,
  //     self->currentVertex,
  //     _colorvertex_next3,
  //     colorvertex_getcolor,
  //     asteroidColor
  //   );
  // }

  void *glowStart = self->currentVertex;

  AQDOUBLE distance = aqvec2_mag( aqvec2_sub(
    particle->position,
    self->homeAsteroid->center
  ));
  AQDOUBLE tint = distance / aqmath_hypot( 12800, 12800 ) * 128;
  // printf( "%f ", tint );
  if (
    fabs( fmod( tint - self->homePulse, 8 )) < 1
  ) {
    SLAmbientParticle_startPulse( particle->userdata );
  }

  struct glcolor glowColor = { 0, 0, 0, 0 };
  if (
    particle->userdata &&
      aqistype( particle->userdata, &SLAmbientParticleType )
  ) {
    SLAmbientParticle_tick( particle->userdata );
    glowColor = SLAmbientParticle_color( particle->userdata );
  }

  // glowColor = SL_maxColor( glowColor, (struct glcolor) {  });

  self->currentVertex = (struct colorvertex *) AQDraw_color(
    self->currentVertex,
    AQDraw_polygon(
      self->currentVertex,
      colorvertex_next,
      8,
      particle->position,
      particle->radius,
      ((float) ((int) self->currentVertex)) / 1000
    ),
    colorvertex_next,
    colorvertex_getcolor,
    // particleColor
    glowColor
  );

  AQDraw_color(
    glowStart + sizeof( struct colorvertex ) * 2,
    self->currentVertex,
    _colorvertex_next3,
    colorvertex_getcolor,
    SL_lerpColor( (struct glcolor) {
      particleColor.r,
      particleColor.g - 36 + ((int) self->currentVertex) % 37,
      particleColor.b - 52 + ((int) self->currentVertex) % 53,
      particleColor.a - 54 + ((int) self->currentVertex) % 109
    }, glowColor, 0.5 )
  );
}

void SLParticleView_draw( void *_self ) {
  SLParticleView *self = _self;

  if ( self->dirty ) {
    self->currentVertex = self->vertices;
    AQList_iterate(
      self->particles,
      (AQList_iterator) _SLParticleView_iterator,
      self
    );
    self->dirty = 0;
  }

  AQShaders_useProgram( ColorShaderProgram );
  AQShaders_draw(
    self->buffer,
    self->vertices,
    (void*) self->currentVertex - (void*) self->vertices
  );
}

void SLParticleView_update( void *_self, double dt ) {
  SLParticleView *self = _self;
  self->dirty = 1;

  if ( self->leaper->oxygen < 1024 ) {
    self->homePulse-=0.1;
    if ( self->homePulse < 0 ) {
      self->homePulse = 127;
    }
  } else {
    self->homePulse+=0.1;
    if ( self->homePulse > 128 ) {
      self->homePulse = 0;
    }
  }
}

static SLParticleView *_ambientParticleView = NULL;

SLParticleView * SLParticleView_getAmbientParticleView() {
  if ( _ambientParticleView == NULL ) {
    _ambientParticleView = aqretain( aqcreate( &SLParticleViewType ));
  }
  return _ambientParticleView;
}

void SLParticleView_addAmbientParticle( AQParticle *particle ) {
  // printf( "ambient %f %f ", particle->position.x, particle->position.y );
  SLParticleView_addParticle(
    SLParticleView_getAmbientParticleView(), particle
  );
}

AQTYPE( SLParticleView );
