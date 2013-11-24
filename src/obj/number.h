#ifndef NUMBER_H_ORKC0WQL
#define NUMBER_H_ORKC0WQL

#include "src/obj/obj.h"

extern AQInterfaceId AQNumberId;

typedef struct AQNumberInterface {
  char *name;

  int (*asInt)( void * );
  double (*asDouble)( void * );
} AQNumberInterface;

extern AQType AQIntType;
extern AQType AQDoubleType;

void * aqint( int );
void * aqdouble( double );

int AQNumber_isNumber( void * );
int AQNumber_asInt( void * );
double AQNumber_asDouble( void * );

#endif /* end of include guard: NUMBER_H_ORKC0WQL */
