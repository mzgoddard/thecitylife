#ifndef VIEW_H_FCQQENFV
#define VIEW_H_FCQQENFV

#include "src/obj/index.h"

extern char AQViewId[];
extern char AQViewableId[];

typedef struct AQViewInterface {
  const char * name;

  void (*draw)( void * );
} AQViewInterface;

typedef struct AQViewableInterface {
  const char *name;

  void * (*view)( void * );
} AQViewableInterface;

void AQView_addToList( AQList *, void * );
void AQView_removeFromList( AQList *, void * );
void AQView_iterateList( AQList * );

#endif /* end of include guard: VIEW_H_FCQQENFV */
