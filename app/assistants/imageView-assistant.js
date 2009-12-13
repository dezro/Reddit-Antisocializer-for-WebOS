function ImageViewAssistant(args) {
	// I think this is where my leak is but I can't be sure.
    
    if (args && args.url) {
        this.url = args.url;
        if (args.thumbUrl)
            this.thumbUrl = args.thumbUrl;
    }
    this.loadingImage = Mojo.appPath + 'images/OneMoment.jpg';
    if (!this.thumbUrl)
        this.thumbUrl = Mojo.appPath + 'images/OneMomentSmall.jpg';
}

ImageViewAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
	if (!this.url) {
	    Mojo.Controller.appController.closeStage(this.controller.window.name);
	    return;
	}
    if (this.controller.stageController.setWindowOrientation) {
        this.controller.stageController.setWindowOrientation("free");
    }
    this.controller.enableFullScreenMode(true);
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	this.imageView = this.controller.get("theImageView");
    this.controller.setupWidget("theImageView",
        {
            highResolutionLoadTimeout: 0
        }
    );
    
    // var thisAssistant = this;
    // this.windowResizeBound = function(e) {thisAssistant.windowResize()};
    this.windowResizeBound = this.windowResize.bind(this);
	/* add event handlers to listen to events from widgets */
    // this.controller.listen(this.controller.window, 'resize', this.windowResize);
    this.controller.window.addEventListener('resize', this.windowResizeBound);
}

ImageViewAssistant.prototype.doPostSetup = function() {
    // for some reason, some of this failed when I put it in the setup function
    this.postSetupDone = true;
    this.windowResize();

    this.imageView.mojo.centerUrlProvided(this.loadingImage);

    new Ajax.Request(this.url, {
        method: 'get',
        requestHeaders: {
            range: 'bytes=0-1'
        },
        onSuccess: function(response) {
            var type = response.getResponseHeader('Content-Type');
            if (!type.startsWith("image")) {
                this.controller.serviceRequest('palm://com.palm.applicationManager', {
                    method: "open",
                    parameters: {
                        target: this.url
                    }
                });
                this.controller.stageController.popScene();
            } else {
                this.imageView.mojo.centerUrlProvided(this.url, this.thumbUrl);
            }
        }.bind(this),
        onFailure: function(response) {
        
        },
        onException: function(response) {
        
        }
    });
}

ImageViewAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
	
	if (!this.postSetupDone)
        this.doPostSetup();
}


ImageViewAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

ImageViewAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
    this.controller.window.removeEventListener('resize', this.windowResizeBound);
}

ImageViewAssistant.prototype.windowResize = function() {
    var w = this.controller.window;
    this.controller.get('theImageView').mojo.manualSize(w.innerWidth, w.innerHeight);
}

// ImageViewAssistant.prototype.orientationChanged = function(orientation) {
//     switch(orientation) {
//         case 'up';
//         case 'down';
//             this.controller.get('theImageView').mojo.manualSize()
//             break;
//         case 'left':
//         case 'right':
//             this.controller.get('theImageView').mojo.manualSize()
//             break;
//     }
// }
