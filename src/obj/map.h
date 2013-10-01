#ifndef MAP_H_IQLW7QH2
#define MAP_H_IQLW7QH2

#include "./obj.h"
#include "./list.h"

extern AQInterfaceId AQMapId;

typedef struct AQMapInterface {
  const char *name;

  void * (*get)( void *, void *key );
  void (*set)( void *, void *key, void * );
  void (*unset)( void *, void *key );
} AQMapInterface;

void * AQMap_get( void *, void *key );
void AQMap_set( void *, void *key, void * );
void AQMap_unset( void *, void *key );

#endif /* end of include guard: MAP_H_IQLW7QH2 */
