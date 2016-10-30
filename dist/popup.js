function postMessage(t,e){callbacks[t.action]=e,port.postMessage(t)}function loadCtrl(t){void 0!==window[t]&&window[t].init()}function getTemplate(t,e){return e=e||{},void 0==templates[t]&&(templates[t]=doT.template($("#"+t+"-template").html())),templates[t](e)}function showTemplate(t,e){e=e||{},$("section#error").hide(),currentSection=t,void 0==templates[t]&&(templates[t]=doT.template($("#"+t+"-template").html()));var n=$("section#main");n.html(templates[t]({}))}function error(t){$("section#error").show(),$("section#error>div").text(t)}function clog(){for(var t in arguments)console.log(arguments[t])}var currentSection,templates={},callbacks={},port=chrome.extension.connect({name:"popup"});port.onMessage.addListener(function(t){if(void 0!=t.action&&null!=t.action&&0==t.action.indexOf("callback.")){var e=t.action.split(".")[1];void 0!==callbacks[e]&&(callbacks[e](t),delete callbacks[e])}});var mainCtrl={init:function(){postMessage({action:"activationStatus"},$.proxy(this.activationStatusReponse,mainCtrl))},initMain:function(){this.getCurrentTask()},initActivation:function(){},activationStatusReponse:function(t){t.result?postMessage({action:"loginStatus"},$.proxy(this.loginStatusResponse,mainCtrl)):(showTemplate("activation"),this.initActivation())},loginStatusResponse:function(t){t.result?(showTemplate("main"),this.initMain()):showTemplate("login")},getCurrentTask:function(){postMessage({action:"getCurrentTask"},$.proxy(this.getCurrentTaskResponse,this))},getCurrentTaskResponse:function(t){if($(".running-task").remove(),t.result){if($("section#main").find("ul").hide(),void 0!=t.task.waitUntil){var e=new Date(Date.parse(t.task.waitUntil))-new Date;if(e>0){var n=Math.floor(e/6e4),o=Math.floor(e%6e4/1e3);t.task.wait=(n>0?n.toString()+" دقیقه ":"")+o.toString()+" ثانیه "}}var i=getTemplate("running-task",t.task);$(i).insertBefore("ul"),$("#btn-stop").on("click",$.proxy(this.stopTask,this)),setTimeout($.proxy(this.getCurrentTask,this),500)}else{$("section#main").find("ul").show(),$("section#main").find("a").on("click",function(t){t.preventDefault();var e=$(this);loadCtrl(e.prop("target"))}),$("section#main").find("#donation").on("click",function(t){t.preventDefault();var e="http://www.reyhansoft.com/instachi/donate";chrome.tabs.create({url:e})});var s=this;$("section#main").find("#get-profile-pic").on("click",function(t){t.preventDefault(),postMessage({action:"getProfilePicture"},$.proxy(s.getProfilePictureResponse,s))}),$("section#main").find("#get-media").on("click",function(t){t.preventDefault(),postMessage({action:"getMedia"},$.proxy(s.getProfilePictureResponse,s))})}},stopTask:function(t){t.preventDefault(),postMessage({action:"stopTask"},$.proxy(this.stopTaskResponse,this))},stopTaskResponse:function(t){t.result?loadCtrl("mainCtrl"):error(t.message)},getProfilePictureResponse:function(t){t.result?($("#main-success").text("درخواست دانلود با موفقیت صادر شد"),$("#main-success").show(),setTimeout(function(){$("#main-success").hide()},5e3)):($("#main-error").text("امکان دانلود وجود ندارد!"),$("#main-error").show(),setTimeout(function(){$("#main-error").hide()},5e3))}};window.mainCtrl=mainCtrl,window.followCtrl={currentPage:null,init:function(){this.currentPage=null,postMessage({action:"getCurrentPage"},$.proxy(this.getCurrentPageResponse,this)),showTemplate("follow");var t=$("section#main"),e=this;t.find("a.button-return").on("click",function(t){t.preventDefault(),loadCtrl("mainCtrl")}),t.find("button").on("click",function(t){e.createTask()})},createTask:function(){var t=$("#pattern").val(),e={action:"createTask",type:"Follow",checkFollowHistory:$("#check-history").is(":checked"),startType:"auto",count:$("#count").val()};if("tag"==t){var n=$("#follow-tag").val().trim();if(""==n)return void error("هش تگ مورد نظر را وارد نمایید!");e.tag=n}else{if(null==this.currentPage)return void error("امکان فالو کردن از طریق صفحه جاری امکان پذیر نمی باشد");e.username=this.currentPage}e.pattern=t,postMessage(e,$.proxy(this.createTaskResponse,this))},createTaskResponse:function(t){t.result?loadCtrl("mainCtrl"):error(t.message)},getCurrentPageResponse:function(t){t.result&&(this.currentPage=t.username)}},window.unfollowCtrl={init:function(){showTemplate("unfollow");var t=$("section#main"),e=this;t.find("a.button-return").on("click",function(t){t.preventDefault(),loadCtrl("mainCtrl")}),t.find("#btn-run").on("click",function(t){e.createTask("auto")}),t.find("#btn-sync").on("click",function(t){e.createTask("manual")}),postMessage({action:"getFollowingsCount"},$.proxy(this.getFollowingsCountResponse,this)),postMessage({action:"getRequestsCount"},$.proxy(this.getRequestsCountResponse,this))},createTask:function(t){msg={action:"createTask",type:"Unfollow",pattern:t,checkFollowStatus:$("#check-follow-status").is(":checked"),checkRequests:$("#check-requests").is(":checked"),startType:"auto",count:$("#count").val()},postMessage(msg,$.proxy(this.createTaskResponse,this))},createTaskResponse:function(t){t.result?loadCtrl("mainCtrl"):error(t.message)},getRequestsCountResponse:function(t){t.result&&$("#requests-count").text(t.count)},getFollowingsCountResponse:function(t){t.result&&$("#followings-count").text(t.count)}},window.aboutCtrl={init:function(){showTemplate("about");var t=$("section#main");t.find("a.button-return").on("click",function(t){t.preventDefault(),loadCtrl("mainCtrl")}),t.find("#site-link").on("click",function(t){t.preventDefault();var e="http://www.reyhansoft.com/";chrome.tabs.create({url:e})})}},window.backupCtrl={init:function(){showTemplate("file");var t=$("section#main"),e=this;t.find("a.button-return").on("click",function(t){t.preventDefault(),loadCtrl("mainCtrl")}),t.find("#btn-backup").on("click",function(t){t.preventDefault(),postMessage({action:"backup"},$.proxy(e.backupToFile,e))}),t.find("#btn-restore").on("click",$.proxy(this.btnRestoreClick,this)),t.find("#file-input").on("change",$.proxy(this.readSingleFile,this)),t.find("#btn-confirm-restore").on("click",$.proxy(this.doRestore,this)),postMessage({action:"getViewer"},$.proxy(this.getViewerResponse,this))},getViewerResponse:function(t){this.viewer=t.viewer},btnRestoreClick:function(t){t.preventDefault(),$("#file-input").click()},backupToFile:function(t){$("#backup-message").show()},readSingleFile:function(t){var e=t.target.files[0];if(e){var n=new FileReader;n.onload=$.proxy(this.onloadFileEvent,this),n.onerror=function(t){},n.readAsText(e)}},onloadFileEvent:function(t){var e=t.target.result;void 0!==e&&null!=e&&(this.data=JSON.parse(e),void 0!=this.viewer&&this.data.id==this.viewer.id?($("#restore-warning").show(),$("#restore-warning").find("span").text(this.data.username)):error("نسخه پشتیبان مربوط به این حساب کاربری نمی باشد!"))},createTask:function(t){var e={action:"createTask",type:"Restore",data:t,startType:"auto"};postMessage(e,$.proxy(this.createTaskResponse,this))},createTaskResponse:function(t){t.result?loadCtrl("mainCtrl"):error(t.message)},doRestore:function(){this.createTask(this.data),delete this.data}},Zepto(function(t){loadCtrl("mainCtrl")});