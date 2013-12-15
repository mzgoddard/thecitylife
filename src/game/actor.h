#ifndef ACTOR_H_R1G5Y81C
#define ACTOR_H_R1G5Y81C

#include "src/obj/index.h"
#include "src/pphys/index.h"

typedef enum {
  AQPlayerDiscipline,
  AQCopDiscipline,
  AQMerchantDiscipline,
  AQErrandRunnerDiscipline,
  AQHomeOwnerDiscipline,
  AQThiefDiscipline,
  AQImporterDiscipline,
  AQCrafterDiscipline
} AQActorDiscipline;

typedef enum {
  AQNoAction,
  AQPlayerAction,
  AQCopPatrolAction,
  AQChaseAction,
  AQFindErrandAction,
  AQPerformErrandAction,
  AQOfferErrandAction,
  AQBuyItemAction,
  AQSellImportAction
} AQActorAction;

extern AQType AQActorType;

typedef struct AQActor {
  AQObj object;

  AQActorDiscipline discipline;

  // The base speed of an actor doesn't change. It is how fast they
  // move unencumbered.
  AQDOUBLE baseSpeed;

  // The current speed is the modified base speed.
  AQDOUBLE currentSpeed;

  // The size of this actor.
  AQDOUBLE size;

  int money;

  AQDOUBLE suspicionRate;
  AQDOUBLE suspicionLevel;

  AQActorAction action;

  struct {
    struct {
      AQDOUBLE movementAngle;
      AQDOUBLE movementPower;
    } playerData;

    struct {
      struct AQActor *chasing;
      aqvec2 lastSeenAt;
    } chaseData;

    struct {
      struct AQActor *buyer;
      void *itemType;
      void *targetItem;
    } errandData;

    struct {
      struct AQActor *targetSeller;
    } buyerData;

    struct {
      struct AQActor *targetBuyer;
    } importerData;
  } actionData;

  // Angle actor is rotated.
  AQDOUBLE angle;
  AQWorld *world;
  AQParticle *body;
  AQParticle *trigger;
  AQList *path;
  AQList *patrol;
  AQObj *inventorySlot;

  void * _view;
} AQActor;

void AQActor_updateData( AQActor * );
void AQActor_setWorld( AQActor *, AQWorld * );

#endif /* end of include guard: ACTOR_H_R1G5Y81C */
