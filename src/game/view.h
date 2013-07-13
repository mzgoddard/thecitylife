#ifndef VIEW_H_FCQQENFV
#define VIEW_H_FCQQENFV

#include "src/obj/index.h"

static char * AQViewId = "AQView";

typedef struct AQViewInterface {
  char *name;

  void (*draw)( void * );
} AQViewInterface;

static char * AQViewableId = "AQViewable";

typedef struct AQViewableInterface {
  char *name;

  void * (*view)( void * );
} AQViewableInterface;

void AQView_addToList( AQList *, void * );
void AQView_removeFromList( AQList *, void * );
void AQView_iterateList( AQList * );

#endif /* end of include guard: VIEW_H_FCQQENFV */
