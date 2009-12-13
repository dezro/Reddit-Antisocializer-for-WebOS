function AccountEntryAssistant(args) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
    if (args && args.accountIndex)
        this.accountIndex = args.accountIndex;
    else
        this.accountIndex = 0;
}

AccountEntryAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	if (Reddit.accounts[this.accountIndex])
        this.model = Object.clone(Reddit.accounts[this.accountIndex]);
    else {
        this.model = {};
    }
    this.controller.setupWidget("loginField",
        {
            modelProperty: 'username',
            autoReplace: false,
            textCase: Mojo.Widget.steModeLowerCase,
            changeOnKeyPress: true
        },
        this.model
    );
    this.controller.setupWidget("passwordField",
        {
            modelProperty: 'password',
            changeOnKeyPress: true,
            focusMode: Mojo.Widget.focusAppendMode
        },
        this.model
    );
    
    this.saveAccountButtonModel = {
        buttonClass: "primary",
        label: "Log In",
        disabled: !(this.model.username && this.model.password)
    };
    this.controller.setupWidget("saveAccountButton",
        {
            type: Mojo.Widget.activityButton
        },
        this.saveAccountButtonModel
    );
    
    this.controller.setupWidget("logoutButton", undefined, {
        label: "Log Out"
    });
	
	this.fieldChangeListener = this.fieldChange.bindAsEventListener(this);
	/* add event handlers to listen to events from widgets */
    Mojo.Event.listen($('saveAccountButton'), Mojo.Event.tap, this.saveTapped.bind(this));
    Mojo.Event.listen($('logoutButton'), Mojo.Event.tap, this.logoutTapped.bind(this));
    Mojo.Event.listen($('loginField'), Mojo.Event.propertyChange, this.fieldChangeListener);
    Mojo.Event.listen($('passwordField'), Mojo.Event.propertyChange, this.fieldChangeListener);
}

AccountEntryAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
}


AccountEntryAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
}

AccountEntryAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}

AccountEntryAssistant.prototype.considerForNotification = function(event) {
    if (event) {
        switch (event.type) {
            case 'loginSuccessful':
            	Reddit.accounts[this.accountIndex] = this.model;
            	Reddit.currentAccount = this.model; // TODO: Move this elsewhere?
                Reddit.saveAccounts();
                this.controller.stageController.popScenesTo(undefined);
                this.controller.stageController.pushScene("reddit");
                break;
            case 'loginFailed':
                this.showError("Wrong username or password.")
                $('loginField').mojo.focus();
                break;
        }
    }
}

AccountEntryAssistant.prototype.fieldChange = function(event) {
    if (this.saveAccountButtonModel.disabled &&
        !(this.model.password.empty() || this.model.username.empty())) {
        this.saveAccountButtonModel.disabled = false;
        this.controller.modelChanged(this.saveAccountButtonModel);
    } else if (!this.saveAccountButtonModel.disabled &&
        (this.model.password.empty() || this.model.username.empty())) {
        this.saveAccountButtonModel.disabled = true;
        this.controller.modelChanged(this.saveAccountButtonModel);
    }
}

AccountEntryAssistant.prototype.saveTapped = function(event) {
    this.hideError();
    this.saveAccountButtonModel.label = "Logging in...";
    this.controller.modelChanged(this.saveAccountButtonModel);
    $('saveAccountButton').mojo.activate();
    
    Reddit.login(this.model);
}

AccountEntryAssistant.prototype.logoutTapped = function(event) {
    try {
        this.hideError();
        Reddit.currentAccount = {};
        Reddit.accounts[0] = {};
        Reddit.saveAccounts();
        this.controller.stageController.popScenesTo(undefined);
        this.controller.stageController.pushScene("reddit");
    } catch(e) {
        $('the-scene').update(e);
    }
}

AccountEntryAssistant.prototype.showError = function(message) {
    $('error_message_text').update(message);
    $('error_message').show();
    $('error_message').setStyle({visibility:'visible'});
    this.saveAccountButtonModel.label = "Log In";
    this.controller.modelChanged(this.saveAccountButtonModel);
    $('saveAccountButton').mojo.deactivate();
}

AccountEntryAssistant.prototype.hideError = function() {
    if ($('error_message').getStyle('display') != 'none') {
        $('error_message').setStyle({visibility:'hidden'});
    } else {
        $('error_message').hide();
        $('error_message').setStyle({visibility:'visible'});
    }
}
