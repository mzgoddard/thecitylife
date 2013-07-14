#include <assert.h>

#include "src/game/updater.h"

char SLUpdaterId[] = "SLUpdater";

void _SLUpdate_iterator( AQObj *object, void *ctx ) {
  SLUpdaterInterface *interface = aqcast( object, SLUpdaterId );
  assert( interface && interface->update );
  interface->update( object, *(AQDOUBLE *) ctx );
}

void SLUpdater_addToList( AQList *list, void *object ) {
  SLUpdaterInterface *interface = aqcast( object, (const char *)&SLUpdaterId );
  if ( interface ) {
    AQList_push( list, object );
  }
}

void SLUpdater_removeFromList( AQList *list, void *object ) {
  SLUpdaterInterface *interface = aqcast( object, SLUpdaterId );
  if ( interface ) {
    AQList_remove( list, object );
  }
}

void SLUpdater_iterateList( AQList *list, AQDOUBLE dt ) {
  AQList_iterate( list, _SLUpdate_iterator, &dt );
}
