#include <stdlib.h>

#include "src/obj/index.h"

#include "test/runner/runner.h"

void test_list_new( Result **result ) {
  AQList *list = aqinit( aqalloc( &AQListType ));
  ok( ((AQObj *) list)->type == &AQListType, "is AQList" );
  aqrelease( list );
  ok( ((AQObj *) list)->refCount == 0, "freed" );
}

void test_list_retains( Result **result ) {
  AQList *list = aqinit( aqalloc( &AQListType ));

  AQObj *a = aqretain( aqinit( aqalloc( &AQObjType )));
  AQList_push( list, a );
  ok( a->refCount == 3, "ref'd by list" );

  aqrelease( a );
  ok( a->refCount == 2, "still ref'd by list" );

  ok( aqrelease( list ) == NULL, "list freed" );
  ok( a->refCount == 1, "released from list" );
  aqrelease( a );
}

void test_list_remove_order( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  AQList *list = aqinit( aqalloc( &AQListType ));

  AQObj *a = aqcreate( &AQObjType );
  AQList_push( list, a );

  AQObj *b = aqcreate( &AQObjType );
  AQList_push( list, b );

  AQObj *c = aqcreate( &AQObjType );
  AQList_push( list, c );

  AQReleasePool *pool2 = AQReleasePool_create();
  AQList_remove( list, b );
  ok( a->refCount == 2, "obj a retained" );
  ok( a->refCount == 2, "ojb b should be autoreleased later" );
  ok( c->refCount == 2, "obj c retained" );

  aqrelease( list );

  ok( a->refCount == 1, "obj a freed" );
  ok( b->refCount == 2, "obj b to be released" );
  ok( c->refCount == 1, "obj c freed" );

  aqfree( pool2 );

  ok( b->refCount == 1, "obj b freed" );

  aqfree( pool );
}

void test_list_push_pop( Result **result ) {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
  AQList *list = aqinit( aqalloc( &AQListType ));

  ok( AQList_length( list ) == 0, "" );

  AQList_push( list, aqcreate( &AQObjType ));
  ok( AQList_length( list ) == 1, "" );

  AQList_pop( list );
  ok( AQList_length( list ) == 0, "" );

  AQObj *a, *b, *c;
  AQList_push( list, a = aqcreate( &AQObjType ));
  ok( AQList_length( list ) == 1, "" );
  AQList_push( list, b = aqcreate( &AQObjType ));
  ok( AQList_length( list ) == 2, "" );
  AQList_push( list, c = aqcreate( &AQObjType ));
  ok( AQList_length( list ) == 3, "" );

  aqfree( pool );
  pool = aqinit( aqalloc( &AQReleasePoolType ));

  ok( c == AQList_pop( list ), "" );
  ok( AQList_length( list ) == 2, "" );
  ok( b == AQList_pop( list ), "" );
  ok( AQList_length( list ) == 1, "" );
  ok( a == AQList_pop( list ), "" );
  ok( AQList_length( list ) == 0, "" );

  AQList_push( list, a = aqcreate( &AQObjType ));
  AQList_push( list, b = aqcreate( &AQObjType ));
  ok( b == AQList_removeAt( list, 1 ), "" );
  ok( AQList_length( list ) == 1, "" );
  ok( a == AQList_pop( list ), "" );
  ok( AQList_length( list ) == 0, "" );

  aqfree( pool );
}

void suite_obj_list() {
  suite( "obj/list" );
  test( "new", test_list_new );
  test( "retains", test_list_retains );
  test( "remove order", test_list_remove_order );
  test( "push pop", test_list_push_pop );
}
