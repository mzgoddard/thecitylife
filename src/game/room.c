#include "src/game/room.h"

BBRoom * BBRoom_init( BBRoom *self ) {
  aqzero( self );
  self->walls = aqinit( aqalloc( &AQListType ));
  self->pathNodes = aqinit( aqalloc( &AQListType ));
  return self;
}

BBRoom * BBRoom_done( BBRoom *self ) {
  aqrelease( self->walls );
  aqrelease( self->pathNodes );
  return self;
}

BBRoom * BBRoom_create() {
  return aqcreate( &BBRoomType );
}

void _BBRoom_cloneWall( AQObj *wall, void *ctx ) {
  AQList_push( (AQList *) ctx, (AQObj *) BBWall_clone( (BBWall *) wall ));
}

void _BBRoom_clonePathNode( AQObj *pathNode, void *ctx ) {
  AQList_push(
    (AQList *) ctx, (AQObj *) BBPathNode_clone( (BBPathNode *) pathNode )
  );
}

BBRoom * BBRoom_clone( BBRoom *original ) {
  BBRoom *clone = aqcreate( &BBRoomType );
  clone->aabb = original->aabb;
  AQList_iterate( original->walls, _BBRoom_cloneWall, clone->walls );
  AQList_iterate(
    original->pathNodes, _BBRoom_clonePathNode, clone->pathNodes
  );
  return clone;
}

void _BBRoom_moveParticle( AQObj *_particle, aqvec2 *diff ) {
  AQParticle *particle = (AQParticle *) _particle;
  particle->position = aqvec2_add( particle->position, *diff );
}

void _BBRoom_moveWall( AQObj *_wall, aqvec2 *diff ) {
  BBWall *wall = (BBWall *) _wall;
  wall->aabb = aqaabb_translate( wall->aabb, *diff );
  AQList_iterate(
    wall->particles, (AQList_iterator) _BBRoom_moveParticle, diff
  );
}

void _BBRoom_movePathNode( AQObj *_pathNode, aqvec2 *diff ) {
  BBPathNode *pathNode = (BBPathNode *) _pathNode;
  BBPathNode_move( pathNode, *diff );
}

void BBRoom_move( BBRoom *self, aqvec2 diff ) {
  self->aabb = aqaabb_translate( self->aabb, diff );

  AQWorld *world = self->world;

  if ( world ) {
    BBRoom_removeFromWorld( self, world );
  }

  AQList_iterate( self->walls, (AQList_iterator) _BBRoom_moveWall, &diff );
  AQList_iterate(
    self->pathNodes, (AQList_iterator) _BBRoom_movePathNode, &diff
  );

  if ( world ) {
    BBRoom_addToWorld( self, world );
  }
}

void BBRoom_changeVacancy( BBRoom *self, void *newOwner ) {}

void BBRoom_addToWorld( BBRoom *self, AQWorld *world ) {
  self->world = aqretain( world );
  AQList_iterate( self->walls, (AQList_iterator) BBWall_addToWorld, world );
}

void BBRoom_removeFromWorld( BBRoom *self, AQWorld *world ) {
  AQList_iterate(
    self->walls, (AQList_iterator) BBWall_removeFromWorld, world
  );
  aqrelease( self->world );
  self->world = NULL;
}

AQTYPE_INIT_DONE( BBRoom );
