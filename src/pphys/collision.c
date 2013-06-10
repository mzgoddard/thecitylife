#include <stdlib.h>

#include "./particle.h"

aqcollision * aqcollision_create() {
  aqcollision *col = malloc( sizeof( aqcollision ));
  col->next = NULL;
  aqcollision_clear( col );
  return col;
}

aqcollision * aqcollision_done( aqcollision *col ) {
  if ( col->next ) {
    free( aqcollision_done( col->next ));
  }
  return col;
}

aqcollision * aqcollision_pop( aqcollision *col ) {
  if ( !col ) {
    return aqcollision_create();
  } else if ( !col->a ) {
    return col;
  } else if ( col->next ) {
    return aqcollision_pop( col->next );
  } else {
    col->next = aqcollision_create();
    return col->next;
  }
}

void aqcollision_clear( aqcollision *col ) {
  while ( col && col->a ) {
    col->a = NULL;
    col = col->next;
  }
}

void aqcollision_iterate(
  aqcollision *col, aqcollision_iterator iterator, void * ctx
) {
  while ( col && col->a ) {
    iterator( col, ctx );
    col = col->next;
  }
}
