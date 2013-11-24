// Adds the given callback function to listen to the changes in browser window size.
void set_window_resize_handler(void *userData, void (*handlerFunc)(int newWidth, int newHeight, void *userData));

void enable_resizable();
