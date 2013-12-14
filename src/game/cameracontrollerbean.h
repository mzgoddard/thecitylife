#ifndef CAMERACONTROLLERBEAN_H_4Z9DY8K3
#define CAMERACONTROLLERBEAN_H_4Z9DY8K3

#include "src/game/actor.h"

typedef enum BBControllerState {
  PanControllerState,
  ZoomControllerState
} BBControllerState;

extern AQType BBCameraControllerType;

typedef struct BBCameraController {
  AQObj object;

  BBControllerState state;
  AQActor *actor;

  int inputPressed;

  aqvec2 center;
  float minScale;
  float maxScale;
  float floatingScale;

  float currentScale;
  float scaleValue;
} BBCameraController;

BBCameraController * BBCameraController_create();

BBCameraController * BBCameraController_setPlayer(
  BBCameraController *, AQActor *
);

BBCameraController * BBCameraController_inputPress( BBCameraController * );

#endif /* end of include guard: CAMERACONTROLLERBEAN_H_4Z9DY8K3 */
