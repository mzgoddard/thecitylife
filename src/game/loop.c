#include <stdlib.h>
#include <string.h>

#include "src/game/loop.h"
#include "src/game/updater.h"

typedef struct loopfuncnode {
  void (*fn)( void *ctx );
  void *ctx;
  struct loopfuncnode *next;
} loopfuncnode;

typedef struct AQLoop {
  AQObj object;

  AQWorld *world;

  AQList *updaters;
  loopfuncnode *onceFunctions;
  loopfuncnode *nextOnceFunction;
} AQLoop;

AQLoop *_loop;

loopfuncnode * loopfuncnode_init() {
  loopfuncnode *self = malloc( sizeof(loopfuncnode) );
  memset( self, 0, sizeof(loopfuncnode) );
  return self;
}

void loopfuncnode_done( loopfuncnode *self ) {
  if ( self->next ) {
    loopfuncnode_done( self->next );
  }
  free( self );
}

loopfuncnode * loopfuncnode_add(
  loopfuncnode *head, void (*fn)( void *ctx ), void *ctx
) {
  loopfuncnode *node = head;
  for ( ; node && !node->fn && node->next; node = node->next ) {}

  if ( !node->next ) {
    node->next = loopfuncnode_init();
  }

  node->next->fn = NULL;
  node->fn = fn;
  node->ctx = ctx;

  return node->next;
}

void loopfuncnode_iterate( loopfuncnode *head ) {
  loopfuncnode *node = head;
  for ( ; node && node->fn; node = node->next ) {
    node->fn( node->ctx );
  }
}

void loopfuncnode_clear( loopfuncnode *head ) {
  head->fn = NULL;
}

AQLoop * AQLoop_init( AQLoop *self ) {
  self->world = aqinit( aqalloc( &AQWorldType ));
  self->updaters = aqinit( aqalloc( &AQListType ));
  self->onceFunctions = loopfuncnode_init();
  self->nextOnceFunction = self->onceFunctions;
  return self;
}

AQLoop * AQLoop_done( AQLoop *self ) {
  aqrelease( self->updaters );
  loopfuncnode_done( self->onceFunctions );
  return self;
}

AQTYPE_INIT_DONE( AQLoop );

void AQLoop_boot() {
  _loop = aqinit( aqalloc( &AQLoopType ));
}

AQWorld * AQLoop_world() {
  return _loop->world;
}

void AQLoop_once( void (*fn)( void *ctx ), void *ctx ) {
  _loop->nextOnceFunction = loopfuncnode_add(
    _loop->nextOnceFunction, fn, ctx
  );
}

void AQLoop_addUpdater( void *object ) {
  SLUpdater_addToList( _loop->updaters, object );
}

void AQLoop_removeUpdater( void *object ) {
  SLUpdater_removeFromList( _loop->updaters, object );
}

void AQLoop_step( AQDOUBLE dt ) {
  AQLoop *self = _loop;
  SLUpdater_iterateList( self->updaters, dt );

  loopfuncnode_iterate( self->onceFunctions );
  loopfuncnode_clear( self->onceFunctions );
  self->nextOnceFunction = self->onceFunctions;

  AQWorld_step( self->world, dt );
}
