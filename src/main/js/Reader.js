/*global $, _, _gaq, window, strings, App, $SceneAnimator */

/**
 * マンガを読み込み中のUI処理を行う MVCのコンポーネントに相当する処理を行う。
 *
 * @constructor
 */
function $Reader(_member) {
  var member = _member;
  var FPS = 10;
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
   *
   * @return void
   */
  var paint = function() {
    console.log("paint");
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

    console.log("dx:" + dx + " dy:" +dy + " i.w:" + w  + "i.h:" + h + " c.w:" + width + " c.h:" + height);

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
        var rate =  Math.sqrt(320 /screen.width);
        context.scale(rate, rate);
      }
      context.drawImage(i, dx, dy);
      if(App.ANDROID21){
        context.restore();
      }
    }
    console.log("paint done");
  };

  var ajax_get = function(url, datatype, fnSuccess, fnError){
    var settings = {
      'url' : url,
      'type' : 'get',
      'async' : true,
      'cache' : false,
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
    ajax_get(API_ROOT + '/storyMetaFile/' + storyId, 'json', fnSuccess, fnError);
  };

  /**
   * [サーバーAPIとの通信メソッド]
   *
   * イイネ投票する
   */
  var apiVoteStory = function(comicId, storyId, value, fnSuccess, fnError){
    ajax_get('/comic/view/' + comicId + '/vote_story/' + storyId + '/' + value + '/done',
     'xml', fnSuccess, fnError);
  };

  /**
   * [サーバーAPIとの通信メソッド]
   *
   * イイネ投票する
   */
  var apiBookmark = function(comicId, fnSuccess, fnError){
    ajax_get('/comic/view/' + comicId +'/bookmark/done/', 'xml', fnSuccess, fnError);
  };

  var updateSceneCount = function(){
    console.log("updateSceneCount");
    $("#progress_total").text(scenes.length);
    $("#progress_current").text(currentSceneIndex+1);
    console.log("updateSceneCount done");
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
    if(next_story_id === false){
      parent.document.location.href = '/comic/view/'+comic_id+'/story/_undelivered';
    }else{
      if (member) {
        var after_param = '';
        if(param !== ""){
          after_param = "?after="+param;
        }
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
    console.log("apiSceneImage:" + sceneId);
    var i = new Image();
    i.hasLoaded = function(){
      //IE9でImage.completeが動作しない場合があるので、Image.widthを見て
      //ロードが完了したか判断する
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
    var under = sceneIndex - 1;
    var prefetch = sceneIndex + 5;
    for ( var n = 0; n < scenes.length; n++) {
      if (n < under && sceneImages[n] !== undefined) {
        sceneImages[n] = undefined;
      } else if (n <= prefetch && sceneImages[n] === undefined) {
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
      console.log("scene onloaded:" + currentSceneIndex);
      SceneAnimator.initializeWhenLoaded(i, scene["scroll_course"], scene["scroll_speed"]);
      //clickイベントをunbind
      $("#loading").hide();
      isLoading = false;
      paint();
    }

    if (i !== undefined && i.hasLoaded()) {
      onloaded();
    } else {
      isLoading = true;
      showMenu(2000,2000);
      $("#loading").show();
      SceneAnimator.initializeWhenUnloaded();
      i.onload = onloaded;
    }
    console.log("jupmToScene done");
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

  /**
   * スクロールをひとつ前に戻す
   *
   * @private
   * @return void
   */
  var goPrev= function() {
    hideFinished();
    if (SceneAnimator.canSkipBack()) {
      SceneAnimator.skipBack();
    } else if (0 < currentSceneIndex) {
      goPrevScene();
    }
  };

  var show_first_click = function(e){
    hideFinished();
    jumpToScene(0);
  };

  var menu_click = function(e){showMenu(3000,2000);};
  var menu_mouse_over = function(e){showMenu(0);}
  var menuIsVisible = function(){
    return parseInt($("#menu").css("opacity"), 10) === 1;
  };

  var hideMenu = function(fadeout){
    if(!menuIsVisible()){
      return;
    }
    console.log("hide menu:" + fadeout);

    $("#menu").unbind("mouseout", hideMenu);
    $("#menu").fadeTo(fadeout, "0.0", function(){
      $("#menu").css({cursor:"pointer"});
      $("#prev_scene").unbind("click", goPrev);
      $("#prev_scene").css({cursor:"default"});
      $("#first_scene").unbind("click", show_first_click);
      $("#first_scene").css({cursol:"default"});
      $("#menu").click(menu_click);
      $("#menu").mouseover(menu_mouse_over);
    });
  };

  /**
   * メニューを表示する
   */
  var showMenu = function (lifetime, fadeout){
    if(menuIsVisible()){
      return;
    }
    console.log("show menu:" + lifetime);

    $("#menu").unbind("click", menu_click);
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
      $("#prev_scene").click(goPrev);
      $("#prev_scene").css({cursor:"pointer"});
      $("#first_scene").click(show_first_click);
      $("#first_scene").css({cursor:"pointer"});
    }


    if(0 < lifetime){
      setTimeout(function(){hideMenu(fadeout);}, lifetime);
    }else{
      $("#menu").mouseout(function(e){
        var rect = e.currentTarget.getClientRects()[0];
        if(e.clientX >= rect.left  &&
           e.clientX <= rect.right &&
           e.clientY >= rect.top   &&
           e.clientY <= rect.bottom ){
          return;
        }
        hideMenu(2000);
      });
    }
  };

  var hideAll = function(){
    $("#menu").hide();
    $("#next").hide();
    $("#vote").hide();
    $("#bookmark").hide();
    $("#loading").show();
    $("#canvas").css({cursor:"wait"});
  };

  var hideFinished = function(){
    $("#finish").hide();
    $("#finish_actions").hide();
  };

  var showFinished = function() {
    var next_story_id = storyMetaFile["next_story_id"];
    var comic_id = storyMetaFile["comic_id"];
    console.log("next:"+ next_story_id);
    showMenu(0);
    $("#next").unbind('click');
    $("#vote").unbind('click');
    $("#bookmark").unbind('click');

    if (member) {
      $("#vote").click(
          function() {
            apiVoteStory(comic_id, storyId, 1, function(){
              goToNextStory(next_story_id, comic_id, "vote");
            },function(){showError();});
            hideAll();
          });
      $("#bookmark").click(
        function() {
          apiBookmark(comic_id, function(){
            goToNextStory(next_story_id, comic_id, "bookmark");
          },function(){showError();});
          hideAll();
        });
      $("#vote").show();
      $("#bookmark").show();
      $("#vote_disable").hide();
      $("#bookmark_disable").hide();
    }else{
      $("#vote").hide();
      $("#bookmark").hide();
      $("#vote_disable").show();
      $("#bookmark_disable").show();
    }

    $("#next").click(function() {
      goToNextStory(next_story_id, comic_id, "");
      hideAll();
    });
    $("#preview").hide();
    $("#loading").hide();
    $("#reader").show();
    $("#error").hide();
    $("#finish").show();
    $("#finish_actions").show();

    var $window = $(window);
    var windowHeight = $window.height();
    var windowWidth  = $window.width();
    var width = $("#finish_actions").width();
    var height = $("#finish_actions").height();
    var csstop = windowHeight/2;
    var cssleft = windowWidth/2 - width/2;
    $("#finish_actions").css({top:csstop, left:cssleft});
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
      setTimeout(animation, 1000 / FPS / 1.5);
    }
  };

  /**
   * スクロールをひとつ先に進める
   *
   * @private
   * @return void
   */
  var goNext = function() {
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
    showMenu(2000,2000);
    $("#canvas").css({cursol:"wait"});
    $("#loading").show();
    $("#reader").hide();
    $("#finish").hide();
    $("#error").hide();
  };

  /**
   * 表示モードを「マンガ閲覧中」に切り替える
   */
  var showReader = function() {
    $("#canvas").css({cursol:"default"});
    $("#loading").hide();
    $("#reader").show();
    $("#finish").hide();
    $("#error").hide();
    var canvas_click = function(event) {
      goNext();
      if (App.IE) {
        event.returnValue = false;
      }else{
        event.preventDefault();
      }
    };
    $("#canvas").unbind('mouseup',canvas_click);
    $("#canvas").mouseup(canvas_click);
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
    console.log("openStory:"+_storyId);
    storyId = _storyId;
    if (sceneImages !== undefined) {
      console.log(sceneImages);
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
      console.log("apiStoryMetaFile");
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
   *
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
      event.preventDefault();
      $("#preview").hide();
    });
  };

  this.openStory = openStory;
}

