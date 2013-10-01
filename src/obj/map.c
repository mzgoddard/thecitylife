#include <stdlib.h>

#include "./map.h"

AQInterfaceId AQMapId = "AQMap";

void * AQMap_get( void *self, void *key ) {
  AQMapInterface * interface = aqcast( self, AQMapId );
  return interface ? interface->get( self, key ) : NULL;
}

void AQMap_set( void *self, void *key, void *value ) {
  AQMapInterface * interface = aqcast( self, AQMapId );
  if ( interface ) {
    interface->set( self, key, value );
  }
}

void AQMap_unset( void *self, void *key ) {
  AQMapInterface * interface = aqcast( self, AQMapId );
  if ( interface ) {
    interface->unset( self, key );
  }
}
