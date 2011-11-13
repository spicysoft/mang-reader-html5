/*global $, _, _gaq, window, strings, App, $SceneAnimator */

/**
 * マンガを読み込み中のUI処理を行う MVCのコンポーネントに相当する処理を行う。
 *
 * @constructor
 */
function $Reader(_member) {
  var member = _member;
  var FPS = 33;
  var API_ROOT = '/api';
  var width = 0;
  var height = 0;

  var storyId;
  var storyMetaFile;
  var scenes;
  var sceneImages;
  var currentSceneIndex = 0;

  var isLoading = false;

  if (App.IE) {
    // canvasが実装されていないのでdivに置換
    // style="background: #000;"を定義しないとクリッカブルにならない
    $("#canvas").replaceWith(
        '<div id="canvas" style="background: #000;"></div>');
  }

  var act_start = App.isSmartPhone?"touchstart":"mousedown";
  var act_button = App.isSmartPhone?"touchend":"mouseup";

  var prevent_default = function(event) {
    if (App.IE) {
      event.returnValue = false;
    }else{
      event.preventDefault();
    }
  };

  var canvas;
  if (App.IE && App.IE_VER < 8) {
    width = $(window).width();
    height = $(window).height();
    $("#mangh5r").width(width);
    $("#mangh5r").height(height);
    $("#canvas").width(width);
    $("#canvas").height(height);
  } else {
    var reader = $("#mangh5r");
    width = reader.width();
    height = reader.height();
    canvas = $("#canvas")[0];
    canvas.width = width;
    canvas.style.width = width + "px";
    canvas.height = height;
    canvas.style.height = width + "px";
  }
  var SceneAnimator = new $SceneAnimator(width, height, FPS);

  /**
   * 画面描画
   * @return void
   */
  var paint = function() {
    var i = sceneImages[currentSceneIndex];
    if (i === undefined || !i.hasLoaded()) {
      return;
    }

    var x = SceneAnimator.x();
    var y = SceneAnimator.y();
    var w = i.width;
    var h = i.height;
    var dx = (width - w) / 2 + x;
    var dy = (height - h) / 2 + y;

    if (App.IE) {
      i.style.cssText = "position: absolute; top: " + dy + "px; left:" + dx + "px;";
      $("#canvas").empty().append(i);
    } else {
      var context = canvas.getContext("2d");

      context.fillStyle = canvas.style.background;
      context.fillRect(0, 0, width, height);

      //Android2.1以下のCanvas drawImageバグ対応
      //  画像が勝手にscreen.width/320でスケールされるので、描画前にこの比率に合わせてcanvasをスケールしておく
      //@see http://d.hatena.ne.jp/koba04/20110605/1307205438
      if(App.ANDROID21){
        context.save();
        var rate =  Math.sqrt(320/screen.width);
        context.scale(rate, rate);
      }
      context.drawImage(i, dx, dy);
      if(App.ANDROID21){
        context.restore();
      }
    }
  };

  var ajax = function(url, datatype, fnSuccess, fnError, method, cache){
    var settings = {
      'url' : url,
      'type' : method,
      'async' : true,
      'cache' : cache,
      'dataType' : datatype,
      'success' : function(json) {
        fnSuccess(json);
      },
      'error' : function(req, status, error) {
        console.log(this);
        console.log(status);
        console.log(error);
        fnError();
      }
    };
    $.ajax(settings);
  };

  var ajax_get = function(url, datatype, fnSuccess, fnError, cache){
    ajax(url, datatype, fnSuccess, fnError, 'get', cache);
  };

  var ajax_post = function(url, datatype, fnSuccess, fnError){
    ajax(url, datatype, fnSuccess, fnError, 'post', false);
  };

  /**
   * [サーバーAPIとの通信メソッド]
   *
   * Story Metaファイルを取得する
   *
   * @private
   * @param storyId   ストーリー番号
   * @param fnSuccess 成功時のコールバック
   * @param fnError   失敗時のコールバック
   * @returns void    非同期通信です。通信を開始後、完了をまたずにすぐに処理が戻ります。
   */
  var apiStoryMetaFile = function(storyId, fnSuccess, fnError) {
    ajax_get(API_ROOT + '/storyMetaFile/' + storyId, 'json', fnSuccess, fnError, true);
  };

  /**
   * [サーバーAPI]
   *
   * イイネ投票する
   */
  var apiVoteStory = function(comicId, storyId, value, fnSuccess, fnError){
    ajax_post('/api/voteStory/'+comicId + '/' + storyId + '/' + value ,
     'json', fnSuccess, fnError);
  };

  /**
   * [サーバーAPI]
   *
   * ブックマークする
   */
  var apiBookmark = function(comicId, fnSuccess, fnError){
    ajax_post('/api/bookmark/'+comicId, 'json', fnSuccess, fnError);
  };

  var updateSceneCount = function(){
    $("#progress_total").text(scenes.length);
    $("#progress_current").text(currentSceneIndex+1);
  };

  /**
   * 表示モードを通信エラーに切り替える
   */
  var showError = function() {
    $("#preview").show();
    $("#loading").hide();
    $("#reader").hide();
    $("#finish").hide();
    $("#error").show();
  };

  var goToNextStory = function(next_story_id, comic_id, param){
    var after_param = '';
    if(param !== ""){
      after_param = "?after="+param;
    }
    if(next_story_id === false){
      parent.document.location.href = '/comic/view/'+comic_id+'/story/_undelivered'+after_param;
    }else{
      if (member) {
        parent.document.location.href = '/comic/view/'+comic_id+'/story/'+next_story_id+after_param;
      } else {
        parent.document.location.href = '/comic/landing/nomember?next=/comic/view/'+
          comic_id+'/story/'+next_story_id;
      }
    }
  };

  /**
   * [サーバーAPIとの通信メソッド] サーバーからシーン画像を取得する
   *
   * @private
   * @return Image ただし非同期なので読み込み完了していることは保証されない
   */
  var apiSceneImage = function(sceneId) {
    var i = new Image();
    i.hasLoaded = function(){
      //IE9でImage.completeが動作しない場合があるので、
      //Image.widthを見てロードが完了したか判断する
      return this.width > 0;
    };
    i.src = API_ROOT + '/sceneImage/' + sceneId;
    return i;
  };

  /**
   * 指定したシーン番号のシーン読み込みを準備する。
   * またこの内部でプリロード、破棄処理も行う。 現在は一括ロード。
   */
  var fetchSceneImage = function(sceneIndex) {
    var under = sceneIndex - 4;
    var prefetch = sceneIndex + 12;
    for ( var n = 0; n < scenes.length; n++) {
      if (n < under && sceneImages[n] !== undefined) {
        sceneImages[n] = undefined;
      } else if (under <= n && n <= prefetch && sceneImages[n] === undefined) {
        sceneImages[n] = apiSceneImage(scenes[n].id);
      }
    }
  };

  /**
   * コマ毎の初期化
   * @return void
   */
  var jumpToScene = function(newSceneIndex) {
    hideMenu(2000);
    fetchSceneImage(newSceneIndex);
    currentSceneIndex = newSceneIndex;
    updateSceneCount();

    var args = {
      "comic_title"      : storyMetaFile.comic_title,
      "story_number"     : storyMetaFile.story_number,
      "story_title"      : storyMetaFile.story_title,
      "scene_number"     : newSceneIndex + 1,
      "number_of_scenes" : scenes.length
    };
    var format = _('hover_status');
    var title = App.sprintf(format, args);

    var i = sceneImages[currentSceneIndex];
    function onloaded() {
      var scene = scenes[currentSceneIndex];
      SceneAnimator.initializeWhenLoaded(i, scene["scroll_course"], scene["scroll_speed"]);
      $("#loading").hide();
      isLoading = false;
      paint();
    }

    if (i !== undefined && i.hasLoaded()) {
      onloaded();
    } else {
      isLoading = true;
      showMenu(2000,500);
      $("#loading").show();
      SceneAnimator.initializeWhenUnloaded();
      i.onload = onloaded;
    }
  };

  /**
   * 前のコマに戻る
   */
  var goPrevScene = function() {
    var prev = currentSceneIndex - 1;
    if (0 <= prev) {
      jumpToScene(prev);
    }
  };

  var hideFinished = function(){
    $("#finish").hide();
    $("#finish_actions").hide();
  };

  var activate_button = function(item, time){
    item.addClass("active");
    if(0 < time){
      setTimeout(function(){
        item.removeClass("active");
      },time);
    }
  };

  /**
   * スクロールをひとつ前に戻す
   *
   * @private
   * @return void
   */
  var goPrev= function(e) {
    activate_button($("#prev_scene"), 500);
    hideFinished();
    if (0 < currentSceneIndex) {
      goPrevScene();
    }
    prevent_default(e);
  };

  var show_first_click = function(e){
    activate_button($("#first_scene"), 500);
    hideFinished();
    jumpToScene(0);
    prevent_default(e);
  };

  var menu_click = function(e){
    showMenu(2000, 500);
    prevent_default(e);
  };

  var menu_mouse_over = function(e){showMenu(0);}
  var menuIsVisible = function(){
    return $("#menu").css("opacity") > 0.0;
  };

  var hideMenu = function(fadeout){
    if(!menuIsVisible()){
      //console.log("hideMenu:ignored");
      return;
    }
    //console.log("hideMenu:" + fadeout);
    $("#menu").unbind("mouseout", hideMenu);
    $("#menu").fadeTo(fadeout, "0.0", function(){
      $("#menu").css({cursor:"pointer"});
      $("#prev_scene").unbind(act_button, goPrev);
      $("#prev_scene").css({cursor:"default"});
      $("#first_scene").unbind(act_button, show_first_click);
      $("#first_scene").css({cursor:"default"});
      $("#menu").bind(act_start, menu_click);
      $("#menu").mouseover(menu_mouse_over);
    });
  };

  /**
   * メニューを表示する
   */
  var showMenu = function (lifetime, fadeout){
    if(menuIsVisible()){
      //console.log("showMenu:ignored");
      return;
    }
    //console.log("showMenu:" + lifetime);
    $("#menu").unbind(act_start, menu_click);
    $("#menu").unbind("mouseover", menu_mouse_over);
    $("#menu").show();
    $("#menu").css({cursor:"default", opacity:"1.0"});

    if(currentSceneIndex === 0){
      $("#prev_scene").hide();
      $("#first_scene").hide();
      $("#prev_scene_disable").show();
      $("#first_scene_disable").show();
    }else{
      $("#prev_scene").show();
      $("#first_scene").show();
      $("#prev_scene_disable").hide();
      $("#first_scene_disable").hide();
      $("#prev_scene").bind(act_button, goPrev);
      $("#prev_scene").css({cursor:"pointer"});
      $("#first_scene").bind(act_button, show_first_click);
      $("#first_scene").css({cursor:"pointer"});
    }

    if(0 < lifetime){
      //console.log("menu will hide:" + lifetime);
      setTimeout(function(){hideMenu(fadeout);}, lifetime);
    }else{
      //console.log("menu will not hide");
      $("#menu").mouseout(function(e){
        var rect = e.currentTarget.getClientRects()[0];
        if(e.clientX >= rect.left  &&
           e.clientX <= rect.right &&
           e.clientY >= rect.top   &&
           e.clientY <= rect.bottom ){
          return;
        }
        //console.log("mouseout!");
        hideMenu(500);
      });
    }
  };

  var hideAll = function(){
    $("#menu").hide();
    $("#next").hide();
    $("#vote").hide();
    $("#next_disable").hide();
    $("#vote_disable").hide();
    $("#bookmark_disable").hide();
    $("#bookmark").hide();
    $("#loading").show();
    $("#canvas").css({cursor:"wait"});
  };

  var showFinished = function() {
    var next_story_id = storyMetaFile["next_story_id"];
    var comic_id = storyMetaFile["comic_id"];
    showMenu(0);
    $("#next").unbind(act_button);
    $("#vote").unbind(act_button);
    $("#bookmark").unbind(act_button);

    if (member) {
      setTimeout(
        function(){
          $("#vote").bind(act_start,
            function(e) {
              activate_button($("#vote"), 0);
            });
          $("#vote").bind(act_button,
            function(e) {
              activate_button($("#vote"), 0);
              setTimeout(function(){
                apiVoteStory(comic_id, storyId, 1, function(){
                  goToNextStory(next_story_id, comic_id, "vote");
                },function(){showError();});
                hideAll();
              },0);
              prevent_default(e);
            });
           $("#bookmark").bind(act_start,
             function(e) {
               activate_button($("#bookmark"), 0);
             });
           $("#bookmark").bind(act_button,
             function(e) {
               activate_button($("#bookmark"), 0);
               setTimeout(function(){
                 apiBookmark(comic_id, function(){
                   goToNextStory(next_story_id, comic_id, "bookmark");
                 },function(){showError();});
               hideAll();
             },0);
             prevent_default(e);
           });
           $("#vote_disable").hide();
           $("#vote").show();
           $("#bookmark_disable").hide();
           $("#bookmark").show();
         }
      ,1000);
      $("#vote").hide();
      $("#vote_disable").show();
      $("#bookmark").hide();
      $("#bookmark_disable").show();
    }else{
      $("#vote").hide();
      $("#bookmark").hide();
      $("#vote_disable").show();
      $("#bookmark_disable").show();
    }
    $("#next").hide();
    $("#next_disable").show();
    setTimeout(
      function(){
        $("#next").bind(act_start,
          function(e) {
            activate_button($("#next"), 0);
          });
        $("#next").bind(act_button,
          function(e) {
            setTimeout(function(){
              goToNextStory(next_story_id, comic_id, "");
            },0);
            hideAll();
            prevent_default(e);
        });
        $("#next_disable").hide();
        $("#next").show();
      }
      ,1000);
    $("#preview").hide();
    $("#loading").hide();
    $("#reader").show();
    $("#error").hide();
    $("#finish").show();

    var $window = $(window);
    var windowHeight = $window.height();
    var windowWidth  = $window.width();
    var width = $("#finish_actions").width();
    var height = $("#finish_actions").height();
    var csstop = windowHeight/2;
    var cssleft = windowWidth/2 - width/2;
    $("#finish_actions").css({top:csstop, left:cssleft});
    $("#finish_actions").show();
  };

  /**
   * 次のシーンへ進める
   */
  var goNextScene = function() {
    if(isLoading){
      return;
    }
    var next = currentSceneIndex + 1;
    if (next < scenes.length) {
      jumpToScene(currentSceneIndex + 1);
    } else {
      showFinished();
    }
  };

  /**
   * アニメーションの各フレーム処理の実行
   * @private
   */
  var animation = function() {
    if (SceneAnimator.isScrolling()) {
      SceneAnimator.step();
      paint();
    }
    if (SceneAnimator.isScrolling()) {
      setTimeout(animation, 1000 / FPS);
    }
  };

  /**
   * スクロールをひとつ先に進める
   *
   * @private
   * @return void
   */
  var goNext = function() {
    SceneAnimator.reverse = false;
    SceneAnimator.dirFwd = true;

    if (SceneAnimator.isAtScrollStart()) {
      SceneAnimator.startScroll();
      animation();

    } else if (SceneAnimator.isScrolling()) {
      SceneAnimator.skipScroll();
      paint();

    } else if (SceneAnimator.isAtScrollEnd()) {
      goNextScene();

    } else {
      throw "Illega state";
    }
  };

  /**
   * 表示モードを「ローディング中」に切り替える
   */
  var showLoading = function() {
    isLoading = true;
    showMenu(2000,500);
    $("#canvas").css({cursor:"wait"});
    $("#loading").show();
    $("#reader").hide();
    $("#finish").hide();
    $("#error").hide();
  };

  /**
   * 表示モードを「マンガ閲覧中」に切り替える
   */
  var showReader = function() {
    $("#canvas").css({cursor:"pointer"});
    $("#loading").hide();
    $("#reader").show();
    $("#finish").hide();
    $("#error").hide();
    var canvas_click = function(event) {
      goNext();
      prevent_default(event);
    };
    $("#canvas").unbind(act_start,canvas_click);
    $("#canvas").bind(act_start,canvas_click);

    var format = _("Loading images");
    var args = {
      "story_number"   : storyMetaFile.story_number,
      "story_title"    : storyMetaFile.story_title,
      "number_of_story": storyMetaFile.number_of_story
    };
    isLoading = false;
  };

  /**
   * 指定したマンガの話をリーダーで開く。
   */
  var openStory = function(_storyId) {
    storyId = _storyId;
    if (sceneImages !== undefined) {
      for ( var n = 0; n < sceneImages.length; n++) {
        var i = sceneImages[n];
        if (i !== undefined) {
          i.onload = null;
        }
      }
    }
    sceneImages = [];
    scenes = null;
    currentSceneIndex = 0;
    storyMetaFile = null;
    showLoading();
    apiStoryMetaFile(storyId, function(json) {
      storyMetaFile = json;
      scenes = storyMetaFile["scenes"];
      updateSceneCount();
      if (scenes.length === 0) {
        showFinished();
      } else {
        showReader();
        jumpToScene(0);
      }
    }, function() {
      showError();
    });
    _gaq.push(['_trackPageview', '/event/viewer/open/'+storyId]);
  };

  /**
   * プレビュー画面を表示する
   * @returns void
   */
  this.showPreview = function(_storyId) {
    $("#thumbnail").attr("src", "/icon/story_image/medium/" + _storyId);
    $("#thumbnail").hide();
    $("#thumbnail").bind("load", function(e){
      App.centering($("#thumbnail"));
      $("#thumbnail").show();
    });
    $("#preview_ui").show();
    $("#preview").show();
    $("#preview > *").unbind('click');
    $("#preview > *").click(function(event) {
      openStory(_storyId);
      $("#preview").hide();
      prevent_default(event);
    });
  };

  this.openStory = openStory;
  this.goNext = goNext;
}

