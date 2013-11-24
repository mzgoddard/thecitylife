#include <stdlib.h>
#include "test/runner/runner.h"
#include "test/runner/resultformatter.h"

extern ResultFormatter *formatter;

static Result **lastResult = NULL;
static Suite *headSuite = NULL;
static Suite *currentSuite = NULL;

Result * Result_new(int success, char * message) {
  Result *result = malloc( sizeof( Result ));
  result->message = message;
  result->success = success;
  result->next = NULL;
  return result;
}

void Result_delete(Result *result) {
  if ( result->next ) {
    Result_delete( result->next );
  }
  free( result );
}

Result * Result_add(Result *head, Result *item) {
  if ( head ) {
    while ( head->next ) {
      head = head->next;
    }
    head->next = item;
  }
  return item;
}

FuncWrapper * FuncWrapper_new(char * name, TestFunc func) {
  FuncWrapper *wrapper = malloc( sizeof( FuncWrapper ));
  wrapper->name = name;
  wrapper->func = func;
  wrapper->next = NULL;
  return wrapper;
}

void FuncWrapper_delete(FuncWrapper *wrapper) {
  free( wrapper );
}

FuncWrapper * FuncWrapper_add(FuncWrapper *wrapper, FuncWrapper *next) {
  if ( wrapper ) {
    FuncWrapper *tmpWrapper = wrapper;
    while( tmpWrapper && tmpWrapper->next ) {
      tmpWrapper = tmpWrapper->next;
    }
    tmpWrapper->next = next;
    return wrapper;
  } else {
    return next;
  }
}

Suite * Suite_init(Suite *suite, char *name) {
  suite->name = name;
  suite->headFunc = NULL;
  suite->headResult = NULL;
  suite->next = NULL;
  return suite;
}

Suite * Suite_addFunc(Suite *suite, char *name, TestFunc func) {
  suite->headFunc = FuncWrapper_add(
    suite->headFunc,
    FuncWrapper_new( name, func )
  );
  return suite;
}

void Suite_run(Suite *suite, Result **result) {
  formatter->printSuiteTitle( formatter, suite );

  FuncWrapper *wrapper = suite->headFunc;
  while( wrapper ) {
    formatter->printFuncWrapper( formatter, wrapper );

    lastResult = result;
    wrapper->func( result );
    wrapper = wrapper->next;
  }
}

void suite(char *name) {
  Suite *newSuite = Suite_init( malloc( sizeof( Suite )), name );

  if ( currentSuite ) {
    currentSuite->next = newSuite;
  }

  currentSuite = newSuite;

  if ( !headSuite ) {
    headSuite = currentSuite;
  }
}

void test(char *name, TestFunc func) {
  Suite_addFunc( currentSuite, name, func );
}

int ok(int test, char *message) {
  *lastResult = Result_add( *lastResult, Result_new( test, message ));
  formatter->printResult( formatter, *lastResult );
  return test;
}

void runall() {
  Suite *current = headSuite;
  Result *result = NULL;
  while( current ) {
    Suite_run( current, &result );
    current = current->next;
  }
  formatter->printReport( formatter );
}
