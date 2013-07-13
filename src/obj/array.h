#ifndef ARRAY_H_Y2MZ5K4F
#define ARRAY_H_Y2MZ5K4F

#include "src/obj/obj.h"

extern AQType AQArrayType;

typedef struct AQArray {
  AQObj object;

  int length;
  int capacity; 
  AQObj **items;
} AQArray;

typedef void (*AQArray_iterator)( AQObj *, void * ctx );

AQArray * AQArray_create( int capacity );

int AQArray_indexOf( AQArray *, AQObj * );
int AQArray_setIndex( AQArray *, int index, AQObj * );
AQObj * AQArray_removeAt( AQArray *, int index );
AQObj * AQArray_atIndex( AQArray *, int index );
int AQArray_push( AQArray *, AQObj * );
AQObj * AQArray_pop( AQArray * );
int AQArray_remove( AQArray *, AQObj * );
AQArray * AQArray_clear( AQArray * );
void AQArray_iterate( AQArray *, AQArray_iterator, void * ctx );
void AQArray_iterateStartEnd( AQArray *, AQArray_iterator, int, int, void * );

int AQArray_length( AQArray * );
int AQArray_capacity( AQArray * );

#endif /* end of include guard: ARRAY_H_Y2MZ5K4F */
