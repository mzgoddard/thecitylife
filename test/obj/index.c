#include "test/runner/runner.h"

extern void suite_obj_obj();
extern void suite_obj_list();

void suite_obj() {
  suite( "obj" );
  suite_obj_obj();
  suite_obj_list();
}
