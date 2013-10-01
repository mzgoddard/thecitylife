#ifndef DICTMAP_H_DP91WDNO
#define DICTMAP_H_DP91WDNO

#include "./obj.h"
#include "./list.h"

extern AQType AQDictPairType;

typedef struct AQDictPair {
  AQObj object;

  AQObj *key;
  AQObj *value;
} AQDictPair;

AQDictPair * AQDictPair_create( void *key, void *value );

extern AQType AQDictMapType;

typedef struct AQDictMap {
  AQObj object;

  AQList *pairList;
} AQDictMap;

AQDictMap * AQDictMap_create();
void * AQDictMap_get( AQDictMap *, void *key );
void AQDictMap_set( AQDictMap *, void *key, void *value );
void AQDictMap_unset( AQDictMap *, void *key );

#endif /* end of include guard: DICTMAP_H_DP91WDNO */
