#include <stdlib.h>

#include "src/obj/index.h"

#include "test/runner/runner.h"

void test_dictmap_set_get( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  AQDictMap *dict = aqcreate( &AQDictMapType );

  AQMap_set( dict, aqstr( "key" ), aqstr( "value" ) );
  ok( AQList_length( dict->pairList ) == 1, "one object stored" );
  ok(
    aqcompare(
      ((AQDictPair *) AQList_at( dict->pairList, 0 ) )->key,
      aqstr( "key" )
    ) == 0,
    "stored key equals \"key\""
  );

  ok( AQMap_get( dict, aqstr( "key" ) ) != NULL, "returns non-null" );

  ok(
    aqcompare( AQMap_get( dict, aqstr( "key" ) ), aqstr( "value" ) ) == 0,
    "returns value equals \"value\""
  );

  aqfree( pool );
}

void suite_obj_dictmap() {
  suite( "obj/dictmap" );
  test( "set get", test_dictmap_set_get );
}
