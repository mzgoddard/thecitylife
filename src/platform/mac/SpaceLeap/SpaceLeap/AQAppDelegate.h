//
//  AQAppDelegate.h
//  aquamancy
//
//  Created by Michael Goddard on 1/16/12.
//  Copyright (c) 2012 Gradient Studios LLC. All rights reserved.
//

#import <Cocoa/Cocoa.h>

@interface AQAppDelegate : NSObject <NSApplicationDelegate> {
  NSWindow *_window;
}

@property (assign) IBOutlet NSWindow *window;

- (BOOL)applicationShouldTerminateAfterLastWindowClosed:(NSApplication *)theApplication;

@end
