#include <stdlib.h>

#include "src/game/pathnode.h"

BBPathNode * BBPathNode_init( BBPathNode *self ) {
  aqzero( self );
  self->neighbors = aqinit( aqalloc( &AQListType ));
  return self;
}

BBPathNode * BBPathNode_done( BBPathNode *self ) {
  aqrelease( self->neighbors );
  return self;
}

BBPathNode * BBPathNode_create( aqvec2 position ) {
  BBPathNode *self = aqcreate( &BBPathNodeType );
  self->position = position;
  return self;
}

void _BBPathNode_copyLink( AQObj *pathNode, void *ctx ) {
  AQList_push( (AQList *) ctx, pathNode );
}

BBPathNode * BBPathNode_clone( BBPathNode *original ) {
  BBPathNode *clone = aqcreate( &BBPathNodeType );

  clone->position = original->position;
  AQList_iterate( original->neighbors, _BBPathNode_copyLink, clone->neighbors );

  return clone;
}

void BBPathNode_move( BBPathNode *pathNode, aqvec2 diff ) {
  pathNode->position = aqvec2_add( pathNode->position, diff );
}

AQTYPE_INIT_DONE( BBPathNode );
