#ifndef WATERTEST_H_7CD7W2LH
#define WATERTEST_H_7CD7W2LH

#include "defines.h"

#define kParticleCorrection 0.5

void initWaterTest();
void stepInputWaterTest();
void stepWaterTest(float dt);
void setWaterTestGravity(float gravity[3]);
void drawWaterTest();

void setGetTicksFunction( unsigned int (*)() );

void pauseSpaceLeaper();
void resumeSpaceLeaper();
void setSpaceLeaperEndCallback( void (*)() );
void setSpaceLeaperVisitedCallback( void (*)( unsigned int ) );

#endif /* end of include guard: WATERTEST_H_7CD7W2LH */
