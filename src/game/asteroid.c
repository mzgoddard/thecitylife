#include <string.h>
#include <math.h>

#include "src/game/asteroid.h"

void _SLAsteroid_worldParticleAdder( AQParticle *particle, AQWorld *world ) {
  AQWorld_addParticle( world, particle );
}

void _SLAsteroid_worldParticleRemover( AQParticle *particle, AQWorld *world ) {
  AQWorld_removeParticle( world, particle );
}

SLAsteroid *SLAsteroid_init( void *_self ) {
  SLAsteroid *self = _self;

  memset( &( self->center ), 0, sizeof( SLAsteroid ) - sizeof( AQObj ));

  self->particles = aqinit( aqalloc( &AQListType ));

  return self;
}

SLAsteroid *SLAsteroid_done( void *_self ) {
  SLAsteroid *self = _self;

  AQList_iterate(
    self->particles,
    (AQList_iterator) &_SLAsteroid_worldParticleRemover,
    self->world
  );
  aqrelease( self->world );
  aqrelease( self->particles );

  return self;
}

SLAsteroid * SLAsteroid_create(
  AQWorld *world, aqvec2 center, AQDOUBLE radius
) {
  SLAsteroid *self = aqcreate( &SLAsteroidType );
  self->center = center;
  self->radius = radius;
  self->mass = M_PI * radius * radius; 

  AQParticle *particle = aqcreate( &AQParticleType );
  particle->radius = radius;
  particle->position = center;
  particle->lastPosition = center;
  particle->mass = self->mass;
  particle->userdata = self;

  AQList_push( self->particles, (AQObj *) particle );

  self->world = aqretain( world );
  AQList_iterate(
    self->particles, (AQList_iterator) &_SLAsteroid_worldParticleAdder, world
  );

  return self;
}

void SLAsteroid_setIsHome( SLAsteroid *self, int home ) {
  self->isHome = home;
}

int SLAsteroid_isHome( SLAsteroid *self ) {
  return self->isHome;
}

int AQParticle_isHomeAsteroid( AQParticle *p ) {
  if ( p && p->userdata && aqistype( p->userdata, &SLAsteroidType )) {
    return SLAsteroid_isHome( (SLAsteroid *) p->userdata );
  }
  return 0;
}

AQTYPE_INIT_DONE( SLAsteroid );
