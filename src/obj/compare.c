#include "./compare.h"

AQInterfaceId AQCompareId = "AQCompare";

int aqcompare( void *a, void *b ) {
  AQCompareInterface *interface = aqcast( a, AQCompareId );
  if ( interface ) {
    return interface->compare( a, b );
  }
  return 1;
}
