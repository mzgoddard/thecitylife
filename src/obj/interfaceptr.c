#include <stdlib.h>

#include "src/obj/interfaceptr.h"

AQInterfacePtr * AQInterfacePtr_init( AQInterfacePtr *self ) {
  self->context = NULL;
  self->interface = NULL;
  return self;
}

AQInterfacePtr * AQInterfacePtr_done( AQInterfacePtr *self ) {
  aqrelease( self->context );
  return self;
}

AQInterfacePtr * AQInterfacePtr_create( AQObj *ctx, AQInterface *interface ) {
  AQInterfacePtr *self = aqcreate( &AQInterfacePtrType );
  self->context = aqretain( ctx );
  self->interface = interface;
  return self;
}

void * AQInterfacePtr_call0( AQInterfacePtr *self, int fnoffset ) {
  return (
    (void *(*)(void *)) (
      (void **) self->interface
    )[ fnoffset / sizeof(void *) ]
  )( self->context );
}

void * AQInterfacePtr_call1(
  AQInterfacePtr *self, int fnoffset, void *arg0
) {
  return (
    (void *(*)(void *, void *)) (
      (void **) self->interface
    )[ fnoffset / sizeof(void *) ]
  )( self->context, arg0 );
}

void * AQInterfacePtr_call2(
  AQInterfacePtr *self, int fnoffset, void *arg0, void *arg1
) {
  return (
    (void *(*)(void *, void *, void *)) (
      (void **) self->interface
    )[ fnoffset / sizeof(void *) ]
  )( self->context, arg0, arg1 );
}

AQInterfacePtr * aqcastptr( void *obj, const char *id ) {
  void *interface = aqcast( obj, id );
  if ( interface ) {
    return AQInterfacePtr_create( obj, interface );
  }
  return NULL;
}

AQTYPE_INIT_DONE( AQInterfacePtr );
