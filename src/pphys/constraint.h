#ifndef CONSTRAINT_H_C30KLFEJ
#define CONSTRAINT_H_C30KLFEJ

#include "src/obj/obj.h"
#include "src/pphys/world.h"

extern AQInterfaceId AQConstraintId;

typedef struct AQConstraintInterface {
  char *name;

  void (*setWorld)( void *, void *world );
  void (*update)( void * );
} AQConstraintInterface;

#endif /* end of include guard: CONSTRAINT_H_C30KLFEJ */
