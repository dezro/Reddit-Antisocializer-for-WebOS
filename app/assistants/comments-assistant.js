function CommentsAssistant(args) {
	/* this is the creator function for your scene assistant object. It will be passed all the 
	   additional parameters (after the scene name) that were passed to pushScene. The reference
	   to the scene controller (this.controller) has not be established yet, so any initialization
	   that needs the scene controller should be done in the setup function below. */
    
    this.linkId = args.linkId;
    this.subreddit = args.subreddit;
    this.permalink = args.permalink;
}

CommentsAssistant.prototype.setup = function() {
	/* this function is for setup tasks that have to happen when the scene is first created */
    if (this.controller.stageController.setWindowOrientation) {
        this.controller.stageController.setWindowOrientation("free");
    }
	Reddit.getComments(this.linkId, this.subreddit, this.permalink);
	if (!this.permalink)
	    $('permalink-header').hide();
		
	/* use Mojo.View.render to render view templates and add them to the scene, if needed. */
	
	/* setup widgets here */
	
	/* add event handlers to listen to events from widgets */
}

CommentsAssistant.prototype.activate = function(event) {
	/* put in event handlers here that should only be in effect when this scene is active. For
	   example, key handlers that are observing the document */
    document.body.addClassName('redditBlue');
}


CommentsAssistant.prototype.deactivate = function(event) {
	/* remove any event handlers you added in activate and do any other cleanup that should happen before
	   this scene is popped or another scene is pushed on top */
    document.body.removeClassName('redditBlue');
}

CommentsAssistant.prototype.cleanup = function(event) {
	/* this function should do any cleanup needed before the scene is destroyed as 
	   a result of being popped off the scene stack */
}

CommentsAssistant.prototype.drawPage = function() {
    if (this.link.selftext_html)
        this.link.selftext_html = this.link.selftext_html.unescapeHTML();
    var linkHtml = Mojo.View.render({
        template: 'comments/link',
        object: this.link,
        formatters: {
            created_utc: Reddit.timeFormatter,
            likes: Reddit.arrowFormatter
        }
    });
    var commentsHtml = this.renderCommentsList(this.commentsGlob);
    
    $('link').innerHTML = linkHtml;
    $('commentsList').innerHTML = commentsHtml;
    if (this.permalink)
        document.querySelector(".comment .body").addClassName("permalink");
    
    $('link').show();
    $('commentsList').show();
}

CommentsAssistant.prototype.renderCommentsList = function(comments, flip) {
    var repliesHtml;
    var commentHtml;
    var childrenClass;
    var commentHtmlList = [];
    if (flip)
        childrenClass = 'even';
    else
        childrenClass = 'odd';
    comments.each(function(comment) {
        if (comment.kind == 'more') {
            commentHtmlList.push("<div class=\"more-bar\" name=\"load-more\"  x-mojo-tap-highlight=\"momentary\">AND MORE</div>"); //todo
            return;
        }
        
        if (comment.data.replies)
            repliesHtml = this.renderCommentsList(comment.data.replies.data.children, !flip);
        else
            repliesHtml = '';
        
        comment.data.body_html = comment.data.body_html.unescapeHTML();
        commentHtml = Mojo.View.render({
            template: 'comments/comment',
            object: comment.data,
            attributes: {
                children: repliesHtml,
                childrenClass: childrenClass
            }, formatters: {
                created_utc: Reddit.timeFormatter,
                likes: Reddit.arrowFormatter,
                ups: Reddit.commentScoreFormatter
            }
        })
        commentHtmlList.push(commentHtml);
    }.bind(this));
    
    return commentHtmlList.join('\n');
}

CommentsAssistant.prototype.considerForNotification = function(event) {
    if (event) {
        switch (event.type) {
            case 'commentsUpdate':
                if (this.id == event.thingId) {
                    this.link = event.link;
                    this.commentsGlob = event.comments;
                    this.drawPage();
                }
                break;
            case 'updateEnvelope':
                // this.mailAndMe[0].icon = "envelope " + event.color;
                // this.controller.modelChanged(this.commandMenuModel);
                break;
            case 'bigError':
                // document.body.update(event.message);
                break;
        }
        //todo: voteFailed
    }
}
