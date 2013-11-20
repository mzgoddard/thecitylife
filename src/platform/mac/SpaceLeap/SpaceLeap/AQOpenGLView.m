//
//  AQOpenGLView.m
//  aquamancy
//
//  Created by Michael Goddard on 1/17/12.
//  Copyright (c) 2012 Gradient Studios LLC. All rights reserved.
//

#import <math.h>

#import "AQOpenGLView.h"
#import <OpenGL/OpenGL.h>
#import <OpenGL/gl.h>

#import "appdefines.h"
#import "watertest.h"
#import "input.h"
//#import "all.h"

//void update_touch( aq_click_type button, aq_input_state state, aqvec2 screen );
//void remove_touches();
//unsigned int get_button( NSUInteger buttonNumber );

@implementation AQOpenGLView

- (void) awakeFromNib {
  animationTimer = [[NSTimer timerWithTimeInterval:1.0 / 20 target:self selector:@selector(draw:) userInfo:nil repeats:YES] retain];
  [[NSRunLoop currentRunLoop] addTimer:animationTimer forMode:NSDefaultRunLoopMode];
  [[NSRunLoop currentRunLoop] addTimer:animationTimer forMode:NSEventTrackingRunLoopMode];

  [super awakeFromNib];
}

- (void) dealloc {
  [animationTimer invalidate];
  [animationTimer release];
  
  [super dealloc];
}

- (BOOL) acceptsFirstResponder {
  return YES;
}

- (BOOL) becomeFirstResponder {
  NSLog( @"Become first resopnder." );
  return YES;
}

- (BOOL) resignFirstResponder {
  NSLog( @"Resign first responder." );
  return YES;
}

- (BOOL) acceptsFirstMouse:(NSEvent *)theEvent {
  return YES;
}

- (void) prepareOpenGL {
  int swapInt = 1;
  
  [[self openGLContext] setValues:&swapInt forParameter:NSOpenGLCPSwapInterval]; // set to vbl sync
  
  glClearColor(0, 0, 0, 0);
  VIEWPORT();
  NSLog(@"hi");

  AQInput_setScreenSize( self.frame.size.width, self.frame.size.height );

  initWaterTest();
//  NSLog(@"%s", aqt_object->name);
}

- (void) draw:(NSTimer *)sender {
//  if (mouseDown) {
    [self drawRect:[self bounds]];
    
    NSDate *now = [NSDate date];
    
    NSTimeInterval dt = fabs([lastDate timeIntervalSinceNow]);
    //        NSLog(@"%f", dt);
    stepWaterTest(dt);
    [self setNeedsDisplay:YES];

    AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));
    if ( mouseTouch && ( mouseTouch->state & AQTouchTouching ) == 0 ) {
      AQArray *touches = AQInput_getTouches();
      AQArray_remove( touches, (AQObj *) mouseTouch );
      aqrelease( mouseTouch );
      mouseTouch = NULL;
    } else if (
      mouseTouch &&
        ( mouseTouch->state & ( AQTouchBegan | AQTouchMoved ))
    ) {
      mouseTouch->state = AQTouchStationary;
    }
    aqfree( pool );

//    remove_touches();
    
    [lastDate release];
    lastDate = [now retain];
//  }
}

- (void) drawRect:(NSRect)dirtyRect {
  [[self openGLContext] makeCurrentContext];
  
  //    glViewport(0, 0, 2, 2);
//  glViewport(0, 0, dirtyRect.size.width, dirtyRect.size.height);
  AQInput_setScreenSize( self.frame.size.width, self.frame.size.height );
  float width, height;
  AQInput_getScreenSize( &width, &height );
  float max = width > height ? width : height;
  glViewport(( width - max ) / 2, ( height - max ) / 2, max, max );
  
//  aq_input_setscreensize( (aqvec2){dirtyRect.size.width, dirtyRect.size.height} );
  drawWaterTest();
  
  glFlush();
}

//struct find_touch {
//  aq_click_type find_click;
//  aq_input_state find_state;
//  
//  aq_touch *touch;
//};
//
//void find_touch_iterator(aq_id object, void *userdata, aqbool *stop);
//void find_touch_iterator(aq_id object, void *userdata, aqbool *stop) {
//  struct find_touch *find = ( struct find_touch * )userdata;
//  aq_touch * touch = ( aq_touch * )object;
//  
//  if ( find->find_click != 0 ) {
//    if ( find->find_click == aq_touch_click( touch ) ) {
//      find->touch = touch;
//      *stop = false;
//    }
//  }
//  
//  if ( find->find_state != 0 ) {
//    if ( find->find_state == aq_touch_state( touch ) ) {
//      find->touch = touch;
//      *stop = false;
//    }
//  }
//}
//
//void update_touch( aq_click_type button, aq_input_state state, aqvec2 screen ) {
//  aq_autoreleasepool * pool = aq_autoreleasepool_init( aq_alloc( aqt_autoreleasepool ) );
//  
//  aq_list *touches = aq_input_touches();
//  
//  struct find_touch find;
//  find.touch = NULL;
//  find.find_click = button;
//  find.find_state = 0;
//  
//  aq_list_iterate( touches, &find_touch_iterator, &find );
//  
//  aq_touch *touch = find.touch;
//  if ( !touch ) {
//    touch = aq_touch_create( (aqvec2){0, 0}, button, state );
//    aq_list_add( touches, touch );
//  }
//  
//  touch->state = state;
//  
//  touch->screen_position = screen;
//  
//  aq_release( pool );
//  
//  NSLog( @"click %d %d <%f,%f> <%f,%f>", button, state, screen.x, screen.y, aq_touch_world( touch ).x, aq_touch_world( touch ).y );
//}
//
//void remove_touches() {
//  aq_autoreleasepool * pool = aq_autoreleasepool_init( aq_alloc( aqt_autoreleasepool ) );
//  
//  aq_list *touches = aq_input_touches();
//  
//  struct find_touch find;
//  find.touch = NULL;
//  find.find_click = 0;
//  find.find_state = AQ_INPUT_END;
//  
//  aq_list_iterate( touches, &find_touch_iterator, &find );
//  aq_touch *touch = find.touch;
//  while ( touch ) {
//    aq_list_remove( touches, touch );
//    touch = find.touch = NULL;
//    aq_list_iterate( touches, &find_touch_iterator, &find );
//  }
//  
//  aq_release( pool );
//}
//
//unsigned int get_button( NSUInteger buttonNumber ) {
//  unsigned int button = 0;
//  switch( buttonNumber ) {
//    case NSLeftMouseDown:
//    case NSLeftMouseUp:
//    case NSLeftMouseDragged:
//      button = AQ_CLICK_LEFT;
//      break;
//    case NSRightMouseDown:
//    case NSRightMouseUp:
//    case NSRightMouseDragged:
//      button = AQ_CLICK_RIGHT;
//      break;
//      
//    default:
//      button = AQ_CLICK_MIDDLE;
//      break;
//  }
//  
//  return button;
//}
AQTouch *mouseTouch = NULL;

- (void) viewDidEndLiveResize {
  AQInput_setScreenSize( self.frame.size.width, self.frame.size.height );
  float width = self.frame.size.width;
  float height = self.frame.size.height;
  float max = width > height ? width : height;
  glViewport(( width - max ) / 2, ( height - max ) / 2, max, max );
}

- (void) mouseDown:(NSEvent *)theEvent {
  AQReleasePool *pool = aqinit( aqalloc( &AQReleasePoolType ));

  mouseDown = mouseDown ? NO : YES;
  
//  NSLog(@"%@", theEvent);
  
  NSPoint pt = theEvent.locationInWindow;

  if ( mouseTouch ) {
    mouseTouch->state = AQTouchCanceled;
    AQArray_remove( AQInput_getTouches(), (AQObj *) mouseTouch );
    aqrelease( mouseTouch );
  }

  float screenWidth, screenHeight;
  AQInput_getScreenSize( &screenWidth, &screenHeight );

  mouseTouch = aqretain( aqcreate( &AQTouchType ));
  mouseTouch->state = AQTouchBegan;
  mouseTouch->finger = 1;
  mouseTouch->x = pt.x;
  mouseTouch->y = pt.y;
  mouseTouch->dx = 0;
  mouseTouch->dy = 0;
  AQInput_screenToWorld(
    mouseTouch->x, mouseTouch->y, &mouseTouch->wx, &mouseTouch->wy
  );
  AQArray_push( AQInput_getTouches(), (AQObj *) mouseTouch );
//  NSLog( @"touch %f %f %f %f\n", mouseTouch->x, mouseTouch->y, screenWidth, screenHeight );

  aqfree( pool );

//  update_touch(
//               get_button( theEvent.type ),
//               AQ_INPUT_BEGIN,
//               (aqvec2) {
//                 pt.x,
//                 pt.y
//               });
  
//  [lastDate release];
//  lastDate = [[NSDate date] retain];
}

- (void) mouseDragged:(NSEvent *)theEvent {
//  NSPoint pt = theEvent.locationInWindow;
//  update_touch(
//               get_button( theEvent.type ),
//               AQ_INPUT_STAY,
//               (aqvec2) {
//                 pt.x,
//                 pt.y
//               });
}

- (void) mouseUp:(NSEvent *)theEvent {
//  NSPoint pt = theEvent.locationInWindow;

  if ( mouseTouch ) {
    mouseTouch->state = AQTouchEnded;
  }
//  update_touch(
//               get_button( theEvent.type ),
//               AQ_INPUT_END,
//               (aqvec2) {
//                 pt.x,
//                 pt.y
//               });
}

- (void) rightMouseDown:(NSEvent *)theEvent {
  [self mouseDown:theEvent];
}

- (void) rightMouseDragged:(NSEvent *)theEvent {
  [self mouseDragged:theEvent];
}

- (void) rightMouseUp:(NSEvent *)theEvent {
  [self mouseUp:theEvent];
}

- (void) keyDown:(NSEvent *)theEvent {
  
}

@end
