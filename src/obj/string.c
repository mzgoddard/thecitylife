#include <stdlib.h>
#include <string.h>

#include "src/obj/string.h"

AQString * AQString_init( AQString *self ) {
  self->size = 0;
  self->value = NULL;
  return self;
}

AQString * AQString_done( AQString *self ) {
  if ( self->value ) {
    free( self->value );
  }
  return self;
}

AQString * aqstr( char *value ) {
  AQString *self = aqcreate( &AQStringType );
  self->size = strlen( value );
  self->value = malloc( sizeof(char) * self->size );
  strncpy( self->value, value, self->size );
  return self;
}

AQString * aqrep( AQObj *object ) {
  AQStringifyInterface *interface =
    (AQStringifyInterface *) aqcast( object, AQStringifyInterfaceId );
  if ( interface ) {
    return interface->toString( object );
  } else {
    return NULL;
  }
}

// AQString * AQString_concat( AQString *a, AQString *b ) {
//   char *
//   return aqstr( )
// }

// AQString * AQString_format(AQString *, ...);

const char * AQString_cstr( AQString *self ) {
  return self->value;
}

AQTYPE_INIT_DONE( AQString );
