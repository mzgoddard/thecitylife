#include <stdlib.h>

#include "src/obj/index.h"

#include "test/runner/runner.h"

void test_string_compare( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  AQString *a = aqstr( "string" );
  AQString *b = aqstr( "string" );
  AQString *hello = aqstr( "hello" );
  AQString *world = aqstr( "world" );

  ok( aqcompare( a, a ) == 0, "comparing the same string object is equal" );
  ok( aqcompare( a, b ) == 0, "two strings of the same value are equal" );
  ok( aqcompare( hello, world ) < 0, "hello is less than world" );
  ok( aqcompare( world, hello ) > 0, "world is greater than hello " );

  aqfree( pool );
}

void suite_obj_string() {
  suite( "obj/string" );
  test( "compare", test_string_compare );
}
