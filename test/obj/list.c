#include "src/obj/index.h"

#include "test/runner/runner.h"

void test_list_new() {
  AQList *list = aqinit( aqalloc( &AQListType ));
  ok( ((AQObj *) list)->type == &AQListType, "is AQList" );
  aqrelease( list );
  ok( ((AQObj *) list)->refCount == 0, "freed" );
}

void test_list_retains() {
  AQList *list = aqinit( aqalloc( &AQListType ));

  AQObj *a = aqinit( aqalloc( &AQObjType ));
  AQList_push( list, a );
  ok( a->refCount == 2, "ref'd by list" );

  aqrelease( a );
  ok( a->refCount == 1, "still ref'd by list" );

  aqrelease( list );
  ok( a->refCount == 0, "freed by list" );
  ok( ((AQObj *) list)->refCount == 0, "list freed" );
}

void test_list_remove_order() {
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

void suite_obj_list() {
  suite( "obj/list" );
  test( "new", test_list_new );
  test( "retains", test_list_retains );
  test( "remove order", test_list_remove_order );
}
