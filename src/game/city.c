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
  BBRoom *largeRoom = aqcreate( &BBRoomType );
  largeRoom->size = BBLargeRoom;
  largeRoom->rotation = BBNorth;
  largeRoom->aabb = aqaabb_make( -30, 40, -60, 0 );

  BBRoom_addWall( largeRoom, aqaabb_make( -30, 15, -32, 0 ), BBWallWall );
  BBRoom_addWall( largeRoom, aqaabb_make( -30, 40, -32, 25 ), BBWallWall );
  BBRoom_addWall( largeRoom, aqaabb_make( -30, 40, -60, 38 ), BBWallWall );
  BBRoom_addWall( largeRoom, aqaabb_make( -58, 40, -60, 0 ), BBWallWall );
  BBRoom_addWall( largeRoom, aqaabb_make( -30, 2, -60, 0 ), BBWallWall );

  BBRoom_addWall( largeRoom, aqaabb_make( -39, 12, -51, 10 ), BBTableWall );
  BBRoom_addWall( largeRoom, aqaabb_make( -39, 14, -51, 12 ), BBTableWall );
  BBRoom_addWall( largeRoom, aqaabb_make( -39, 28, -51, 26 ), BBTableWall );
  BBRoom_addWall( largeRoom, aqaabb_make( -39, 30, -51, 28 ), BBTableWall );

  BBRoom *smallRoom = aqcreate( &BBRoomType );
  smallRoom->size = BBSmallRoom;
  smallRoom->rotation = BBNorth;
  smallRoom->aabb = aqaabb_make( -30, 60, -50, 40 );

  BBRoom_addWall( smallRoom, aqaabb_make( -30, 60, -50, 58 ), BBWallWall );
  BBRoom_addWall( smallRoom, aqaabb_make( -48, 60, -50, 40 ), BBWallWall );
  BBRoom_addWall( smallRoom, aqaabb_make( -30, 42, -50, 40 ), BBWallWall );

  BBRoom_addWall( smallRoom, aqaabb_make( -36, 54, -38, 46 ), BBTableWall );
  BBRoom_addWall( smallRoom, aqaabb_make( -38, 54, -40, 46 ), BBTableWall );

  BBRoom *smallBox = aqcreate( &BBRoomType );
  smallBox->size = BBSmallRoom;
  smallBox->rotation = BBNorth;
  smallBox->aabb = aqaabb_make( 0, 20, -20, 0 );

  BBRoom_addWall( smallBox, aqaabb_make( 0, 20, -2, 0 ), BBWallWall );
  BBRoom_addWall( smallBox, aqaabb_make( 0, 20, -20, 18 ), BBWallWall );
  BBRoom_addWall( smallBox, aqaabb_make( -18, 20, -20, 0 ), BBWallWall );
  BBRoom_addWall( smallBox, aqaabb_make( 0, 2, -20, 0 ), BBWallWall );

  BBRoom *miniBox = aqcreate( &BBRoomType );
  miniBox->size = BBSmallRoom;
  miniBox->rotation = BBNorth;
  miniBox->aabb = aqaabb_make( 0, 20, -10, 0 );

  BBRoom_addWall( miniBox, aqaabb_make( 0, 20, -2, 0 ), BBWallWall );
  BBRoom_addWall( miniBox, aqaabb_make( 0, 20, -10, 18 ), BBWallWall );
  BBRoom_addWall( miniBox, aqaabb_make( -8, 20, -10, 0 ), BBWallWall );
  BBRoom_addWall( miniBox, aqaabb_make( 0, 2, -10, 0 ), BBWallWall );

  // room = BBRoom_clone( room );
  // BBRoom_move( room, aqvec2_make( 0, 30 ));
  // BBRoom_rotateTo( room, BBWest );

  BBRoom *mediumBox = aqcreate( &BBRoomType );
  mediumBox->rotation = BBNorth;
  mediumBox->aabb = aqaabb_make( 0, 20, -30, 0 );

  BBRoom_addWall( mediumBox, aqaabb_make( 0, 20, -2, 0 ), BBWallWall );
  BBRoom_addWall( mediumBox, aqaabb_make( 0, 20, -30, 18 ), BBWallWall );
  BBRoom_addWall( mediumBox, aqaabb_make( -28, 20, -30, 0 ), BBWallWall );
  BBRoom_addWall( mediumBox, aqaabb_make( 0, 2, -30, 0 ), BBWallWall );

  BBBlock *block1 = aqcreate( &BBBlockType );
  block1->aabb = aqaabb_make( 0, 60, -60, 0 );
  BBBlockSide block1Sides[4] = {
    BBBlockOpenSide, BBBlockHalfSide, BBBlockClosedSide, BBBlockHalfSide
  };
  memcpy( block1->sides, block1Sides, sizeof( BBBlockSide[4] ));
  AQList_push( block1->rooms, (AQObj *) BBRoom_clone( largeRoom ));
  AQList_push( block1->rooms, (AQObj *) BBRoom_clone( smallRoom ));
  // AQList_push( block1->rooms, (AQObj *) room );

  BBBlock *block2 = aqcreate( &BBBlockType );
  block2->aabb = aqaabb_make( 0, 60, -60, 0 );
  BBBlockSide block2Sides[4] = {
    BBBlockOpenSide, BBBlockHalfSide, BBBlockAlleySide, BBBlockHalfSide
  };
  memcpy( block2->sides, block2Sides, sizeof( BBBlockSide[4] ));
  AQList_push( block2->rooms, (AQObj *) BBRoom_moveTo( BBRoom_clone( mediumBox ), aqvec2_make( 0, -30 )));
  AQList_push( block2->rooms, (AQObj *) BBRoom_moveTo( BBRoom_clone( mediumBox ), aqvec2_make( 40, -30 )));

  BBBlock *block3 = aqcreate( &BBBlockType );
  block3->aabb = aqaabb_make( 0, 60, -60, 0 );
  BBBlockSide block3Sides[4] = {
    BBBlockAlleySide, BBBlockAlleySide, BBBlockAlleySide, BBBlockAlleySide
  };
  memcpy( block3->sides, block3Sides, sizeof( block3Sides ));
  AQList_push( block3->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 0, 0 )), BBEast ));
  AQList_push( block3->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 40, 0 )), BBWest ));
  AQList_push( block3->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 0, -40 )), BBEast ));
  AQList_push( block3->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 40, -40 )), BBWest ));

  BBBlock *block4 = aqcreate( &BBBlockType );
  block4->aabb = aqaabb_make( 0, 60, -60, 0 );
  BBBlockSide block4Sides[4] = {
    BBBlockAlleySide, BBBlockAlleySide, BBBlockAlleySide, BBBlockAlleySide
  };
  memcpy( block4->sides, block4Sides, sizeof( block4Sides ));
  AQList_push( block4->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 0, 0 )), BBEast ));
  AQList_push( block4->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 40, 0 )), BBWest ));
  AQList_push( block4->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallBox ), aqvec2_make( 0, -20 )), BBEast ));
  AQList_push( block4->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 40, -20 )), BBWest ));
  AQList_push( block4->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 0, -40 )), BBEast ));
  AQList_push( block4->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallBox ), aqvec2_make( 40, -40 )), BBWest ));

  BBBlock *block5 = aqcreate( &BBBlockType );
  block5->aabb = aqaabb_make( 0, 60, -60, 0 );
  BBBlockSide block5Sides[4] = {
    BBBlockAlleySide, BBBlockClosedSide, BBBlockClosedSide, BBBlockClosedSide
  };
  memcpy( block5->sides, block5Sides, sizeof( block5Sides ));
  AQList_push( block5->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 0, 0 )), BBEast ));
  AQList_push( block5->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 40, 0 )), BBWest ));
  AQList_push( block5->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( largeRoom ), aqvec2_make( 10, -30 )), BBNorth ));
  AQList_push( block5->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( miniBox ), aqvec2_make( 0, -20 )), BBNorth ));
  AQList_push( block5->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( miniBox ), aqvec2_make( 40, -20 )), BBNorth ));
  // AQList_push( block5->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallBox ), aqvec2_make( 40, -40 )), BBWest ));

  BBBlock *block6 = aqcreate( &BBBlockType );
  block6->aabb = aqaabb_make( 0, 60, -60, 0 );
  BBBlockSide block6Sides[4] = {
    BBBlockAlleySide, BBBlockClosedSide, BBBlockClosedSide, BBBlockAlleySide
  };
  memcpy( block6->sides, block6Sides, sizeof( block6Sides ));
  AQList_push( block6->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 0, 0 )), BBEast ));
  AQList_push( block6->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 40, 0 )), BBWest ));
  AQList_push( block6->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallBox ), aqvec2_make( 40, -20 )), BBWest ));
  AQList_push( block6->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallRoom ), aqvec2_make( 0, -40 )), BBNorth ));
  AQList_push( block6->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallBox ), aqvec2_make( 20, -40 )), BBWest ));
  AQList_push( block6->rooms, (AQObj *) BBRoom_rotateTo( BBRoom_moveTo( BBRoom_clone( smallBox ), aqvec2_make( 40, -40 )), BBWest ));

  // Static city.
  _BBCity_setBlock( self,
    BBBlock_rotateTo( BBBlock_moveTo( BBBlock_clone( block5 ), aqvec2_make( -120, 120 )), BBEast )
  );
  _BBCity_setBlock( self,
    BBBlock_rotateTo( BBBlock_moveTo( BBBlock_clone( block3 ), aqvec2_make( -60, 120 )), BBWest )
  );
  _BBCity_setBlock( self,
    BBBlock_rotateTo( BBBlock_moveTo( BBBlock_clone( block6 ), aqvec2_make( 0, 120 )), BBWest )
  );

  _BBCity_setBlock( self,
    BBBlock_rotateTo( BBBlock_moveTo( BBBlock_clone( block1 ), aqvec2_make( -120, 60 )), BBSouth )
  );
  _BBCity_setBlock( self,
    BBBlock_rotateTo( BBBlock_moveTo( BBBlock_clone( block2 ), aqvec2_make( -60, 60 )), BBSouth )
  );
  _BBCity_setBlock( self,
    BBBlock_rotateTo( BBBlock_moveTo( BBBlock_clone( block2 ), aqvec2_make( 0, 60 )), BBSouth )
  );
  _BBCity_setBlock( self,
    BBBlock_rotateTo( BBBlock_moveTo( BBBlock_clone( block1 ), aqvec2_make( 60, 60 )), BBSouth )
  );

  _BBCity_setBlock( self, BBBlock_rotateTo( BBBlock_moveTo( BBBlock_clone( block1 ), aqvec2_make( -120, 0 )), BBNorth ));
  _BBCity_setBlock( self,
    BBBlock_moveTo( BBBlock_clone( block2 ), aqvec2_make( -60, 0 ))
  );
  _BBCity_setBlock( self, BBBlock_rotateTo( BBBlock_clone( block1 ), BBNorth ));
  _BBCity_setBlock( self,
    BBBlock_moveTo( BBBlock_clone( block2 ), aqvec2_make( 60, 0 ))
  );

  _BBCity_setBlock( self,
    BBBlock_rotateTo( BBBlock_moveTo( BBBlock_clone( block5 ), aqvec2_make( -120, -60 )), BBEast )
  );
  _BBCity_setBlock( self,
    BBBlock_moveTo( BBBlock_clone( block3 ), aqvec2_make( -60, -60 ))
  );
  _BBCity_setBlock( self,
    BBBlock_rotateTo(
      BBBlock_moveTo( BBBlock_clone( block4 ), aqvec2_make( 0, -60 )),
      BBWest
    )
  );
  _BBCity_setBlock( self,
    BBBlock_moveTo( BBBlock_clone( block3 ), aqvec2_make( 60, -60 ))
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
    aqvec2_make( self->citySize / 2 * 60, self->citySize / 2 * 60 - 60 )
  );

  int x = floor( position.x / 60 );
  int y = floor( position.y / 60 );

  AQList_push( self->blocks, (AQObj *) block );
  self->blockMap[ self->citySize * y + x ] = block;
}

AQTYPE_INIT_DONE( BBCity );
