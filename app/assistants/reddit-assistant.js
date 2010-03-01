function RedditAssistant(args) {
    /* this is the creator function for your scene assistant object. It will be passed all the 
       additional parameters (after the scene name) that were passed to pushScene. The reference
       to the scene controller (this.controller) has not be established yet, so any initialization
       that needs the scene controller should be done in the setup function below. */
    
    this.subreddit = Reddit.frontPage;
    this.before = this.after = false;
    this.count = 0;
    if (args) {
        if (args.subreddit)
            this.subreddit = args.subreddit;
        if (args.after)
            this.after = args.after;
        if (args.before)
            this.before = args.before;
        if (args.count)
            this.count = args.count;
    }
    Reddit.updateSubredditMenu();
}

RedditAssistant.prototype.setup = function() {
    /* this function is for setup tasks that have to happen when the scene is first created */
    if (this.controller.stageController.setWindowOrientation) {
        this.controller.stageController.setWindowOrientation("free");
    }
    
    /* use Mojo.View.render to render view templates and add them to the scene, if needed. */

    /* setup widgets here */
    
    this.controller.setupWidget(Mojo.Menu.appMenu,
        {
            omitDefaultItems: true
        },
        {
            visible: true,
            items: [ 
                // {label: "About Antisocializer...", command: 'do-myAbout'},
                Mojo.Menu.editItem,
                { label: "Preferences...", command: 'do-redditPrefs' },
                { label: "Help...", command: 'do-redditHelp', disabled: true }
            ]
        }
    );
    
    this.backForthButtons = [
        { icon: "back", command:"do-backPage", disabled:true },
        { icon: "forward", command:"do-forwardPage", disabled:true }
    ];
    this.mailAndMe = [
        { icon: "envelope", command: 'do-openInbox' },
        { label: Reddit.currentAccount.username, command: 'do-openMe' }
    ];
    this.commandMenuModel = {
        items: [
            { items: this.backForthButtons }
        ]
    };
    if ( Reddit.currentAccount.username ) {
        this.commandMenuModel.items.push({items:this.mailAndMe});
    }
    this.controller.setupWidget(Mojo.Menu.commandMenu, undefined,
        this.commandMenuModel
    );
    
    this.controller.setupWidget("postList",
        {
            renderLimit: 200,
            itemTemplate: 'reddit/redditRowTemplate',
            listTemplate: 'reddit/redditListTemplate',
            formatters: {
                created_utc: Reddit.timeFormatter,
                likes: Reddit.arrowFormatter,
                thumbnail: Reddit.thumbFormatter,
                saved: Reddit.savedFormatter
            }
        }, {items: []}
    );
    
    this.controller.setupWidget("fullScreenSpinner",
        {
            spinnerSize: Mojo.Widget.spinnerLarge
        }, {
            spinning: true
        }
    );
    
    /* add event handlers to listen to events from widgets */
    this.tapEntryListener = this.tapEntry.bind(this);
    Mojo.Event.listen($('postList'), Mojo.Event.listTap, this.tapEntryListener);
    this.tapHeaderListener = this.tapHeader.bind(this);
    Mojo.Event.listen($('header'), Mojo.Event.tap, this.tapHeaderListener);
    
    this.updateSubreddit(this.subreddit);
}

RedditAssistant.prototype.activate = function(event) {
    /* put in event handlers here that should only be in effect when this scene is active. For
       example, key handlers that are observing the document */
    document.body.addClassName('redditBlue');
    
    Reddit.checkEnvelope();
}


RedditAssistant.prototype.deactivate = function(event) {
    /* remove any event handlers you added in activate and do any other cleanup that should happen before
       this scene is popped or another scene is pushed on top */
    document.body.removeClassName('redditBlue');
}

RedditAssistant.prototype.cleanup = function(event) {
    /* this function should do any cleanup needed before the scene is destroyed as 
       a result of being popped off the scene stack */
    
    Mojo.Event.stopListening(this.controller.get("postList"), Mojo.Event.listTap, this.tapEntryListener);
    Mojo.Event.stopListening(this.controller.get("header"), Mojo.Event.tap, this.tapHeaderListener);
}

RedditAssistant.prototype.considerForNotification = function(event) {
    if (event) {
        switch (event.type) {
            case 'linksUpdate':
                this.linkArray = event.links;
                this.after = event.after;
                this.before = event.before;
                this.backForthButtons[0].disabled = !(this.before);
                this.backForthButtons[1].disabled = !(this.after);
                this.maybeChangeScreen();
                break;
            case 'updateEnvelope':
                this.mailAndMe[0].icon = "envelope " + event.color;
                this.controller.modelChanged(this.commandMenuModel);
                break;
            case 'bigError':
                // document.body.update(event.message);
                break;
        }
        //todo: voteFailed
    }
}

RedditAssistant.prototype.handleCommand = function(event) {
    if (event.type === Mojo.Event.command) {
        switch (event.command) {
            case 'do-redditPrefs':
                this.controller.stageController.pushScene("accountEntry");
                break;
            case 'do-backPage':
                this.updateList('before');
                break;
            case 'do-forwardPage':
                this.updateList('after');
                break;
            case 'do-openInbox':
                this.controller.serviceRequest('palm://com.palm.applicationManager', {
                    method: "open",
                    parameters: {
                        target: Reddit.url + "message/inbox/"
                    }
                });
                break;
            case 'do-openMe':
                this.controller.serviceRequest('palm://com.palm.applicationManager', {
                    method: "open",
                    parameters: {
                        target: Reddit.url + "user/" + Reddit.currentAccount.username + "/"
                    }
                });
                break;
        }
    }
}

RedditAssistant.prototype.itemsCallback = function(listWidget, offset, limit) {
    ;
}

RedditAssistant.prototype.updateList = function(direction) {
    var args = {};
    if (direction == 'before') {
        args.before = this.before;
        args.count = this.count + 1;
        this.count -= Reddit.linksPerStep;
    } else if (direction == 'after') {
        args.after = this.after;
        args.count = this.count += Reddit.linksPerStep;
    } else {
        this.count = 0;
    }
    
    $('greyOut').show();
    
    Reddit.getLinks(this.subreddit, null, args);
}

RedditAssistant.prototype.maybeChangeScreen = function() {
    if (!(this.headerUrl && this.linkArray)) {
        return;
    }
    
    var i = this.count;
    this.linkArray.each(function(item) {
        i++;
        item.number = i;
    });
    
    $('postList').mojo.noticeUpdatedItems(0, this.linkArray);
    $('postList').mojo.setLength(this.linkArray.length);
    
    // // Advertisement code...
    // var adHtml = Mojo.View.render({
    //     template: '../../ads/rowAds/testAd'
    // });
    // var adNode = Mojo.View.convertToNode(adHtml, document);
    // 
    // var fc = $('postList').querySelector('.redditRow');
    // fc.parentNode.insertBefore(adNode, fc.nextSibling);
    
    this.controller.modelChanged(this.commandMenuModel);
    
    if (this.subreddit != Reddit.frontPage) {
        $('postList').addClassName('in-subreddit');
    } else {
        $('postList').removeClassName('in-subreddit');
    }
    
    if (this.subreddit == Reddit.frontPage) {
        $('subredditName').update("Front Page");
        $('fakeName').update("Front Page");
    } else {
        $('subredditName').update(this.subreddit);
        $('fakeName').update(this.subreddit);
    }
    $('redditLogo').src = this.headerUrl;
    
    $('greyOut').hide();
    
    this.controller.getSceneScroller().mojo.revealTop();
}

RedditAssistant.prototype.updateSubreddit = function(subreddit) {
    this.headerUrl = undefined;
    this.linkArray = undefined;
    
    this.subreddit = subreddit;
    
    var url;
    if (this.subreddit != Reddit.frontPage) {
        url = Reddit.url + Reddit.sub + this.subreddit;
        Reddit.subredditMenuModel.toggleCmd = Reddit.subredditCommandPrefix + subreddit;
    } else {
        url = Reddit.url;
        Reddit.subredditMenuModel.toggleCmd = Reddit.frontPageCommand;
    }
    url += '?limit=1';
    this.controller.modelChanged(Reddit.subredditMenuModel);
    new Ajax.Request(url, {
        requestHeaders: { cookie: Reddit.currentAccount.cookie },
        onSuccess: function(response) {
            var doc = Reddit.getDocumentFromXHTML(response.responseText);
            this.headerUrl = Reddit.getHeaderUrlFromDoc(doc);
            if (!Reddit.modHashValid())
                Reddit.updateModHashFromDoc(doc);
            this.maybeChangeScreen();
        }.bind(this),
        onFailure: function(response) {
            this.headerUrl = Reddit.headerUrl;
            this.maybeChangeScreen();
        }.bind(this),
        onException: function(response, err) {
            Mojo.Log.logException(err, "updateSubreddit");
            ; //todo: something
        }.bind(this)
    });
    
    this.updateList();
}

RedditAssistant.prototype.listItemVote = function(event, item, vote) {
    var direction = 0;
    var row = event.target.up('.redditRow');
    var voteDiv = row.down('.vote');
    var scoreDiv = voteDiv.down('.score')
    
    if (vote == 'up') {
        if (item.likes) {
            ;
        } else if (item.likes == false) {
            item.score += 2;
            scoreDiv.update(item.score);
        } else {
            item.score += 1;
            scoreDiv.update(item.score);
        }
        item.likes = true;
        direction = 1;
    } else if (vote == 'down') {
        if (item.likes) {
            item.score -= 2;
            scoreDiv.update(item.score);
        } else if (item.likes == false) {
            ;
        } else {
            item.score -= 1;
            scoreDiv.update(item.score);
        }
        item.likes = false;
        direction = -1;
    } else if (vote == 'clear') {
        if (item.likes) {
            item.score -= 1;
            scoreDiv.update(item.score);
        } else if (item.likes == false) {
            item.score += 1;
            scoreDiv.update(item.score);
        } else {
            ;
        }
        item.likes = null;
    } else {
        return; //todo: exception
    }
    
    var descendants = voteDiv.select('.arrow, .score');
    for (var i=0; i<descendants.length; i++) {
        if (vote == 'up')
            descendants[i].addClassName("likes");
        else
            descendants[i].removeClassName("likes");
        
        if (vote == 'down')
            descendants[i].addClassName("dislikes");
        else
            descendants[i].removeClassName("dislikes");
        
        if (vote == 'clear')
            descendants[i].addClassName("unvoted");
        else
            descendants[i].removeClassName("unvoted");
    }
    
    Reddit.vote(item.id, direction);
}

RedditAssistant.prototype.tapHeader = function(event) {
    this.controller.popupSubmenu({
        placeNear: event.target,
        items: Reddit.subredditMenuModel,
        onChoose: function(command) {
            if (command === undefined)
                return;
            if (this.subreddit != command) {
                this.updateSubreddit(command);
            }
        }
    })
}

RedditAssistant.prototype.openComments = function(item) {
    this.controller.stageController.pushScene("comments", {linkId: item.id, subreddit: item.subreddit});
    // this.controller.serviceRequest('palm://com.palm.applicationManager', {
    //     method: "open",
    //     parameters: {
    //         target: "http://www.reddit.com/r/" + item.subreddit + "/comments/" + item.id
    //     }
    // })
}

RedditAssistant.prototype.saveLink = function(event, item) {
    Reddit.saveLink(item.id);
    var icon = event.target.up('.redditRow').down('.savedIcon');
    icon.removeClassName("unsaved");
    icon.addClassName("saved");
    item.saved = true;
}

RedditAssistant.prototype.unsaveLink = function(event, item) {
    Reddit.unsaveLink(item.id);
    var icon = event.target.up('.redditRow').down('.savedIcon');
    icon.removeClassName("saved");
    icon.addClassName("unsaved");
    item.saved = false;
}

RedditAssistant.prototype.hideLink = function(event, item) {
    Reddit.hideLink(item.id);
    var row = event.target.up('.redditRow');
    row.addClassName("hidden");
    item.hidden = true;
}

RedditAssistant.prototype.unhideLink = function(event, item) {
    Reddit.unhideLink(item.id);
    var row = event.target.up('.redditRow');
    row.removeClassName("hidden");
    item.hidden = false;
}

RedditAssistant.prototype.download = function(url) {
    this.controller.serviceRequest('palm://com.palm.downloadmanager/', {
        method: 'download', 
        parameters: {
            target: url,
        },
        onFailure : function (e){
            this.controller.showAlertDialog({
                title: 'Unable to download file',
                message: e.url + ' could not be downloaded. Please try again later.',
                choices: [{label:'OK', value:'ok', type:'secondary'}]
            });
        }.bind(this)
    });
}

RedditAssistant.prototype.tapEntry = function(event) {
    if (event.originalEvent.target.match('.vote *, .vote, .counter *, .counter')) {
        if (!Reddit.modhash) {
            // TODO: Either acquire a modhash, or complain about the lack of it.
            return;
        }
        if (Reddit.currentAccount.username)
            this.controller.popupSubmenu({
                placeNear: event.originalEvent.target,
                items: [
                    {label: 'Vote Up', command: 'up'},
                    {label: 'Unvote', command: 'clear'},
                    {label: 'Vote Down', command: 'down'}
                ],
                onChoose: function(command) {
                    if (command) {
                        this.listItemVote(event.originalEvent, event.item, command);
                    }
                }
            });
        return;
    }
    if (event.originalEvent.target.match('.options *, .options')) {
        if (event.item.saved)
            var saveItem = {label: 'Unsave', command: 'unsave'};
        else
            var saveItem = {label: 'Save', command: 'save'};
        this.controller.popupSubmenu({
            placeNear: event.originalEvent.target,
            items: [
                {label: 'Comments', command: 'comments'},
                saveItem,
                // {label: 'Report', command: 'report'},
                {label: 'Hide', command: 'hide'},
                {label: 'Shirt', command: 'shirt'},
                {label: 'Download', command: 'download'}
            ],
            onChoose: function(command) {
                switch (command) {
                    case 'comments':
                        this.openComments(event.item);
                        break;
                    case 'save':
                        this.saveLink(event.originalEvent, event.item);
                        break;
                    case 'unsave':
                        this.unsaveLink(event.originalEvent, event.item);
                        break;
                    case 'hide':
                        this.hideLink(event.originalEvent, event.item);
                        break;
                    case 'download':
                        this.download(event.item.url);
                        break;
                    case 'shirt':
                        this.controller.serviceRequest('palm://com.palm.applicationManager', {
                            method: "open",
                            parameters: {
                                target: 'http://www.reddit.com/r/' + event.item.subreddit + '/shirt/' + event.item.id + '/'
                            }
                        });
                        break;
                }
            }.bind(this)
        })
        return;
    }
    
    // It's not something else, let's open this sucker!
    var url = event.item.url;
    var row = event.originalEvent.target;
    if (!row.match('.redditRow'))
        row = event.originalEvent.target.up('.redditRow');
    var lastTapped = $('lastTappedThing');
    if (lastTapped)
        lastTapped.id = undefined;
    row.id = 'lastTappedThing';
    if (Reddit.urlIsImage(url)) {
        // event.target.mojo.revealItem(event.index, false);   // False, because when we push the scene,
        //                                                     // animation dies and doesn't recover
        OpenImageCard(url, event.item.thumbnail);
    } else {
        this.controller.serviceRequest('palm://com.palm.applicationManager', {
            method: "open",
            parameters: {
                target: url
            }
        });
        // event.target.mojo.revealItem(event.index, true);
    }
}
