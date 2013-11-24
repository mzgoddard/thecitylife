(function() {
  var Window = {
    set_window_resize_handler: function(userData, resizeHandler) {
      var handlerFunc = function(event) {
        // windows.innerWidth/Height gives the size of the browser window area that shows HTML content, including the area under the scrollbars if they exist.
        // document.body.clientWidth/Height gives the size that the content takes up on the browser client area, excluding the scrollbars.
        // Therefore pass a slightly peculiar combo of these two to guarantee that a left-right scrollbar never appears if there is more than one screenful
        // of content in the page.
        Runtime.dynCall('viii', resizeHandler, [document.body.clientWidth, window.innerHeight, userData]);
      }
      window.addEventListener("resize", handlerFunc, true);
    },

    enable_resizable: function() {
      window.addEventListener( 'resize', function() {
        Module.setCanvasSize( document.body.clientWidth, window.innerHeight );
      }, true );
      Module.setCanvasSize( document.body.clientWidth, window.innerHeight );
    }
  };

  mergeInto(LibraryManager.library, Window);
}());
