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

struct rotatedata {
  aqaabb oldAabb;
  aqaabb newAabb;
  int rotations;
};

void _BBRoom_rotateParticle( AQObj *_particle, void *ctx ) {
  AQParticle *particle = (AQParticle *) _particle;
  struct rotatedata *data = (struct rotatedata *) ctx;

  particle->position = aqvec2_rotateInAabbToAabb(
    particle->position, data->oldAabb, data->newAabb, data->rotations
  );
}

void _BBRoom_rotateWall( AQObj *_wall, void *ctx ) {
  BBWall *wall = (BBWall *) _wall;
  struct rotatedata *data = (struct rotatedata *) ctx;

  wall->aabb = aqaabb_rotateInAabbToAabb(
    wall->aabb, data->oldAabb, data->newAabb, data->rotations
  );

  AQList_iterate( wall->particles, _BBRoom_rotateParticle, ctx );
}

void _BBRoom_combineAabb( AQObj *_wall, void *ctx ) {
  BBWall *wall = (BBWall *) _wall;
  aqaabb *aabb = (aqaabb *) ctx;

  *aabb = aqaabb_combine( *aabb, wall->aabb );
}

void BBRoom_buildAabb( BBRoom *self ) {
  if ( AQList_length( self->walls ) == 0 ) {
    return;
  }

  self->aabb = ((BBWall *) AQList_at( self->walls, 0 ))->aabb;
  AQList_iterate( self->walls, _BBRoom_combineAabb, &self->aabb );
}

void BBRoom_addWall( BBRoom *self, aqaabb aabb, BBWallEnum wallType ) {
  AQList_push( self->walls, (AQObj *) BBWall_create( aabb, wallType ));
}

BBRoom * BBRoom_rotate( BBRoom *self, int rotations ) {
  if ( rotations == 0 ) {
    return self;
  }

  self->rotation = ( self->rotation + rotations ) % 4;

  AQWorld * world = self->world;

  if ( world ) {
    BBRoom_removeFromWorld( self, world );
  }

  aqaabb oldAabb = self->aabb;
  self->aabb = aqaabb_rotateAtTL( self->aabb, rotations );

  struct rotatedata data = {
    oldAabb,
    self->aabb,
    rotations
  };

  AQList_iterate( self->walls, _BBRoom_rotateWall, &data );

  if ( world ) {
    BBRoom_addToWorld( self, world );
  }

  return self;
}

BBRoom * BBRoom_rotateTo( BBRoom *self, BBRotation rotation ) {
  int rotationDiff = ( 4 + (int) rotation - (int) self->rotation ) % 4;

  BBRoom_rotate( self, rotationDiff );

  return self;
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

BBRoom * BBRoom_move( BBRoom *self, aqvec2 diff ) {
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

  return self;
}

BBRoom * BBRoom_moveTo( BBRoom *self, aqvec2 tl ) {
  return BBRoom_move( self, aqvec2_sub( tl, aqaabb_tlvec2( self->aabb )));
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
