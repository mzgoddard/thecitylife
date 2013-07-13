#ifndef STRING_H_ONH9DEJ1
#define STRING_H_ONH9DEJ1

#include "obj.h"

extern AQType AQStringType;

typedef struct AQString {
  AQObj object;
  unsigned int size;
  char *value;
} AQString;

// Create a string at compile time.
#define AQSTR(str) (AQString *) &{ \
  &AQStringType, \
  1, \
  NULL, \
  sizeof( str ), \
  str \
};

static char * AQStringifyInterfaceId = "AQStringifyInterface";

typedef struct AQStringifyInterface {
  char *name;

  AQString * (*toString)( AQObj * );
} AQStringifyInterface;

AQString * aqstr(char *);
AQString * aqrep(AQObj *);
AQString * AQString_concat(AQString *, AQString *);
AQString * AQString_format(AQString *, ...);
const char * AQString_cstr(AQString *);

#endif /* end of include guard: STRING_H_ONH9DEJ1 */
