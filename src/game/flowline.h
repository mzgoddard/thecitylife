#ifndef FLOWLINE_H_NQDYYA51
#define FLOWLINE_H_NQDYYA51

#include "src/obj/index.h"
#include "src/pphys/index.h"

// Line of trigger particles that apply acceleration in their direction.
extern AQType AQFlowLineType;

typedef struct AQFlowLine {
  AQObj object;

  int numPoints;
  int pointsCapacity;
  aqvec2 *points;

  AQDOUBLE minPointDistance;
  AQDOUBLE radius;
  AQDOUBLE force;

  AQWorld *world;
  AQList *particles;
} AQFlowLine;

void AQFlowLine_addPoint( AQFlowLine *, aqvec2 );
void AQFlowLine_clearPoints( AQFlowLine * );

void AQFlowLine_createParticles( AQFlowLine *, AQWorld * );
void AQFlowLine_destroyParticles( AQFlowLine * );

#endif /* end of include guard: FLOWLINE_H_NQDYYA51 */
