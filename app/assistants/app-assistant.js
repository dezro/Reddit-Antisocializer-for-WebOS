Reddit = {};

// API constants
Reddit.url = 'http://www.reddit.com/';
Reddit.sub = 'r/';
Reddit.ext = '.json';

Reddit.api = {}
Reddit.api.vote = 'api/vote/';
Reddit.api.login = 'api/login/';
Reddit.api.save = 'api/save/';
Reddit.api.unsave = 'api/unsave/';
Reddit.api.hide = 'api/hide/';
Reddit.api.unhide = 'api/unhide/';

Reddit.linkType = 't3_';
Reddit.commentType = 't1_';

Reddit.headerUrl = 'http://static.reddit.com/reddit.com.header.png';

Reddit.accounts = [{}];
Reddit.preferences = {};

Reddit.frontPage = '';
Reddit.subredditCommandPrefix = 'do-changeRedditTo-';

Reddit.whatsHot = 'hot/';
Reddit.whatsNew = 'new/';
Reddit.whatsControversial = 'controversial/';
Reddit.whatsTop = 'top/';

Reddit.reddits = 'reddits/';
Reddit.myReddits = 'reddits/mine/';

Reddit.maxTries = 5;

Reddit.linksPerStep = 50;

Reddit.currentAccount = {};

Reddit.modhash = null;
Reddit.modhashAge = null;
Reddit.modhashTimeout = 21600000; // Six hours, in milliseconds.

Reddit.subredditMenuModel = [];

Reddit.loadAccounts = function() {
    var accountCookie = new Mojo.Model.Cookie('accounts');
    var accounts = accountCookie.get();
    if (accounts)
        Reddit.accounts = accounts;
}

Reddit.saveAccounts = function() {
    var accountCookie = new Mojo.Model.Cookie('accounts');
    accountCookie.put(Reddit.accounts);
}

Reddit.getLinks = function(subreddit, section, args, tries) {
    if (tries === undefined)
        tries = 0;
    if (!section)
        section = Reddit.whatsHot;
    
    var url;
    if (subreddit)
        url = Reddit.url + Reddit.sub + subreddit + '/';
    else
        url = Reddit.url;
    url = url + section + Reddit.ext;
    
    args.limit = Reddit.linksPerStep;
    
    var headers = { cookie: Reddit.currentAccount.cookie };
    
    new Ajax.Request(url, {
        method:'get',
        parameters:args,
        requestHeaders:headers,
        onSuccess: function(request) {
            var reply = request.responseText.evalJSON();
            var newArray = Array();
            var oldArray = reply.data.children;
            for (var i=0, len=oldArray.length; i < len; i++) {
                var dat = oldArray[i].data;
                if (dat.selftext_html)
                    dat.selftext_html = dat.selftext_html.unescapeHTML();
                newArray.push(dat);
            }
            Mojo.Controller.getAppController().sendToNotificationChain({
                type: "linksUpdate",
                links: newArray,
                after: reply.data.after,
                before: reply.data.before
            });
        },
        onFailure: function(request) {
            throw "HTTP Failure.";
        },
        onException: function(request, e) {
            Mojo.Log.logException(e, "getLinks");
            Mojo.Controller.getAppController().sendToNotificationChain({
                type:"linksUpdateProblem",
                subreddit:subreddit,
                section:section,
                args:args,
                tries:tries+1
            });
        }
    });
}

Reddit.getComments = function(thingId, subreddit, permalink, sort, tries) {
    if (tries === undefined)
        tries = 0;
    
    var url = Reddit.url + Reddit.sub + subreddit + '/' + 'comments/' + thingId + '/';
    if (permalink)
        url += '_/' + permalink + '/';
    url += Reddit.ext;
    
    var args = {};
    if (sort)
        args.sort = sort;
    
    var headers = { cookie: Reddit.currentAccount.cookie };
    
    new Ajax.Request(url, {
        method:'get',
        parameters:args,
        requestHeaders:headers,
        onSuccess: function(request) {
            var reply = request.responseText.evalJSON();
            var link = reply[0].data.children[0].data;
            var comments = reply[1].data.children;
            
            Mojo.Controller.getAppController().sendToNotificationChain({
                type: "commentsUpdate",
                id: thingId,
                link: link,
                permalink: permalink,
                comments: comments
            });
        },
        onFailure: function(request) {
            throw "HTTP Failure.";
        },
        onException: function(request, e) {
            Mojo.Log.logException(e, "getComments");
            Mojo.Controller.getAppController().sendToNotificationChain({
                type:"commentsUpdateProblem",
                thingId:thingId,
                subreddit:subreddit,
                permalink:permalink,
                sort:sort,
                tries:tries+1
            });
        }
    });
}

Reddit.login = function(account) {
    var url = Reddit.url + Reddit.api.login + Reddit.ext;
    new Ajax.Request(url, {
        parameters: { user: account.username, passwd: account.password },
        onSuccess: function(response) {
            var cookie = response.getResponseHeader('Set-Cookie');
            if (cookie && cookie.startsWith('reddit_session')) {
                account.cookie = cookie.substring(0, cookie.indexOf(';'));
                Mojo.Controller.getAppController().sendToNotificationChain(
                    {type:"loginSuccessful"});
            } else
                Mojo.Controller.getAppController().sendToNotificationChain(
                    {type:"loginFailed"});
        },
        onFailure: function(response) {
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"loginFailed"});
        },
        onException: function(response, err) {
            Mojo.Log.logException(err, "login");
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"loginFailed"});
        }
    })
}

Reddit.logout = function() {
    Reddit.currentAccount = {};
}

Reddit.updateSubredditMenu = function(callback, subreddits, after) {
    if (!subreddits)
        subreddits = [];
    var headers = {}
    var url;
    var params = {};
    if (Reddit.currentAccount.username) {
        url = Reddit.url + "reddits/mine/subscriber/.json";
        headers.cookie = Reddit.currentAccount.cookie;
        params.limit = 200;
    } else {
        url = Reddit.url + "reddits/.json";
        params.limit = 30;
    }
    if (after) {
        params.count = subreddits.length;
        params.after = after;
    }
    new Ajax.Request(url, {
        method: 'get',
        requestHeaders: headers,
        parameters: params,
        onSuccess: function(response) {
            var newSubreddits = response.responseText.evalJSON();
            subreddits = subreddits.concat(newSubreddits.data.children);
            if (newSubreddits.data.after && Reddit.currentAccount.username) {
                Reddit.updateSubredditMenu(callback, subreddits, newSubreddits.data.after);
            } else {
                var items = [];
                items.push({ label: "Front Page", command: Reddit.frontPage });
                subreddits.each(function(subreddit) {
                    if (!Reddit.currentAccount.username && subreddit.data.over18)
                        return;
                    var item = {}
                    var url = subreddit.data.url
                    item.label = url.substring(3, url.length-1);
                    item.command = item.label;
                    items.push(item);
                });
                Reddit.subredditMenuModel = items;
                if (callback)
                    callback(Reddit.subredditMenuModel);
            }
        }
    });
}

Reddit.checkEnvelope = function() {
    if (!Reddit.currentAccount.username)
        return;
    var url = Reddit.url + "message/inbox/.json";
    var params = {mark: false, limit: 1};
    new Ajax.Request(url, {
        method: 'get',
        requestHeaders: { cookie: Reddit.currentAccount.cookie },
        parameters: params,
        onSuccess: function(response) {
            var json = response.responseText.evalJSON();
            if (json.data.children[0].data['new']) {
                Mojo.Controller.getAppController().sendToNotificationChain(
                    {type: "updateEnvelope", color:"red"});
            } else {
                Mojo.Controller.getAppController().sendToNotificationChain(
                    {type: "updateEnvelope", color:"grey"});
            }
        }
    })
}

Reddit.startCheckingEnvelope = function() {
    Reddit.envelopeCheckID = window.setInterval(Reddit.checkEnvelope, 5 * 60 * 1000);
}

Reddit.stopCheckingEnvelope = function() {
    window.clearInterval(Reddit.envelopeCheckID);
}

Reddit.vote = function(id, direction, type) {
    if (!Reddit.currentAccount.username)
        return;
    if (!type)
        type = Reddit.linkType;
    
    // Note: Doesn't check if modhash is valid.
    var url = Reddit.url + Reddit.api.vote + Reddit.ext;
    new Ajax.Request(url, {
        requestHeaders: { cookie: Reddit.currentAccount.cookie },
        parameters: { id: type + id, dir: direction, uh: Reddit.modhash },
        onFailure: function(response) {
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"voteFailed", id:id});
        },
        onException: function(response, err) {
            Mojo.Log.logException(err, "vote");
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"voteFailed", id:id});
        }
    });
}

Reddit.saveLink = function(id, type) {
    if (!Reddit.currentAccount.username)
        return;
    if (!type)
        type = Reddit.linkType;
    
    var url = Reddit.url + Reddit.api.save + Reddit.ext;
    new Ajax.Request(url, {
        requestHeaders: { cookie: Reddit.currentAccount.cookie },
        parameters: { id: type + id, uh: Reddit.modhash },
        onFailure: function(response) {
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"saveLinkFailed", id:id});
        },
        onException: function(response, err) {
            Mojo.Log.logException(err, "saveLink");
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"saveLinkFailed", id:id});
        }
    });
}

Reddit.unsaveLink = function(id, type) {
    if (!Reddit.currentAccount.username)
        return;
    if (!type)
        type = Reddit.linkType;
    
    var url = Reddit.url + Reddit.api.unsave + Reddit.ext;
    new Ajax.Request(url, {
        requestHeaders: { cookie: Reddit.currentAccount.cookie },
        parameters: { id: type + id, uh: Reddit.modhash },
        onFailure: function(response) {
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"unsaveLinkFailed", id:id});
        },
        onException: function(response, err) {
            Mojo.Log.logException(err, "unsaveLink");
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"unsaveLinkFailed", id:id});
        }
    });
}

Reddit.hideLink = function(id, type) {
    if (!Reddit.currentAccount.username)
        return;
    if (!type)
        type = Reddit.linkType;
    
    var url = Reddit.url + Reddit.api.hide + Reddit.ext;
    new Ajax.Request(url, {
        requestHeaders: { cookie: Reddit.currentAccount.cookie },
        parameters: { id: type + id, uh: Reddit.modhash },
        onFailure: function(response) {
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"hideLinkFailed", id:id});
        },
        onException: function(response, err) {
            Mojo.Log.logException(err, "hideLink");
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"hideLinkFailed", id:id});
        }
    });
}

Reddit.unhideLink = function(id, type) {
    if (!Reddit.currentAccount.username)
        return;
    if (!type)
        type = Reddit.linkType;
    
    var url = Reddit.url + Reddit.api.unhide + Reddit.ext;
    new Ajax.Request(url, {
        requestHeaders: { cookie: Reddit.currentAccount.cookie },
        parameters: { id: type + id, uh: Reddit.modhash },
        onFailure: function(response) {
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"unhideLinkFailed", id:id});
        },
        onException: function(response, err) {
            Mojo.Log.logException(err, "unhideLink");
            Mojo.Controller.getAppController().sendToNotificationChain(
                {type:"unhideLinkFailed", id:id});
        }
    });
}

Reddit.getDocumentFromXHTML = function(xhtmlString) {
    parser = new DOMParser();
    return parser.parseFromString(xhtmlString, "application/xhtml+xml");
}

Reddit.getHeaderUrlFromDoc = function(doc) {
    headerImg = doc.querySelector("img#header-img");
    if (headerImg && headerImg.src)
        return headerImg.src;
    else
        return Reddit.headerUrl;
}

Reddit.updateModHashFromDoc = function(doc) {
    var uhs = doc.getElementsByName("uh");
    if (uhs && uhs[0] && uhs[0].value)
        Reddit.modhash = uhs[0].value;
}

Reddit.modHashValid = function() {
    if (Reddit.modhash && ((new Date() - Reddit.modhashAge) < Reddit.modhashTimeout))
        return true;
    return false;
}

Reddit.urlIsImage = function(url) {
    var lowurl = url.toLowerCase();
    return (lowurl.endsWith('.jpg') || lowurl.endsWith('.png') ||
        lowurl.endsWith('.gif') || lowurl.endsWith('.jpeg'))
}

Reddit.timeFormatter = function(time) {
    var now = new Date().getTime();
    var difference = Math.floor(now/1000 - time);
    var out = null;
    if (difference < 60) {
        out =  difference + " second";
    } else {
        difference = Math.floor(difference/60); // Minutes
        if (difference < 60) {
            out = difference + " minute";
        } else {
            difference = Math.floor(difference/60) // Hours
            if (difference < 24) {
                out = difference + " hour";
            } else {
                difference = Math.floor(difference/24) // Days
                if (difference > 1000)
                    return "years";
                else if (difference > 90)
                    return "months";
                out = difference + " day";
            } // Months and further out is harder.
        }
    }
    if (difference != 1) {
        out = out + 's';
    }
    return out;
}

Reddit.arrowFormatter = function(likes) {
    if (likes)
        return "likes";
    else if (likes == false)
        return "dislikes";
    else
        return "unvoted";
}

Reddit.commentScoreFormatter = function(ups, object) {
    return { score: ups - object.downs }
}

Reddit.thumbFormatter = function(thumbUrl) {
    if (!thumbUrl)
        return thumbUrl;
    start = thumbUrl.toLowerCase().slice(0,7);
    if (start != "http://" && start != "https:/") {
        return Reddit.url + thumbUrl.slice(1);
    }
    else
        return thumbUrl;
}

Reddit.savedFormatter = function(saved) {
    if (saved)
        return "saved";
    else
        return "unsaved";
}

Reddit.hiddenFormatted = function(hidden) {
    if (hidden)
        return "hidden";
    else
        return "";
}

function OpenImageCard(url, thumbUrl) {
    var name = 'img:'+url;
    var appController = Mojo.Controller.getAppController();
    var stageController = appController.getStageController(name);
    if (stageController){
        stageController.activate();
    } else {
        appController.createStageWithCallback({name: name, lightweight: true},
            function(newStage) {
                newStage.pushScene("imageView", {url:url, thumbUrl:thumbUrl});
            });
    }
}

function AppAssistant (appController) {

}

AppAssistant.prototype.setup = function() {
    
}

AppAssistant.prototype.considerForNotification = function(event) {
    if (event) {
        switch (event.type) {
            case "linksUpdateProblem":
                if (event.tries < Reddit.maxTries) {
                    Reddit.getLinks(event.subreddit, event.section, event.args, event.tries);
                } else {
                    Mojo.Controller.getAppController().sendToNotificationChain({
                        type: "bigError",
                        message: "Problem fetching items." //TODO: explain better
                    });
                }
                break;
        }
    }
}
