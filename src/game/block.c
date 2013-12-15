#include "src/game/block.h"

BBBlock * BBBlock_init( BBBlock *self ) {
  aqzero( self );
  self->rooms = aqinit( aqalloc( &AQListType ));
  self->items = aqinit( aqalloc( &AQListType ));
  self->pathNodes = aqinit( aqalloc( &AQListType ));
  return self;
}

BBBlock * BBBlock_done( BBBlock *self ) {
  aqrelease( self->rooms );
  aqrelease( self->items );
  aqrelease( self->pathNodes );
  return self;
}

void _BBBlock_cloneRoom( AQObj *self, void *ctx ) {
  AQList_push( (AQList *) ctx, (AQObj *) BBRoom_clone( (BBRoom *) self ));
}

// void _BBBlock_cloneItem( BBItem *self, void *ctx ) {
//   AQList_push( (AQList *) ctx, (AQObj *) BBItem_clone( self ));
// }

void _BBBlock_clonePathNode( AQObj *self, void *ctx ) {
  AQList_push(
    (AQList *) ctx, (AQObj *) BBPathNode_clone( (BBPathNode *) self )
  );
}

BBBlock * BBBlock_clone( BBBlock *original ) {
  BBBlock *clone = aqcreate( &BBBlockType );

  AQList_iterate( original->rooms, _BBBlock_cloneRoom, clone->rooms );
  // AQList_iterate( original->items, _BBBlock_cloneItem, clone->items );
  AQList_iterate(
    original->pathNodes, _BBBlock_clonePathNode, clone->pathNodes
  );

  return clone;
}

BBBlock * BBBlock_rotateTo( BBBlock *self, BBBlockRotation face ) {
  return self;
}

void _BBBlock_moveRoom( BBRoom *room, aqvec2 *diff ) {
  BBRoom_move( room, *diff );
}

void _BBBlock_movePathNode( BBPathNode *pathNode, aqvec2 *diff ) {
  BBPathNode_move( pathNode, *diff );
}

BBBlock * BBBlock_move( BBBlock *self, aqvec2 tl ) {
  aqvec2 tlDiff = aqvec2_sub( tl, aqaabb_tlvec2( self->aabb ));

  self->aabb = aqaabb_translate( self->aabb, tlDiff );

  AQList_iterate( self->rooms, (AQList_iterator) _BBBlock_moveRoom, &tlDiff );
  AQList_iterate(
    self->pathNodes, (AQList_iterator) _BBBlock_movePathNode, &tlDiff
  );

  return self;
}

void BBBlock_addToWorld( BBBlock *self, AQWorld *world ) {
  self->world = aqretain( world );
  AQList_iterate( self->rooms, (AQList_iterator) BBRoom_addToWorld, world );
}

void BBBlock_removeFromWorld( BBBlock *self, AQWorld *world ) {
  AQList_iterate(
    self->rooms, (AQList_iterator) BBRoom_removeFromWorld, world
  );
  aqrelease( self->world );
  self->world = NULL;
}

AQTYPE_INIT_DONE( BBBlock );
