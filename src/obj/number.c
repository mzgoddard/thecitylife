#include <stdlib.h>

#include "./number.h"

AQInterfaceId AQNumberId = "AQNumber";

typedef struct {
  AQObj object;

  int value;
} AQInt;

typedef struct {
  AQObj object;

  double value;
} AQDouble;

int AQInt_asInt( void *_self ) {
  AQInt *self = _self;
  return self->value;
}

double AQInt_asDouble( void *_self ) {
  AQInt *self = _self;
  return self->value;
}

AQNumberInterface _AQInt_NumberInterface = {
  AQNumberId,
  AQInt_asInt,
  AQInt_asDouble
};

int AQDouble_asInt( void *_self ) {
  AQDouble *self = _self;
  return self->value;
}

double AQDouble_asDouble( void *_self ) {
  AQDouble *self = _self;
  return self->value;
}

AQNumberInterface _AQDouble_NumberInterface = {
  AQNumberId,
  AQDouble_asInt,
  AQDouble_asDouble
};

AQInt * AQInt_init( AQInt *self ) { return self; }
AQInt * AQInt_done( AQInt *self ) { return self; }
void * AQInt_getInterface( AQInt *self, AQInterfaceId id ) {
  if ( id == AQNumberId ) {
    return &_AQInt_NumberInterface;
  }
  return NULL;
}

AQDouble * AQDouble_init( AQDouble *self ) { return self; }
AQDouble * AQDouble_done( AQDouble *self ) { return self; }
void * AQDouble_getInterface( AQDouble *self, AQInterfaceId id ) {
  if ( id == AQNumberId ) {
    return &_AQDouble_NumberInterface;
  }
  return NULL;
}

void * aqint( int value ) {
  AQInt *self = aqcreate( &AQIntType );
  self->value = value;
  return self;
}

void * aqdouble( double value ) {
  AQDouble *self = aqcreate( &AQDoubleType );
  self->value = value;
  return self;
}

int AQNumber_isNumber( void *_self ) {
  AQNumberInterface *interface = aqcast( _self, AQNumberId );
  return interface ? 1 : 0;
}

int AQNumber_asInt( void *_self ) {
  AQNumberInterface *interface = aqcast( _self, AQNumberId );
  if ( interface ) {
    return interface->asInt( _self );
  }
  return 0;
}

double AQNumber_asDouble( void *_self ) {
  AQNumberInterface *interface = aqcast( _self, AQNumberId );
  if ( interface ) {
    return interface->asDouble( _self );
  }
  return 0.0;
}

AQTYPE( AQInt );
AQTYPE( AQDouble );
