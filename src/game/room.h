#ifndef ROOM_H_N3G37JN2
#define ROOM_H_N3G37JN2

#include "src/obj/index.h"
#include "src/pphys/index.h"
#include "src/game/wall.h"
#include "src/game/pathnode.h"

typedef enum {
  // 20x10
  BBSmallRoom = 1 << 0,
  // 20x20
  BBMediumRoom = 1 << 1,
  // 40x20
  BBLargeRoom = 1 << 2
} BBRoomSize;

typedef enum {
  BBNorth,
  BBEast,
  BBSouth,
  BBWest
} BBRotation;

typedef enum {
  BBNorthDoor = 1 << 0,
  BBEastDoor = 1 << 1,
  BBSouthDoor = 1 << 2,
  BBWestDoor = 1 << 3
} BBRoomDoorLocation;

extern AQType BBRoomType;

typedef struct BBRoom {
  AQObj object;

  int isVacant;
  BBRoomSize size;
  BBRotation rotation;
  aqaabb aabb;

  AQWorld *world;
  AQList *walls;
  AQList *pathNodes;
  void *owner;

  int isShop;
  void *itemType;
} BBRoom;

BBRoom * BBRoom_create();

BBRoom * BBRoom_clone( BBRoom * );

void BBRoom_buildAabb( BBRoom * );
void BBRoom_addWall( BBRoom *, aqaabb aabb, BBWallEnum );
BBRoom * BBRoom_rotate( BBRoom *, int rotations );
BBRoom * BBRoom_rotateTo( BBRoom *, BBRotation );
BBRoom * BBRoom_move( BBRoom *, aqvec2 );
BBRoom * BBRoom_moveTo( BBRoom *, aqvec2 );
void BBRoom_changeVacancy( BBRoom *, void *newOwner );

void BBRoom_addToWorld( BBRoom *, AQWorld * );
void BBRoom_removeFromWorld( BBRoom *, AQWorld * );

#endif /* end of include guard: ROOM_H_N3G37JN2 */
