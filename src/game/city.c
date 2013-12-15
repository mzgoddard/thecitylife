#include <stdlib.h>

#include "src/game/city.h"
#include "src/game/multiwallview.h"

void _BBCity_setBlock( BBCity *, BBBlock * );

BBCity * BBCity_init( BBCity *self ) {
  aqzero( self );
  return self;
}

BBCity * BBCity_done( BBCity *self ) {
  aqrelease( self->blocks );
  aqrelease( self->population );
  aqrelease( self->merchants );
  if ( self->blockMap ) {
    free( self->blockMap );
  }
  return self;
}

BBCity * BBCity_create() {
  return aqcreate( &BBCityType );
}

BBCity * BBCity_initBlocks( BBCity *self, int size ) {
  aqrelease( self->blocks );
  if ( self->blockMap ) {
    free( self->blockMap );
  }

  self->blocks = aqinit( aqalloc( &AQListType ));
  self->blockMap = malloc( sizeof( BBBlock * ) * size * size );
  memset( self->blockMap, 0, sizeof( BBBlock * ) * size * size );

  self->citySize = size;

  // Test block.
  BBBlock *block1 = aqcreate( &BBBlockType );
  block1->aabb = aqaabb_make( 0, 60, -60, 0 );
  *block1->sides = *(BBBlockSide[4]) {
    BBBlockOpenSide, BBBlockHalfSide, BBBlockClosedSide, BBBlockHalfSide
  };

  BBRoom *room = aqcreate( &BBRoomType );
  room->size = BBLargeRoom;
  room->rotation = BBNorthRoom;
  room->aabb = aqaabb_make( -30, 40, -60, 0 );

  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -30, 15, -32, 0 ), BBWallWall )
  );
  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -30, 40, -32, 25 ), BBWallWall )
  );
  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -30, 40, -60, 38 ), BBWallWall )
  );
  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -58, 40, -60, 0 ), BBWallWall )
  );
  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -30, 2, -60, 0 ), BBWallWall )
  );

  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -39, 12, -51, 10 ), BBTableWall )
  );
  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -39, 14, -51, 12 ), BBTableWall )
  );
  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -39, 28, -51, 26 ), BBTableWall )
  );
  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -39, 30, -51, 28 ), BBTableWall )
  );

  AQList_push( block1->rooms, (AQObj *) room );

  room = aqcreate( &BBRoomType );
  room->size = BBMediumRoom;
  room->rotation = BBNorthRoom;
  room->aabb = aqaabb_make( -30, 60, -50, 40 );

  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -30, 60, -50, 58 ), BBWallWall )
  );
  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -48, 60, -50, 40 ), BBWallWall )
  );
  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -30, 42, -50, 40 ), BBWallWall )
  );

  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -36, 54, -38, 46 ), BBTableWall )
  );
  AQList_push(
    room->walls, (AQObj *) BBWall_create( aqaabb_make( -38, 54, -40, 46 ), BBTableWall )
  );

  AQList_push( block1->rooms, (AQObj *) room );

  _BBCity_setBlock( self, BBBlock_clone( block1 ));
  _BBCity_setBlock( self,
    BBBlock_move( BBBlock_clone( block1 ), aqvec2_make( 60, 0 ))
  );

  // Main street.

  // Loop alleys.

  // Deadend alleys.

  // Populate stores.

  // Populate runners.

  // Populate homes.

  // Choose players home.

  return self;
}

void BBCity_addToWorld( BBCity *self, AQWorld *world ) {
  self->world = aqretain( world );
  AQList_iterate(
    self->blocks, (AQList_iterator) BBBlock_addToWorld, world
  );
}

void BBCity_removeFromWorld( BBCity *self, AQWorld *world ) {
  AQList_iterate(
    self->blocks, (AQList_iterator) BBBlock_removeFromWorld, world
  );
  aqrelease( self->world );
  self->world = NULL;
}

void _BBCity_addWallToView( AQObj *obj, void *ctx ) {
  BBWall *wall = (BBWall *) obj;
  BBMultiWallView *view = (BBMultiWallView *) ctx;

  BBMultiWallView_addWall( view, wall );
}

void _BBCity_removeWallFromView( AQObj *obj, void *ctx ) {
  BBWall *wall = (BBWall *) obj;
  BBMultiWallView *view = (BBMultiWallView *) ctx;

  BBMultiWallView_removeWall( view, wall );
}

void _BBCity_iterateRooms_addWallsToView( AQObj *obj, void *ctx ) {
  BBRoom *room = (BBRoom *) obj;
  AQList_iterate( room->walls, _BBCity_addWallToView, ctx );
}

void _BBCity_iterateRooms_removeWallsFromView( AQObj *obj, void *ctx ) {
  BBRoom *room = (BBRoom *) obj;
  AQList_iterate( room->walls, _BBCity_removeWallFromView, ctx );
}

void _BBCity_iterateBlocks_addWallsToView( AQObj *obj, void *ctx ) {
  BBBlock *block = (BBBlock *) obj;
  AQList_iterate( block->rooms, _BBCity_iterateRooms_addWallsToView, ctx );
}

void _BBCity_iterateBlocks_removeWallsFromView( AQObj *obj, void *ctx ) {
  BBBlock *block = (BBBlock *) obj;
  AQList_iterate( block->rooms, _BBCity_iterateRooms_removeWallsFromView, ctx );
}

void BBCity_addWallsToView( BBCity *self, void *view ) {
  self->_wallView = aqretain( view );
  AQList_iterate( self->blocks, _BBCity_iterateBlocks_addWallsToView, view );
}

void BBCity_removeWallsFromView( BBCity *self, void *view ) {
  AQList_iterate(
    self->blocks, _BBCity_iterateBlocks_removeWallsFromView, view
  );
  aqrelease( self->_wallView );
  self->_wallView = NULL;
}

void _BBCity_setBlock( BBCity *self, BBBlock *block ) {
  // Block origin is adjusted from 0, 0 to citySize / 2 * 60, citySize / 2 * 60
  aqvec2 position = aqvec2_add(
    aqaabb_tlvec2( block->aabb ),
    aqvec2_make( self->citySize / 2 * 60, self->citySize / 2 * 60 )
  );

  int x = floor( position.x / 60 );
  int y = floor( position.y / 60 );

  AQList_push( self->blocks, (AQObj *) block );
  self->blockMap[ self->citySize * y + x ] = block;
}

AQTYPE_INIT_DONE( BBCity );
