#include "test/runner/runner.h"

extern void suite_obj_obj();
extern void suite_obj_list();
extern void suite_obj_dictmap();
extern void suite_obj_string();
extern void suite_obj_number();
extern void suite_obj_interfaceptr();

void suite_obj() {
  suite( "obj" );
  suite_obj_obj();
  suite_obj_list();
  suite_obj_dictmap();
  suite_obj_string();
  suite_obj_number();
  suite_obj_interfaceptr();
}
