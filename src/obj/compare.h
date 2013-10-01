#ifndef COMPARE_H_SRWJ081F
#define COMPARE_H_SRWJ081F

#include "./obj.h"

extern AQInterfaceId AQCompareId;

typedef struct AQCompareInterface {
  const char *name;

  int (*compare)( void *, void * );
} AQCompareInterface;

int aqcompare( void *, void * );

#endif /* end of include guard: COMPARE_H_SRWJ081F */
