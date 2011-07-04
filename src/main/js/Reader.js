/*global $, _, _gaq, window, strings, App, $SceneAnimator */
if (!window.console) {
  var console = {};
}

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
   * メニューを表示する
   */
  var showMenu = function (lifetime, fadeout){
    console.log("showMenu");
    //unbind click menu
    //bind   click prev
    //bind   click first
    $("#menu").css({"opacity":"1.0"});
    setTimeout(function(){
      $("#menu").fadeTo(fadeout, "0.0", function(){
        //unbind click
        //unbind click
        $("#menu").click(function(e){showMenu(3000,2000);});
      });
    }, lifetime);
  };

  /**
   * 表示モードを「ローディング中」に切り替える
   */
  var showLoading = function() {
    console.log("showLoading");
    showMenu(2000,2000);
    $("#loading").show();
    $("#reader").hide();
    $("#finish").hide();
    $("#error").hide();
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
    var settings = {
      'url' : API_ROOT + '/storyMetaFile/' + storyId,
      'type' : 'get',
      'async' : true,
      'cache' : false,
      'dataType' : 'json',
      'success' : function(json) {
        fnSuccess(json);
      },
      'error' : function(req, status, error) {
        console.log(this);
        fnError();
      }
    };

    $.ajax(settings);
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

  /**
   * 表示モードを「マンガ閲覧中」に切り替える
   */
  var showReader = function() {
          console.log("showReader");
    $("#loading").hide();
    $("#reader").show();
    $("#finish").hide();
    $("#error").hide();
    $("#canvas").unbind('mouseup');
    $("#canvas").mouseup(function(event) {
      goNext();
      if (App.IE) {
        event.returnValue = false;
      }else{
        event.preventDefault();
      }
    });
    var format = _("Loading images");
    var args = {
      "story_number"   : storyMetaFile.story_number,
      "story_title"    : storyMetaFile.story_title,
      "number_of_story": storyMetaFile.number_of_story
    };
  };

  /**
   * 指定したマンガの話をリーダーで開く。
   */
  var openStory = function(_storyId) {
    if (sceneImages !== undefined) {
      for ( var n = 0; n < sceneImages.length; n++) {
        var i = sceneImages[n];
        if (i !== undefined) {
          i.onload = null;
        }
      }
    }
    sceneImages = [];
    storyId = _storyId;
    scenes = null;
    currentSceneIndex = 0;
    storyMetaFile = null;

    showLoading();
    apiStoryMetaFile(storyId, function(json) {
      storyMetaFile = json;
      scenes = storyMetaFile.scenes;
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
      //IE9でImage.completeが動作しない場合があるので、Image.widthを見て
      //ロードが完了したか判断する
      return this.width > 0;
    };
    i.src = API_ROOT + '/sceneImage/' + sceneId;
    return i;
  };
  
  /**
   * 指定したシーン番号のシーン読み込みを準備する。 またこの内部でプリロード、破棄処理も行う。 現在は一括ロード。
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

  var showFinished = function() {
    var next_story_id = storyMetaFile.next_story_id;
    var comic_id = storyMetaFile.comic_id;

    $("#onemore").unbind('click');
    $("#next").unbind('click');
    $("#vote").unbind('click');
    $("#bookmark").unbind('click');

    $("#onemore").click(function(event) {
      this.openStory(storyId);
      if (App.IE) {
        event.returnValue = false;
      }else{
        event.preventDefault();
      }
    });
    if (member) {
      $("#vote").click(
          function() {
            parent.document.location.href = '/comic/view/' + comic_id +
             '/vote_story/' + storyId + '/1/done/';
          });
      $("#bookmark").click(
          function() {
            parent.document.location.href = '/comic/view/' + comic_id +
             '/bookmark/done/';
          });
    }

    if (next_story_id !== false) {
      $("#next").click(
          function() {
            if (member) {
              this.openStory(next_story_id);
            } else {
              parent.document.location.href = '/comic/view/' + comic_id +
               '/story/' + next_story_id;
            }
          });
      $("#bookmark").hide();
      $("#next").show();
    } else {
      if (member) {
        $("#bookmark").show();
      } else {
        $("#bookmark").hide();
      }
      $("#next").hide();
    }
    if (member) {
      $("#vote").show();
    } else {
      $("#vote").hide();
    }
    $("#preview").hide();
    $("#loading").hide();
    $("#reader").show();
    $("#error").hide();
    $("#finish").show();
    App.centering($("#finish_ui"));
  };
  
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
          console.log("x:" + x + " y:" + y);
    var w = i.width;
    var h = i.height;
    var dx = (width - w) / 2 + x;
    var dy = (height - h) / 2 + y;
          console.log("dx:" + dx + " dy:" + dy);
          
    if (App.IE) {
      i.style.cssText = "position: absolute; top: " + dy + "px; left:" + dx + "px;";
      $("#canvas").empty().append(i);
    } else {
      var context = canvas.getContext("2d");
      context.fillStyle = canvas.style.background;
      context.fillRect(0, 0, width, height);
      context.drawImage(i, dx, dy);
    }
  };

  
  /**
   * コマ毎の初期化
   * @return void
   */
  var jumpToScene = function(newSceneIndex) {
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
      SceneAnimator.initializeWhenLoaded(i, scene.scroll_course,
          scene.scroll_speed);
      $("#loading").hide();
      paint();
    }

    if (i !== undefined && i.hasLoaded()) {
      onloaded();
    } else {
      $("#loading").show();
      SceneAnimator.initializeWhenUnloaded();
      i.onload = onloaded;
    }
  };
  
  /**
   * 次のシーンへ進める
   */
  var goNextScene = function() {
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
   * スクロールをひとつ前に戻す
   *
   * @private
   * @return void
   */
  var goPrev= function() {
    console.log("prev!");
  };

  /**
   * 次のシーンへ進める
   */
  var goPrevScene = function() {
    var prev = currentSceneIndex - 1;
    if (0 <= prev) {
      jumpToScene(prev);
    }
  };

  var goToFirst = function(){

  };

  this.openStory = openStory;
}

