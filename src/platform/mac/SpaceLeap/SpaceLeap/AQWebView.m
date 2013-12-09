//
//  AQWebView.m
//  SpaceLeap
//
//  Created by Z Goddard on 11/17/13.
//  Copyright (c) 2013 Z Goddard. All rights reserved.
//

#import "AQWebView.h"
#import "AQWebInterface.h"

@implementation AQWebView

- (void) awakeFromNib {
  [super awakeFromNib];

  NSURL *fileUrl = [[NSBundle mainBundle] URLForResource:@"baseline" withExtension:@"html"];
  NSURL *baseUrl = [fileUrl URLByDeletingLastPathComponent];
  [[self mainFrame] loadData:[NSData dataWithContentsOfURL:fileUrl] MIMEType:@"text/html" textEncodingName:@"utf-8" baseURL:baseUrl];
  NSLog( @"%@", fileUrl );
  
  AQWebInterface *webInterface = [[[AQWebInterface alloc] init] autorelease];
  [webInterface setWebView:self];
  [[self windowScriptObject] setValue:webInterface forKey:@"SP"];

  [self setDrawsBackground:NO];
}

- (NSView*) hitTest:(NSPoint)aPoint {
  if (self.wantsWebEvents) {
    return [super hitTest:aPoint];
  }
  return (NSView*) [self nextKeyView];
}

- (void) keyDown:(NSEvent *)theEvent {
  if (self.wantsWebEvents) {
    return [super keyDown:theEvent];
  } else {
    [[[[self superview] subviews] objectAtIndex:0] keyDown:theEvent];
  }
}

- (void) keyUp:(NSEvent *)theEvent {
  if (self.wantsWebEvents) {
    return [super keyUp:theEvent];
  } else {
    [[[[self superview] subviews] objectAtIndex:0] keyUp:theEvent];
  }
}

@end
