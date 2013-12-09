#include <stdlib.h>

#include "src/obj/index.h"

#include "test/runner/runner.h"

void test_number_compare( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  AQObj *a = aqint( 1 );
  AQObj *aa = aqint( 1 );
  AQObj *b = aqint( 2 );
  AQObj *af = aqdouble( 1.0 );
  AQObj *bf = aqdouble( 2.0 );

  ok( aqcompare( a, a ) == 0, "comparing the same number object is equal" );
  ok( aqcompare( a, aa ) == 0, "two numbers of the same value are equal" );
  ok( aqcompare( a, b ) < 0, "1 is less than 2" );
  ok( aqcompare( b, a ) > 0, "2 is greater than 1" );
  ok( aqcompare( af, bf ) < 0, "1 is less than 2" );
  ok( aqcompare( bf, af ) > 0, "2 is greater than 1" );

  aqfree( pool );
}

void suite_obj_number() {
  suite( "obj/number" );
  test( "compare", test_number_compare );
}
