#include "test/runner/runner.h"

extern void suite_pphys_math();
extern void suite_pphys_particle();
extern void suite_pphys_ddvt();
extern void suite_pphys_world();
extern void suite_pphys_stick();
extern void suite_pphys_ray();

void suite_pphys() {
  suite( "pphys" );
  suite_pphys_math();
  suite_pphys_particle();
  suite_pphys_ddvt();
  suite_pphys_world();
  suite_pphys_stick();
  suite_pphys_ray();
}
