#include <stdlib.h>

#include "src/obj/dictmap.h"
#include "src/obj/compare.h"
#include "src/obj/map.h"

static AQMapInterface _AQDictMap_MapInterface = {
  AQMapId,
  (void * (*)( void *, void * )) AQDictMap_get,
  (void (*)( void *, void *, void * )) AQDictMap_set,
  (void (*)( void *, void * )) AQDictMap_unset
};

AQDictPair * AQDictPair_init( AQDictPair *self ) {
  self->key = NULL;
  self->value = NULL;
  return self;
}

AQDictPair * AQDictPair_done( AQDictPair *self ) {
  aqrelease( self->key );
  aqrelease( self->value );
  return self;
}

AQDictPair * AQDictPair_create( void *key, void *value ) {
  AQDictPair *pair = aqcreate( &AQDictPairType );
  pair->key = aqretain( key );
  pair->value = aqretain( value );
  return pair;
}

AQDictMap * AQDictMap_init( AQDictMap *self ) {
  self->pairList = aqinit( aqalloc( &AQListType ) );
  return self;
}

AQDictMap * AQDictMap_done( AQDictMap *self ) {
  aqrelease( self->pairList );
  return self;
}

void * AQDictMap_getInterface( AQDictMap *self, AQInterfaceId id ) {
  if ( id == AQMapId ) {
    return &_AQDictMap_MapInterface;
  }
  return NULL;
}

AQDictMap * AQDictMap_create() {
  AQDictMap *map = aqcreate( &AQDictMapType );
  return map;
}

int _AQDictMap_listGetIterator( AQObj *obj, void *ctx ) {
  return aqcompare( ( (AQDictPair *) obj )->key, ctx ) == 0;
}

void * AQDictMap_get( AQDictMap *self, void *key ) {
  AQDictPair *pair = (AQDictPair *) AQList_find(
    self->pairList, _AQDictMap_listGetIterator, key
  );
  return pair ? pair->value : NULL;
}

void AQDictMap_set( AQDictMap *self, void *key, void *value ) {
  AQDictPair *pair = (AQDictPair *) AQList_find(
    self->pairList, _AQDictMap_listGetIterator, key
  );
  if ( pair ) {
    aqrelease( pair->value );
    pair->value = aqretain( value );
  } else {
    AQList_push( self->pairList, (AQObj *) AQDictPair_create( key, value ) );
  }
}

void AQDictMap_unset( AQDictMap *self, void *key ) {
  int index = AQList_findIndex(
    self->pairList, _AQDictMap_listGetIterator, key
  );

  if ( index != -1 ) {
    AQList_removeAt( self->pairList, index );
  }
}

AQTYPE_INIT_DONE( AQDictPair );
AQTYPE_INIT_DONE_GETINTERFACE( AQDictMap );
