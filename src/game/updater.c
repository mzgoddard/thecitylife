#include "src/game/updater.h"

void _SLUpdate_iterator( AQObj *object, void *ctx ) {
  SLUpdaterInterface *interface = aqcast( object, SLUpdaterId );
  interface->update( object, *(AQDOUBLE *) ctx );
}

void SLUpdater_addToList( AQList *list, void *object ) {
  SLUpdaterInterface *interface = aqcast( object, SLUpdaterId );
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