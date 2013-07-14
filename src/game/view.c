#include <stdlib.h>

#include "src/game/view.h"

char AQViewId[] = "AQView";
char AQViewableId[] = "AQViewable";

void _AQView_iterator( AQObj *object, void *ctx ) {
  AQViewInterface *interface = aqcast( object, AQViewId );
  interface->draw( object );
}

void AQView_addToList( AQList *list, void *object ) {
  AQViewInterface *view = aqcast( object, AQViewId );
  if ( view ) {
    AQList_push( list, object );
    return;
  }

  AQViewableInterface *viewable = aqcast( object, AQViewableId );
  if ( viewable ) {
    AQView_addToList( list, viewable->view( object ));
  }
}

void AQView_removeFromList( AQList *list, void *object ) {
  AQViewInterface *view = aqcast( object, AQViewId );
  if ( view ) {
    AQList_remove( list, object );
    return;
  }

  AQViewableInterface *viewable = aqcast( object, AQViewableId );
  if ( viewable ) {
    AQView_removeFromList( list, viewable->view( object ));
  }
}

void AQView_iterateList( AQList *list ) {
  AQList_iterate( list, _AQView_iterator, NULL );
}
