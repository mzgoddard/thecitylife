#ifndef INTERFACEPTR_H_5NAJQQNG
#define INTERFACEPTR_H_5NAJQQNG

#include "src/obj/obj.h"

extern AQType AQInterfacePtrType;

typedef struct AQInterfacePtr {
  AQObj obj;

  AQObj *context;
  AQInterface *interface;
} AQInterfacePtr;

AQInterfacePtr * AQInterfacePtr_create( AQObj *, AQInterface * );
void * AQInterfacePtr_call0( AQInterfacePtr *, int fnoffset );
void * AQInterfacePtr_call1( AQInterfacePtr *, int fnoffset, void * );
void * AQInterfacePtr_call2( AQInterfacePtr *, int fnoffset, void *, void * );
AQMethodPtr * AQInterfacePtr_methodPtr0( AQInterfacePtr *, void *fnoffset );
AQMethodPtr * AQInterfacePtr_methodPtr1(
  AQInterfacePtr *, void *fnoffset, void *
);
AQMethodPtr * AQInterfacePtr_methodPtr2(
  AQInterfacePtr *, void *fnoffset, void *, void *
);

AQInterfacePtr * aqcastptr( void *, const char *interface );

#endif /* end of include guard: INTERFACEPTR_H_5NAJQQNG */
