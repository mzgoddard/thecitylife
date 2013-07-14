#ifndef LOOP_H_U9FFRBY
#define LOOP_H_U9FFRBY

#include "src/obj/index.h"
#include "src/pphys/index.h"

void AQLoop_boot();

AQWorld * AQLoop_world();

void AQLoop_once( void (*fn)( void *ctx ), void *ctx );

void AQLoop_addUpdater( void * );
void AQLoop_removeUpdater( void * );

void AQLoop_step( AQDOUBLE dt );

#endif /* end of include guard: LOOP_H_U9FFRBY */
