//تزریق اسکریپت به صفحه اصلی
var s = document.createElement('script');
s.src = chrome.extension.getURL('inject.js');
s.onload = function () {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);

// تابع نظارت بر دام
var observeDOM = (function () {
    var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
        eventListenerSupported = window.addEventListener;

    return function (obj, callback) {
        if (obj === null) return;
        if (MutationObserver) {
            // define a new observer
            var obs = new MutationObserver(function (mutations, observer) {
                if (mutations[0].addedNodes.length || mutations[0].removedNodes.length)
                    callback(mutations);
            });
            // have the observer observe foo for changes in children
            obs.observe(obj, {
                childList: true,
                subtree: true
            });
        } else if (eventListenerSupported) {
            obj.addEventListener('DOMNodeInserted', callback, false);
            obj.addEventListener('DOMNodeRemoved', callback, false);
        }
    }
})();

// بافر
var buffer = document.createElement('ul');
buffer.id = "_instaext";
document.documentElement.appendChild(buffer);

function idGenerator() {
    var S4 = function () {
        return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
    };
    return (S4() + S4());
}

//اجرای دستور در صفحه
function Execute(code, callback, args) {
    "use strict";
    var id = idGenerator();
    var li = document.createElement('li');
    li.id = id;
    document.getElementById('_instaext').appendChild(li);
    observeDOM(li, function (args) {
        callback(li.innerText);
        li.remove();
    });
    args = args || {};
    var script = document.createElement('script');
    script.textContent = '(' + code + ')("' + id + '",' + JSON.stringify(args) + ')';
    (document.head || document.documentElement).appendChild(script);
    script.parentNode.removeChild(script);
}

//اجرای عملیات بر اساس محقق شدن شرط
function checkPeriodically(testfn, fn, once) {
    once = once || 100;
    if (once == 0) {
        fn(false);
    } else {
        if (testfn()) {
            fn(true);
        } else {
            setTimeout(function () {
                checkPeriodically(testfn, fn, once - 1);
            }, 100);
        }
    }
}

function isFunction(obj) {
    return !!(obj && obj.constructor && obj.call && obj.apply);
};

function clog() {
    for (var i in arguments) {
        console.log(arguments[i]);
    }
}

// اتصال به کدهای پشتی
var pageId = idGenerator();
var port;

setTimeout(function () {

    var name = 'page.' + pageId;

    port = chrome.runtime.connect({
        name: name
    });
    port.onMessage.addListener(function (msg) {
        if (msg.action !== undefined && controller[msg.action] !== undefined) {
            if (controller[msg.action] !== undefined) {
                controller[msg.action](msg);
            }
        }
    });

}, 1000);

//ارسال پاسخ
function postCallback(id, msg) {
    msg.action = "callback." + id;
    port.postMessage(msg);
}

//کنترلر صفحه
var controller = {
    /*
     * رفتن به صفحه پروفایل کاربر
     * صفحه مجددا لود می شود
     * username : نام کاربر
     */
    gotoProfile: function (msg) {
        clog('go to profile request:', msg);
        window.location.href = '/' + msg.username + '/';
    },

    /*
     * رفتن به صفحه اصلی
     * id: شناسه بازگشت
     */
    gotoHomePage: function (msg) {

        var profileLink = document.querySelector('#react-root>section>nav>div>div>div>div:nth-child(3)>div>div:nth-child(3)>a');
        if (profileLink != null) {
            window.location.href = profileLink.getAttribute('href');
        } else {

        }
    },

    getFollowersCount: function (msg) {
        var span = document.querySelector('#react-root>section>main>article>header>div:nth-child(2)>ul>li:nth-child(2)>a>span');
        if (span != null) {
            msg.callback({
                Result: span.textContent
            });
        } else {
            //error
            msg.callback({
                Result: 0
            });
        }
    },
    getFollowingsCount: function (msg) {
        var span = document.querySelector('#react-root>section>main>article>header>div:nth-child(2)>ul>li:nth-child(3)>a>span');
        if (span != null) {
            msg.callback({
                Result: span.textContent
            });
        } else {
            //error
            msg.callback({
                Result: 0
            });
        }
    },

    /**
     * باز کردن پنجره فالورهای صفحه
     * id: //
     */
    openFollowers: function (msg) {
        clog('open followers requested', msg);
        var a = document.querySelector('#react-root>section>main>article>header>div:nth-child(2)>ul>li:nth-child(2)>a');
        if (a != null) {
            var query;
            Execute(function (id) {

                window.registerRequest(id, '/query/');
            }, function (result) {
                query = JSON.parse(result);
                clog('query result selected:', query);
            });
            a.click();
            checkPeriodically(function () {
                return query!=undefined;
            }, function (result) {
                clog('condition is ok',query);
                postCallback(msg.callbackId, {
                    result: result,
                    response: query
                });
            });
        } else {
            postCallback(msg.callbackId, {
                result: false
            });
        }
    },
    /**
     * لود بیشتر فالورها بوسیله اسکرول
     * id: //
     */
    loadMoreFollowers: function (msg) {
        var container = document.querySelector('div>div[role=dialog]>div:nth-child(2)>div>div:nth-child(2)');
        var query;
        Execute(function (id) {
            window.registerRequest(id, '/query/');
        }, function (result) {
            //امکان وجود خطا
            query = JSON.parse(result);
        });
        setTimeout(function () {
            container.scrollTop = container.scrollHeight;
            checkPeriodically(function () {
                return query != undefined;
            }, function (result) {
                postCallback(msg.callbackId, {
                    result: result,
                    response: query
                });
            });
        }, 100);
    },
    /**
     * فالو کردن کاربر از لیست باز شده
     * callbackId: //
     * userId: شناسه کاربر
     * username: نام کاربر
     */
    followFromList: function (msg) {
        var userLink = document.querySelector('div>div[role=dialog]>div:nth-child(2)>div>div:nth-child(2)>ul>li a[title="' + msg.username + '"]');
        if (userLink != null) {
            var button = userLink.parentElement.parentElement.parentElement.parentElement.querySelector('button');
            if (button != null) {
                Execute(function (id, args) {
                    window.registerRequest(id, '/web/friendships/' + args.userId + '/follow/');
                }, function (result) {
                    //امکان وجود خطا
                    clog('follow from list completed:', result);
                    query = JSON.parse(result);
                    postCallback(msg.callbackId, {
                        result: true,
                        response: query
                    });
                }, {
                    userId: msg.userId
                });
                button.click();
            } else {
                clog('follow from list:button not found');
                postCallback(msg.callbackId, {
                    result: false
                });
            }
        } else {
            clog('follow from list:user not found');
            postCallback(msg.callbackId, {
                result: false
            });
        }
    },
    /**
     * بازگرداندن نام کاربری صفحه ای که درون آن هستیم
     */
    getCurrentPage: function (msg) {
        clog('get current page request:', msg)
        var profileLink = document.querySelector('span>section>main>article>header>div:nth-child(2)>div>h1');
        if (profileLink != null) {
            clog('get current page:found: ', profileLink.innerText);
            postCallback(msg.callbackId, {
                result: true,
                username: profileLink.innerText
            });
        } else {
            clog('get current page:not found:');
            postCallback(msg.callbackId, {
                result: false
            });
        }
    },
    /**
     * دریافت اطلاعات کاربر لاگین کرده
     */
    getCurrentUser: function (msg) {
        clog('get current user request:', msg)
        Execute(function (id) {
            window.getViewer(id);
        }, function (result) {
            //امکان وجود خطا
            user = JSON.parse(result);
            postCallback(msg.callbackId, {
                result: true,
                user: user
            });
        });
    },

    getSharedData: function (msg) {
        clog('get shared data:', msg);
        Execute(function (id) {
            window.getSharedData(id);
        }, function (result) {
            //امکان وجود خطا
            sharedData = JSON.parse(result);
            postCallback(msg.callbackId, {
                result: true,
                sharedData: sharedData
            });
        });
    },

    /**
     * باز کردن لیست فالوینگ ها
     */
    openFollowings: function (msg) {
        clog('open followings request', msg);
        var a = document.querySelector('#react-root>section>main>article>header>div:nth-child(2)>ul>li:nth-child(3)>a');
        if (a != null) {
            var query;
            Execute(function (id) {
                window.registerRequest(id, '/query/');
            }, function (result) {
                query = JSON.parse(result);
                clog('query result selected:', query);
            });
            a.click();
            checkPeriodically(function () {
                return document.querySelector('div>div[role=dialog]>div:nth-child(2)>div>div:nth-child(2)>ul>li:last-child>div.spiSpinner') == null &&
                    document.querySelectorAll('div>div[role=dialog]>div:nth-child(2)>div>div:nth-child(2)>ul>li').length > 0;
            }, function (result) {
                clog('condition is ok');
                postCallback(msg.callbackId, {
                    result: result,
                    response: query
                });
            });
        } else {
            postCallback(msg.callbackId, {
                result: false
            });
        }
    },

    /**
     * لود فالوینگ های بیشتر
     */
    loadMoreFollowings: function (msg) {
        var container = document.querySelector('div>div[role=dialog]>div:nth-child(2)>div>div:nth-child(2)');
        var query;
        Execute(function (id) {
            window.registerRequest(id, '/query/');
        }, function (result) {
            //امکان وجود خطا
            query = JSON.parse(result);
        });
        setTimeout(function () {
            container.scrollTop = container.scrollHeight;
            checkPeriodically(function () {
                return query != undefined;
            }, function (result) {
                postCallback(msg.callbackId, {
                    result: result,
                    response: query
                });
            });
        }, 100);
    },

    /**
     * آنفالو کردن از لیست
     */
    unfollowFromList: function (msg) {
        var userLink = document.querySelector('div>div[role=dialog]>div:nth-child(2)>div>div:nth-child(2)>ul>li a[title="' + msg.username + '"]');
        if (userLink != null) {
            var button = userLink.parentElement.parentElement.parentElement.parentElement.querySelector('button');
            if (button != null) {
                Execute(function (id, args) {
                    window.registerRequest(id, '/web/friendships/' + args.userId + '/unfollow/');
                }, function (result) {
                    //امکان وجود خطا
                    clog('unfollow from list completed:', result);
                    query = JSON.parse(result);
                    postCallback(msg.callbackId, {
                        result: true,
                        user: {
                            userId: msg.userId,
                            username: msg.username
                        },
                        response: query
                    });
                }, {
                    userId: msg.userId
                });
                button.click();
            } else {
                clog('unfollow from list:button not found');
                postCallback(msg.callbackId, {
                    result: false
                });
            }
        } else {
            clog('unfollow from list:user not found');
            postCallback(msg.callbackId, {
                result: false
            });
        }
    },

    getProfileInfo: function (msg) {
        clog('get profile:', msg)
        Execute(function (id) {
            window.getProfile(id);
        }, function (result) {
            //امکان وجود خطا
            user = JSON.parse(result);
            clog('profile:', user);
            if (user == null) {
                postCallback(msg.callbackId, {
                    result: false
                });
            } else {
                postCallback(msg.callbackId, {
                    result: true,
                    user: user
                });
            }
        });
    },
    unfollowFromPage: function (msg) {
        var button = document.querySelector('span>section>main>article>header>div:nth-child(2)>div>span:nth-child(2)>span:nth-child(1)>button');
        if (button == null) {
            button = document.querySelector('span>section>main>article>header>div:nth-child(2)>div>span:nth-child(2)>button');
        }
        if (button != null) {
            Execute(function (id, args) {
                window.registerRequest(id, '/web/friendships/' + args.userId + '/unfollow/');
            }, function (result) {
                //امکان وجود خطا
                clog('unfollow from page completed:', result);
                query = JSON.parse(result);
                postCallback(msg.callbackId, {
                    result: true,
                    user: {
                        userId: msg.userId,
                        username: msg.username
                    },
                    response: query
                });
            }, {
                userId: msg.userId
            });
            button.click();
        } else {
            clog('unfollow button not found');
            postCallback(msg.callbackId, {
                result: false
            });
        }
    },
    /**
     * استخراج پست های اولیه صفحه پس از لود صفحه
     * { result: bool, media: { count: int, page_info: {}, nodes: [] } }
     */
    getPosts: function (msg) {
        clog('get posts:', msg)
        Execute(function (id) {
            window.getPosts(id);
        }, function (result) {
            //امکان وجود خطا
            var media = JSON.parse(result);
            clog('posts:', media);
            if (media == null) {
                postCallback(msg.callbackId, {
                    result: false
                });
            } else {
                postCallback(msg.callbackId, {
                    result: true,
                    media: media
                });
            }
        });
    },
    /**
     * لود پست های بیشتر برای صفحه
     * {
     *   result:bool,
     *   response:{ status:int , data: { status:'ok', media:{ count:int, page_info:{}, nodes:[] } }}
     * }
     */
    loadMorePosts: function (msg) {
        clog('load more posts:', msg);
        var button = document.querySelector('span>section>main>article>div:nth-child(2)>div:nth-child(3)>a');

        Execute(function (id, args) {
            window.registerRequest(id, '/query/');
        }, function (result) {
            clog('load more posts:', result);
            var response = JSON.parse(result);
            postCallback(msg.callbackId, {
                result: true,
                response: response
            });
        }, {
            userId: msg.userId
        });

        if (button != null) {
            clog('load more from button');
            button.click();
        } else {
            clog('load more by scroll down page');
            setTimeout(function () {
                document.body.scrollTop = document.body.scrollHeight;
            }, 100);
        }
    },
    /**
     * باز کردن پست
     * {
     *   result: bool,
     *   response: { result: int, data: { media: { likes: {}, comments: {}, id: string } }
     * }
     */
    openPost: function (msg) {
        clog('open post:', msg);
        var postLink = document.querySelector('a[href^="/p/' + msg.code + '/?taken-by="]');
        if (postLink != null) {
            Execute(function (id, args) {
                window.registerRequest(id, args.url);
            }, function (result) {
                clog('open post:', result);
                var response = JSON.parse(result);
                postCallback(msg.callbackId, {
                    result: true,
                    response: response
                });
            }, {
                url: postLink.getAttribute('href') + '&__a=1'
            });
            postLink.click();
        } else {
            postCallback(msg.callbackId, {
                result: false
            });
        }
    },
    /**
     * لود کامنت های بیشتر
     * {
     *   result: bool,
     *   response: { status: int, data: { status: 'ok', comments: { } }}
     * }
     */
    loadMoreComments: function (msg) {
        clog('load more comments:', msg);
        var moreCommentButton = document.querySelector('div[role="dialog"]>div:nth-child(2)>div:nth-child(1)>article>div:nth-child(3)>ul>li:nth-child(1)>button');
        if (moreCommentButton == null) {
            clog('propably comment is missing,check 2nd child');
            moreCommentButton = document.querySelector('div[role="dialog"]>div:nth-child(2)>div:nth-child(1)>article>div:nth-child(3)>ul>li:nth-child(2)>button');
        }
        if (moreCommentButton != null) {
            if (moreCommentButton.textContent.indexOf('comments') != -1) {
                Execute(function (id) {
                    window.registerRequest(id, '/query/');
                }, function (result) {
                    clog('load more comments response:', result);
                    var response = JSON.parse(result);
                    postCallback(msg.callbackId, {
                        result: true,
                        response: response
                    });
                });

                if (moreCommentButton.textContent.indexOf('view all') == 0) {
                    moreCommentButton.click();
                }
                setTimeout(function () {
                    moreCommentButton.click();
                }, 100);
            } else {
                clog('button found but comments button not found');
            }
        } else {
            clog('more button not found');
        }
    },

    followFromPage: function (msg) {
        var button = document.querySelector('span>section>main>article>header>div:nth-child(2)>div>span:nth-child(2)>span:nth-child(1)>button');
        if (button == null) {
            button = document.querySelector('span>section>main>article>header>div:nth-child(2)>div>span:nth-child(2)>button');
        }
        if (button != null) {
            Execute(function (id, args) {
                window.registerRequest(id, '/web/friendships/' + args.userId + '/follow/');
            }, function (result) {
                //امکان وجود خطا
                clog('follow from page completed:', result);
                query = JSON.parse(result);
                postCallback(msg.callbackId, {
                    result: true,
                    user: {
                        userId: msg.userId,
                        username: msg.username
                    },
                    response: query
                });
            }, {
                userId: msg.userId
            });
            button.click();
        } else {
            clog('unfollow button not found');
            postCallback(msg.callbackId, {
                result: false
            });
        }
    },

    getProfilePictureUrl: function (msg) {
        var picture = document.querySelector('span>section>main>article>header>div:nth-child(1)>img');
        if (picture != null) {
            postCallback(msg.callbackId, {
                result: true,
                url: picture.getAttribute('src')
            });
        } else {
            clog('picture not found');
            postCallback(msg.callbackId, {
                result: false
            });
        }
    },
    getMediaUrl: function (msg) {
        var img = document.querySelector('div[role="dialog"]>div:nth-child(2)>div:nth-child(1)>article>div:nth-child(2) img');
        if (img != null) {
            var urls = new Array();
            urls.push(img.getAttribute('src'));
            if (img.previousSibling != null) {
                //ویدیو
                urls.push(img.previousSibling.getAttribute('src'));
            }
            postCallback(msg.callbackId, {
                result: true,
                urls: urls
            });
        } else {
            clog('media not found');
            postCallback(msg.callbackId, {
                result: false
            });
        }
    },

    /**
    * رفتن به صفحه اصلی
    */
    gotoFeedPage: function (args) {
        document.body.scrollTop = 0;
        window.location.href = 'https://www.instagram.com/';
    },

    getFeedPageInfo: function (msg) {
        clog('get feed page info:', msg);
        Execute(function (id) {
            window.getSharedData(id);
        }, function (result) {
            //امکان وجود خطا
            sharedData = JSON.parse(result);
            postCallback(msg.callbackId, {
                result: true,
                feed: sharedData.entry_data.FeedPage[0].feed
            });
        });
    },

    loadMoreFeeds: function (msg) {
        clog('load more feeds:', msg);

        Execute(function (id) {
            window.registerRequest(id, '/query/');
        }, function (result) {
            clog('load more feeds:', result);
            var response = JSON.parse(result);
            postCallback(msg.callbackId, {
                result: true,
                response: response
            });
        });

        clog('load more by scroll down page');
        setTimeout(function () {
            document.body.scrollTop = document.body.scrollHeight;
        }, 1000);
    },
     
    /**
    * لایک پست از صفحه فید
    */
    likeFromFeed: function (msg) {
        clog('like from feed:', msg);
        var a = document.querySelector('a[href="/p/' + msg.code + '/"]');
        if (a != null) {
            var like = a.parentElement.parentElement.querySelector('div:nth-child(3)>section:last-child>a');
            if (like != null) {
                like.parentElement.parentElement.parentElement.querySelector('a:nth-child(1)').focus();
                Execute(function (id, args) {
                    window.registerRequest(id, '/web/likes/' + args.postId + '/like/');
                }, function (result) {
                    //امکان وجود خطا
                    clog('like completed:', result);
                    query = JSON.parse(result);
                    postCallback(msg.callbackId, {
                        result: true,
                        post: {
                            id: msg.id,
                            userId: msg.userId
                        },
                        response: query
                    });
                }, {
                    postId: msg.id
                });
                like.click();
            } else {
                clog('like link not found');
            }
        } else {
            clog('feed post not found');
        }
    },

    /**
    * حذف پست های صفحه فید 
    */

    removeFeedPosts: function (msg) {
        clog('remove posts from feed:', msg);
        setTimeout(function () {
            document.body.scrollTop = 0;
            var postContainer = document.querySelector('body>span>section:first-child>main>section:first-child>div:first-child>div:first-child');
            if (postContainer != null) {
                for (var i = 0; i < msg.count; i++) {
                    var article = postContainer.querySelector('article:first-child');
                    if (article != null) {
                        clog('remove article!');
                        article.remove();
                    } else {
                        break;
                    }
                }
            }
            postCallback(msg.callbackId, {
                result: true
            });
        }, 1000);
    }
};

/**
 * جلوگیری از لود شدن تصاویر
 */
/**
var skipImages = false;
observeDOM(document, function (args) {
    if (skipImages) {
        for (var i in args) {
            args[i].addedNodes.forEach(function (value) {
                if (isFunction(value.querySelectorAll)) {
                    value.querySelectorAll('img').forEach(function (img) {
                        img.removeAttribute('src');
                    });
                }
            });
        }
    }
});
*/
/*
document.querySelectorAll('script').forEach(function(node){
    var src= node.getAttribute('src');
    if(node.innerText.indexOf('connect.facebook.net')!=-1 ||(src!=null&&src.indexOf('facebook.net')!=-1) ){
        node.remove();
    }
});
*/
