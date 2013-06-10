#include <stdio.h>
#include <stdlib.h>

#include "test/runner/resultformatter.h"
#include "test/runner/runner.h"

void DotPrintSuite(ResultFormatter *f, Suite *suite) {
  printf( "\n\x1b[34m[%s]\x1b[0m", suite->name );
}

void DotPrintFunc(ResultFormatter *f, FuncWrapper *wrapper) {
  printf( "(%s)", wrapper->name );
}

void DotPrintResult(ResultFormatter *f, Result *result) {
  printf( result->success ? "\x1b[32m.\x1b[0m" : "\x1b[31mF\x1b[0m" );
}

void DotPrintReport(ResultFormatter *f) {
  printf( "\n" );
}

ResultFormatter *DotFormatter_new() {
  ResultFormatter *formatter = malloc( sizeof( ResultFormatter ));
  *formatter = (ResultFormatter) {
    (PrintSuiteTitle) DotPrintSuite,
    (PrintFuncWrapper) DotPrintFunc,
    (PrintResult) DotPrintResult,
    (PrintReport) DotPrintReport
  };
  return formatter;
}

ResultFormatter *MessageFormatter_new() {
  return NULL;
}
