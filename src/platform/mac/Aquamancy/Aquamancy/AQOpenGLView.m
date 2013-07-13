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

#import "watertest.h"
//#import "all.h"

//void update_touch( aq_click_type button, aq_input_state state, aqvec2 screen );
//void remove_touches();
//unsigned int get_button( NSUInteger buttonNumber );

@implementation AQOpenGLView

- (void) awakeFromNib {
  animationTimer = [[NSTimer timerWithTimeInterval:1.0 / 500 target:self selector:@selector(draw:) userInfo:nil repeats:YES] retain];
  [[NSRunLoop currentRunLoop] addTimer:animationTimer forMode:NSDefaultRunLoopMode];
  [[NSRunLoop currentRunLoop] addTimer:animationTimer forMode:NSEventTrackingRunLoopMode];
  
  [super awakeFromNib];
}

- (void) dealloc {
  [animationTimer invalidate];
  [animationTimer release];
  
  [super dealloc];
}

- (void) prepareOpenGL {
  int swapInt = 1;
  
  [[self openGLContext] setValues:&swapInt forParameter:NSOpenGLCPSwapInterval]; // set to vbl sync
  
  glClearColor(0, 0, 0, 0);
  NSLog(@"hi");
  
  initWaterTest();
//  NSLog(@"%s", aqt_object->name);
}

- (void) draw:(NSTimer *)sender {
  if (mouseDown) {
    [self drawRect:[self bounds]];
    
    NSDate *now = [NSDate date];
    
    NSTimeInterval dt = fabs([lastDate timeIntervalSinceNow]);
    //        NSLog(@"%f", dt);
    stepWaterTest(dt);
    
//    remove_touches();
    
    [lastDate release];
    lastDate = [now retain];
  }
}

- (void) drawRect:(NSRect)dirtyRect {
  [[self openGLContext] makeCurrentContext];
  
  //    glViewport(0, 0, 2, 2);
  glViewport(0, 0, dirtyRect.size.width, dirtyRect.size.height);
  
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

- (void) mouseDown:(NSEvent *)theEvent {
  mouseDown = mouseDown ? NO : YES;
  
  NSLog(@"%@", theEvent);
  
  NSPoint pt = theEvent.locationInWindow;
//  update_touch(
//               get_button( theEvent.type ),
//               AQ_INPUT_BEGIN,
//               (aqvec2) {
//                 pt.x,
//                 pt.y
//               });
  
  [lastDate release];
  lastDate = [[NSDate date] retain];
}

- (void) mouseDragged:(NSEvent *)theEvent {
  NSPoint pt = theEvent.locationInWindow;
//  update_touch(
//               get_button( theEvent.type ),
//               AQ_INPUT_STAY,
//               (aqvec2) {
//                 pt.x,
//                 pt.y
//               });
}

- (void) mouseUp:(NSEvent *)theEvent {
  NSPoint pt = theEvent.locationInWindow;
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
