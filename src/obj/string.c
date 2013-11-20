#include <stdlib.h>
#include <string.h>

#include "src/obj/string.h"
#include "src/obj/compare.h"

int AQString_compare( AQString *self, AQObj *other );

static AQCompareInterface _AQStringCompareInterface = {
  AQCompareId,
  (int (*)( void *, void * )) AQString_compare
};

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

void * AQString_getInterface( AQString *self, const char *id ) {
  if ( id == AQCompareId ) {
    return &_AQStringCompareInterface;
  }
  return NULL;
}

AQString * aqstr( char *value ) {
  AQString *self = aqcreate( &AQStringType );
  self->size = (unsigned int) strlen( value );
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

int AQString_compare( AQString *self, AQObj *_other ) {
  if ( _other->type != &AQStringType ) {
    return 1;
  }

  AQString *other = (AQString *) _other;

  return strncmp(
    self->value,
    other->value,
    self->size < other->size ? self->size : other->size
  );
}

AQTYPE_INIT_DONE_GETINTERFACE( AQString );
