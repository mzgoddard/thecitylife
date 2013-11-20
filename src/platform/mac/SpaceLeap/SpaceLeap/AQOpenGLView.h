//
//  AQOpenGLView.h
//  aquamancy
//
//  Created by Michael Goddard on 1/17/12.
//  Copyright (c) 2012 Gradient Studios LLC. All rights reserved.
//

#import <AppKit/AppKit.h>

@interface AQOpenGLView : NSOpenGLView {
  BOOL mouseDown;
  NSTimer *animationTimer;
  NSDate *lastDate;
}

- (void) draw:(NSTimer *)sender;

@end
