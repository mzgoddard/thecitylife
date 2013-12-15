#include "src/game/wall.h"

BBWall * BBWall_init( BBWall *self ) {
  aqzero( self );
  self->particles = aqinit( aqalloc( &AQListType ));
  return self;
}

BBWall * BBWall_done( BBWall *self ) {
  aqrelease( self->particles );
  return self;
}

BBWall * BBWall_create( aqaabb aabb, BBWallEnum wallType ) {
  BBWall *self = aqcreate( &BBWallType );
  self->aabb = aabb;
  self->wallType = wallType;

  aqvec2 size = aqaabb_size( aabb );
  AQDOUBLE radius = size.x < size.y ? size.x : size.y;
  radius /= 2;

  aqvec2 axis = aqvec2_zero();
  AQDOUBLE maxDistance = 0;
  if ( size.x < size.y ) {
    axis.y = 1;
    maxDistance = size.y - radius * 2;
  } else {
    axis.x = 1;
    maxDistance = size.x - radius * 2;
  }

  aqvec2 start = aqvec2_make( aabb.left + radius, aabb.bottom + radius );

  AQDOUBLE distance = 0;
  for ( ; distance <= maxDistance + 0.5; distance += 1 ) {
    AQParticle *particle = aqcreate( &AQParticleType );
    particle->position = aqvec2_add( start, aqvec2_scale( axis, distance ));
    particle->radius = radius;
    particle->isStatic = 1;
    AQList_push( self->particles, (AQObj *) particle );
  }

  return self;
}

BBWall * BBWall_clone( BBWall *original ) {
  return BBWall_create( original->aabb, original->wallType );
}

void _BBWall_addParticleIterator( AQObj *particle, void *ctx ) {
  AQWorld_addParticle( ctx, (AQParticle *) particle );
}

void _BBWall_removeParticleIterator( AQObj *particle, void *ctx ) {
  AQWorld_removeParticle( ctx, (AQParticle *) particle );
}

void BBWall_addToWorld( BBWall *self, AQWorld *world ) {
  self->world = aqretain( world );
  AQList_iterate(
    self->particles, (AQList_iterator) _BBWall_addParticleIterator, world
  );
}

void BBWall_removeFromWorld( BBWall *self, AQWorld *world ) {
  AQList_iterate(
    self->particles, (AQList_iterator) _BBWall_removeParticleIterator, world
  );
  aqrelease( self->world );
  self->world = NULL;
}

void BBWall_removeParticle( BBWall *self, AQParticle *particle ) {
  int index = AQList_indexOf( self->particles, (AQObj *) particle );
  AQList_remove( self->particles, (AQObj *) particle );

  if ( self->world ) {
    AQWorld_removeParticle( self->world, particle );
  }
}

AQTYPE_INIT_DONE( BBWall );
