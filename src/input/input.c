#include <assert.h>
#include <stdarg.h>
#include <string.h>

#include "./input.h"
#include "src/obj/number.h"

struct {
  float width;
  float height;
} _screenSize;

struct {
  float top;
  float right;
  float bottom;
  float left;
} _worldFrame;

AQArray *_touches = NULL;

AQTouch * AQTouch_init( AQTouch *self ) {
  memset( &self->state, 0, sizeof( AQTouch ) - sizeof( AQObj ));
  return self;
}

void AQInput_setScreenSize( float width, float height ) {
  _screenSize.width = width;
  _screenSize.height = height;
}

void AQInput_getScreenSize( float *width, float *height ) {
  *width = _screenSize.width;
  *height = _screenSize.height;
}

void AQInput_setWorldFrame( float top, float right, float bottom, float left ) {
  _worldFrame.top = top;
  _worldFrame.right = right;
  _worldFrame.bottom = bottom;
  _worldFrame.left = left;
}

void AQInput_screenToWorld( float x, float y, float *wx, float *wy ) {
  *wx = x / _screenSize.width * ( _worldFrame.right - _worldFrame.left ) +
    _worldFrame.left;
  *wy = y / _screenSize.height * ( _worldFrame.top - _worldFrame.bottom ) +
    _worldFrame.bottom;
}

AQArray * AQInput_getTouches() {
  if ( !_touches ) {
    _touches = aqinit( aqalloc( &AQArrayType ));
  }
  return _touches;
}

AQInputAction * AQInputAction_init( AQInputAction *self ) {
  aqzero( self );
  self->keyCodes = aqinit( aqalloc( &AQListType ));
  return self;
}

AQInputAction * AQInputAction_done( AQInputAction *self ) {
  aqrelease( self->name );
  aqrelease( self->keyCodes );
  return self;
}

AQInputAction * AQInputAction_create( AQString *name ) {
  AQInputAction *action = aqcreate( &AQInputActionType );
  action->name = aqretain( name );
  return action;
}

AQObj *_inputActionNameMap = NULL;
AQList *_inputActionList = NULL;
AQObj *_inputActionKeyMap = NULL;

AQObj * _AQInput_getActionNameMap() {
  if ( !_inputActionNameMap ) {
    _inputActionNameMap = aqinit( aqalloc( &AQDictMapType ));
  }
  return _inputActionNameMap;
}

AQList * _AQInput_getActionList() {
  if ( !_inputActionList ) {
    _inputActionList = aqinit( aqalloc( &AQListType ));
  }
  return _inputActionList;
}

AQObj * _AQInput_getActionKeyMap() {
  if ( !_inputActionKeyMap ) {
    _inputActionKeyMap = aqinit( aqalloc( &AQDictMapType ));
  }
  return _inputActionKeyMap;
}

AQInputAction * AQInput_findAction( AQString *name ) {
  return AQMap_get( _AQInput_getActionNameMap(), name );
}

void AQInput_setActionToKey( AQInputAction *action, int keyCode ) {
  AQObj *map = _AQInput_getActionKeyMap();
  AQObj *keyCodeNumber = aqint( keyCode );
  if ( AQMap_get( map, keyCodeNumber ) == NULL ) {
    AQMap_set( map, keyCodeNumber, action );

    if ( AQList_length( action->keyCodes ) == 0 ) {
      AQMap_set( _AQInput_getActionNameMap(), action->name, action );
      AQList_push( _AQInput_getActionList(), (AQObj*) action );
    }

    AQList_push( action->keyCodes, (AQObj*) keyCodeNumber );
  }
}

void AQInput_setActionToKeys( AQInputAction *action, ... ) {
  va_list args;
  va_start( args, action );
  int keyCode;
  while (( keyCode = va_arg( args, int )) != 0 ) {
    AQInput_setActionToKey( action, keyCode );
  }
  va_end( args );
}

int _AQInputAction_isNumber( AQObj *memberKeyCode, void *targetKeyCode ) {
  return AQNumber_asInt( memberKeyCode ) == AQNumber_asInt( targetKeyCode );
}

void _AQInput_unsetActionToKey( AQInputAction *action, void *keyCodeNumber ) {
  AQObj *map = _AQInput_getActionKeyMap();
  if ( AQMap_get( map, keyCodeNumber ) == action ) {
    AQMap_unset( map, keyCodeNumber );

    int index = AQList_findIndex(
      action->keyCodes, _AQInputAction_isNumber, keyCodeNumber
    );
    AQList_removeAt( action->keyCodes, index );

    if ( AQList_length( action->keyCodes ) == 0 ) {
      AQMap_unset( _AQInput_getActionNameMap(), action->name );
      AQList_remove( _AQInput_getActionList(), (AQObj*) action );
    }
  }
}

void AQInput_unsetActionToKey( AQInputAction *action, int keyCode ) {
  _AQInput_unsetActionToKey( action, aqint( keyCode ));
}

void AQInput_unsetAction( AQInputAction *action ) {
  int length = AQList_length( action->keyCodes );
  while ( length ) {
    _AQInput_unsetActionToKey( action, AQList_at( action->keyCodes, 0 ));

    assert( AQList_length( action->keyCodes ) != length );
    length = AQList_length( action->keyCodes );
  }
}

void AQInput_pressKey( int keyCode ) {
  AQObj *map = _AQInput_getActionKeyMap();
  AQInputAction *action = AQMap_get( map, aqint( keyCode ));
  if ( action ) {
    action->pressPulse = 1;
    action->active = 1;
    action->activeKeyCode = keyCode;
  }
}

void AQInput_releaseKey( int keyCode ) {
  AQObj *map = _AQInput_getActionKeyMap();
  AQInputAction *action = AQMap_get( map, aqint( keyCode ));
  if ( action ) {
    action->releasePulse = 1;
    if ( action->activeKeyCode == keyCode ) {
      action->activeKeyCode = 0;
    }
  }
}

void _AQInputAction_update( AQInputAction *self, void *ctx ) {
  self->pressPulse = 0;
  self->releasePulse = 0;
  if ( self->activeKeyCode == 0 ) {
    self->active = 0;
  }
}

void AQInput_step() {
  AQList_iterate(
    _AQInput_getActionList(), (AQList_iterator) _AQInputAction_update, NULL
  );
}

AQTYPE_ALL(
  AQTouch, sizeof(AQTouch), NULL,
  AQTouch_init, AQObj_done, AQObj_getInterface
);

AQTYPE_INIT_DONE( AQInputAction );
