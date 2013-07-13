#include <stdlib.h>

#include "test/runner/runner.h"
#include "test/runner/resultformatter.h"

#ifndef ANSI_COLOR
#define ANSI_COLOR 0
#endif

ResultFormatter *formatter;

extern void suite_obj();
extern void suite_pphys();

int main() {
  formatter = DotFormatter_new( ANSI_COLOR );

  // Attach tests.
  suite_obj();
  suite_pphys();

  // Run tests.
  runall();

  free( formatter );

  return 0;
}
