#ifndef CAMERACONTROLLER_H_D3K8B99Y
#define CAMERACONTROLLER_H_D3K8B99Y

#include "src/game/leaper.h"
#include "src/game/asteroid.h"

typedef enum SLControllerState {
  PanControllerState,
  ZoomControllerState
} SLControllerState;

// extern AQType SLPanControllerType;
// 
// typedef struct SLPanController {
//   AQObj *object;
// 
//   AQParticle *controllerTarget;
// } SLPanController;
// 
// SLPanController * SLPanController_create();
// 
// extern AQType SLZoomControllerType;
// 
// typedef struct SLZoomController {
//   AQObj *object;
// 
//   AQParticle *controllerTarget;
// } SLZoomController;
// 
// SLZoomController * SLZoomController_create();
// void SLZoomController_inputPress( SLZoomController * );

extern AQType SLCameraControllerType;

typedef struct SLCameraController {
  AQObj object;

  SLControllerState state;
  SLLeaper *leaper;
  SLAsteroid *home;
  int inputPressed;

  aqvec2 center;
  float minScale;
  float maxScale;
  float currentScale;
  float scaleValue;

  // SLPanController *panController;
  // SLZoomController *zoomController;
} SLCameraController;

SLCameraController * SLCameraController_create();

SLCameraController * SLCameraController_setLeaper(
  SLCameraController *, SLLeaper *
);
SLCameraController * SLCameraController_setHome(
  SLCameraController *, SLAsteroid *
);
void SLCameraController_inputPress( SLCameraController * );

#endif /* end of include guard: CAMERACONTROLLER_H_D3K8B99Y */
