#include <stdlib.h>
#include <string.h>

#include "./array.h"

AQArray * AQArray_init( AQArray *self ) {
  memset( &self->length, 0, sizeof( AQArray ) - sizeof( AQObj ));
  return self;
}

void _AQArray_doneReleasor( AQObj *obj, void * ctx ) {
  aqrelease( obj );
}

AQArray * AQArray_done( AQArray *self ) {
  if ( self->items ) {
    AQArray_iterate( self, _AQArray_doneReleasor, NULL );
    free( self->items );
  }
  return self;
}

void _AQArray_copyToNewArray( AQObj *obj, void *ctx ) {
  AQArray *self = (AQArray *) ctx;
  self->items[ self->length++ ] = obj;
}

void _AQArray_increaseCapacity( AQArray *self, int newCapacity ) {
  struct AQArray tmpArray = {
    (AQObj) { NULL, 0, NULL },
    0,
    newCapacity,
    calloc( newCapacity, sizeof( AQObj * ))
  };

  if ( self->items ) {
    AQArray_iterate( self, _AQArray_copyToNewArray, &tmpArray );

    AQObj **oldItems = self->items;
    free( oldItems );
  }

  self->capacity = newCapacity;
  self->items = tmpArray.items;
}

AQArray * AQArray_create( int capacity ) {
  AQArray *self = aqcreate( &AQArrayType );
  _AQArray_increaseCapacity( self, capacity );
  return self;
}

int AQArray_indexOf( AQArray *self, AQObj *obj ) {
  int i = 0, l = self->length;
  for ( ; i < l; ++i ) {
    if ( self->items[ i ] == obj ) {
      return i;
    }
  }
  return -1;
}

AQObj * AQArray_atIndex( AQArray *self, int index ) {
  if ( index >= self->length ) {
    return NULL;
  }

  return self->items[ index ];
}

int AQArray_setIndex( AQArray *self, int index, AQObj *obj ) {
  if ( index >= self->length ) {
    return 0;
  }

  if ( self->items[ index ] ) {
    aqrelease( self->items[ index ] );
    self->items[ index ] = NULL;
  }

  if ( obj ) {
    self->items[ index ] = aqretain( obj );
  }

  return 1;
}

void _AQArray_moveItemsOne( AQObj *obj, void * ctx ) {
  AQArray *self = (AQArray *) ctx;
  self->items[ self->length++ ] = obj;
}

AQObj * AQArray_removeAt( AQArray *self, int index ) {
  if ( index >= self->length ) {
    return NULL;
  }

  int length = self->length;
  AQObj *obj = aqautorelease( self->items[ index ]);
  self->length = index;
  AQArray_iterateStartEnd(
    self, _AQArray_moveItemsOne, index + 1, length, self
  );

  return obj;
}

int AQArray_push( AQArray *self, AQObj *obj ) {
  if ( self->length == self->capacity ) {
    _AQArray_increaseCapacity( self, self->capacity + 16 );
  }

  self->items[ self->length++ ] = aqretain( obj );
  return 1;
}

AQObj * AQArray_pop( AQArray *self ) {
  return self->length ?
    aqautorelease( self->items[ --( self->length ) ]) :
    NULL;
}

int AQArray_remove( AQArray *self, AQObj *obj ) {
  int index = AQArray_indexOf( self, obj );
  if ( ~index ) {
    AQArray_removeAt( self, index );
    return 1;
  }
  return 0;
}

AQArray * AQArray_clear( AQArray *self ) {
  while ( self->length ) {
    AQArray_pop( self );
  }
  return self;
}

void AQArray_iterate( AQArray *self, AQArray_iterator itr, void * ctx ) {
  int i = 0, l = self->length;
  for ( ; i < l; ++i ) {
    itr( self->items[ i ], ctx );
  }
}

void AQArray_iterateStartEnd(
  AQArray *self, AQArray_iterator itr, int start, int end, void *ctx
) {
  int i = start, l = end;
  for ( ; i < l; ++i ) {
    itr( self->items[ i ], ctx );
  }
}

int AQArray_length( AQArray *self ) {
  return self->length;
}
int AQArray_capacity( AQArray *self ) {
  return self->capacity;
}

AQTYPE_INIT_DONE(AQArray);
