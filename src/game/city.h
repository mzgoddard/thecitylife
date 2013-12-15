#ifndef CITY_H_N4OB1GLT
#define CITY_H_N4OB1GLT

#include "src/obj/index.h"
#include "src/pphys/index.h"
#include "src/game/block.h"

extern AQType BBCityType;

typedef struct BBCity {
  AQObj object;

  aqaabb aabb;
  AQWorld *world;

  AQList *blocks;
  int citySize;
  BBBlock **blockMap;

  AQList *population;
  AQList *merchants;

  void *_wallView;
} BBCity;

BBCity * BBCity_create();
BBCity * BBCity_initBlocks( BBCity *, int size );

void BBCity_addToWorld( BBCity *, AQWorld * );
void BBCity_removeFromWorld( BBCity *, AQWorld * );

void BBCity_addWallsToView( BBCity *, void * );
void BBCity_removeWallsFromView( BBCity *, void * );

#endif /* end of include guard: CITY_H_N4OB1GLT */
