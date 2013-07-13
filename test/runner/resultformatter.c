#include <stdio.h>
#include <stdlib.h>

#include "test/runner/resultformatter.h"
#include "test/runner/runner.h"

struct DotResultFormatter {
  ResultFormatter funcs;

  char *suiteFormat;
  char *funcFormat;
  char *successFormat;
  char *failureFormat;
  char *reportFormat;
};

void DotPrintSuite(struct DotResultFormatter *f, Suite *suite) {
  const char *format = f->suiteFormat;
  printf( format, suite->name );
}

void DotPrintFunc(struct DotResultFormatter *f, FuncWrapper *wrapper) {
  printf( f->funcFormat, wrapper->name );
}

void DotPrintResult(struct DotResultFormatter *f, Result *result) {
  const char *format = result->success ? f->successFormat : f->failureFormat;
  printf( format, NULL );
}

void DotPrintReport(struct DotResultFormatter *f) {
  const char *format = f->reportFormat;
  printf( format, NULL );
}

ResultFormatter *DotFormatter_new( int ansiColor ) {
  struct DotResultFormatter *formatter = malloc( sizeof( struct DotResultFormatter ));
  formatter->funcs = (ResultFormatter) {
    (PrintSuiteTitle) DotPrintSuite,
    (PrintFuncWrapper) DotPrintFunc,
    (PrintResult) DotPrintResult,
    (PrintReport) DotPrintReport
  };

  if ( ansiColor ) {
    formatter->suiteFormat = "\n\x1b[34m[%s]\x1b[0m";
    formatter->funcFormat = "(%s)";
    formatter->successFormat = "\x1b[32m.\x1b[0m";
    formatter->failureFormat = "\x1b[31mF\x1b[0m";
    formatter->reportFormat = "\n";
  } else {
    formatter->suiteFormat = "\n[%s]";
    formatter->funcFormat = "(%s)";
    formatter->successFormat = ".";
    formatter->failureFormat = "F";
    formatter->reportFormat = "\n";
  }

  return (ResultFormatter *) formatter;
}

// void HtmlDotPrintSuite(ResultFormatter *f, Suite *suite) {
//   printf( "")
// }
//
// void HtmlDotPrintFunc(ResultFormatter *f, FuncWrapper *suite) {
//
// }
//
// void HtmlDotPrintResult(ResultFormatter *f, Result *result) {
//
// }
//
// void HtmlDotPrintReport(ResultFormatter *f) {
//
// }
//
// void HtmlDot

ResultFormatter *MessageFormatter_new() {
  return NULL;
}
