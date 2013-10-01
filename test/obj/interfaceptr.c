#include <stdlib.h>
#include <stddef.h>

#include "src/obj/index.h"

#include "test/runner/runner.h"

void test_interfaceptr_call( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  AQDictMap *dict = aqcreate( &AQDictMapType );
  AQInterfacePtr *map = aqcastptr( dict, AQMapId );

  AQInterfacePtr_call2(
    map, offsetof( AQMapInterface, set ), aqstr( "hello" ), aqstr( "world" )
  );

  ok( AQList_length( dict->pairList ) == 1, "one object stored" );
  ok( AQInterfacePtr_call1(
    map, offsetof( AQMapInterface, get ), aqstr( "hello" )
  ) != NULL, "returns non-null" );
  ok(
    aqcompare( AQInterfacePtr_call1(
      map, offsetof( AQMapInterface, get ), aqstr( "hello" )
    ), aqstr( "world" ) ) == 0,
    "returns value equals \"world\""
  );

  aqfree( pool );
}

void suite_obj_interfaceptr() {
  suite( "obj/interfaceptr" );
  test( "call", test_interfaceptr_call );
}
