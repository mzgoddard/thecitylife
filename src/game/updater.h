#ifndef UPDATER_H_XU9CTW7Q
#define UPDATER_H_XU9CTW7Q

#include "src/obj/index.h"
#include "src/pphys/index.h"

static char * SLUpdaterId = "SLUpdater";

typedef struct SLUpdaterInterface {
  char *name;

  void (*update)( void *, AQDOUBLE dt );
} SLUpdaterInterface;

void SLUpdater_addToList( AQList *, void * );
void SLUpdater_removeFromList( AQList *, void * );
void SLUpdater_iterateList( AQList *, AQDOUBLE dt );

#endif /* end of include guard: UPDATER_H_XU9CTW7Q */
