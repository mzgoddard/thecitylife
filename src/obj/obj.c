#include <stdlib.h>

#include "obj.h"

AQReleasePool *currentPool = NULL;

void * AQObj_init( AQObj *self ) {
  return self;
}

void * AQObj_done( AQObj *self ) {
  return self;
}

struct AQInterface * AQObj_getInterface( AQObj * self, char *interface ) {
  return NULL;
}

void * aqalloc( AQType *st ) {
  void *obj = malloc( st->size );
  *((AQObj *) obj ) = (AQObj) {
    st, // type
    1, // refCount
    NULL // pool
  };
  return obj;
}

void aqfree( void *self ) {
  if ( !self ) { return; }
  ((AQObj *) self )->refCount = 0;
  free( ((AQObj *) self )->type->done( self ));
}

void * aqinit( void *self ) {
  return ((AQObj *) self )->type->init( self );
}

void * aqdone( void *self ) {
  return ((AQObj *) self )->type->done( self );
}

void * aqretain( void *self ) {
  ((AQObj *) self )->refCount++;
  return self;
}

void * aqrelease( void *self ) {
  if ( !self ) {
    return NULL;
  }

  ((AQObj *) self )->refCount--;
  if ( ((AQObj *) self )->refCount <= 0 ) {
    aqfree( self );
    return NULL;
  }

  return self;
}

void * aqcreate( AQType *type ) {
  return aqautorelease( aqinit( aqalloc( type )));
}

AQInterface * aqcast( void *self, char *interface ) {
  return ((AQObj *) self )->type->getInterface( self, interface );
}

typedef struct poolnode {
  AQObj *item;
  struct poolnode *next;
} poolnode;

struct AQReleasePool {
  AQObj obj;

  poolnode *headNode;
  poolnode *tailNode;
  struct AQReleasePool *childPool;
  struct AQReleasePool *parentPool;
};

AQReleasePool * AQReleasePool_init( struct AQReleasePool *self ) {
  self->headNode = NULL;
  self->tailNode = NULL;
  self->childPool = NULL;

  self->parentPool = (struct AQReleasePool *) currentPool;
  if ( currentPool ) {
    ((struct AQReleasePool *) currentPool )->childPool = self;
  }

  currentPool = (AQReleasePool *) self;

  return (AQReleasePool *) self;
}

AQReleasePool * AQReleasePool_done( struct AQReleasePool *self ) {
  aqfree( self->childPool );

  poolnode *node = self->headNode;
  while ( node ) {
    poolnode *next = node->next;
    aqrelease( node->item );
    free( node );
    node = next;
  }

  if ( self->parentPool ) {
    self->parentPool->childPool = NULL;
  }
  currentPool = (AQReleasePool *) self->parentPool;

  return (AQReleasePool *) self;
}

AQReleasePool * AQReleasePool_create() {
  return aqcreate( &AQReleasePoolType );
}

struct AQReleasePool * AQReleasePool_getPool() {
  return (struct AQReleasePool *) currentPool;
}

void AQReleasePool_addObj( struct AQReleasePool *self, AQObj *obj ) {
  if ( !self ) { return; }

  poolnode *node = malloc( sizeof( poolnode ));
  node->item = obj;
  node->next = NULL;

  if ( !self->headNode ) {
    self->headNode = self->tailNode = node;
  } else {
    self->tailNode->next = node;
    self->tailNode = node;
  }
}

void * aqautorelease( void *self ) {
  AQReleasePool_addObj( AQReleasePool_getPool(), (AQObj *) self );
  return self;
}

///
// Initialize types.
AQTYPE(AQObj);
AQTYPE_ALL(AQReleasePool,
  sizeof(struct AQReleasePool),
  NULL,
  AQReleasePool_init,
  AQReleasePool_done,
  AQObj_getInterface
);

void aqobj_init() {}
