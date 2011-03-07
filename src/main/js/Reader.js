/**
 * マンガを読み込み中のUI処理を行う
 * MVCのコンポーネントに相当する処理を行う。
 * @constructor
 */
function $Reader(_member)
{
  var member = _member;
  var FPS = 10;
  var IE  = /MSIE/.test(navigator.userAgent)&&!window.opera;
  if (IE) {
    // canvasが実装されていないのでdivに置換
    // style="background: #000;"を定義しないとクリッカブルにならない
    $("#canvas").replaceWith('<div id="canvas" style="background: #000;"></div>');
  }

  var IE7 = window.XMLHttpRequest && (/*@cc_on!@*/false) && !(document.documentMode >=8);
  if (IE7) {
    var width  = $(window).width();
    var height = $(window).height();
    $("#mangh5r").width(width);
    $("#mangh5r").height(height);
    $("#canvas").width(width);
    $("#canvas").height(height);
  } else {
    var reader = $("#mangh5r");
    var width  = reader.width();
    var height = reader.height();
    var canvas = $("#canvas")[0];
    canvas.width  = width;
    canvas.style.width = width + "px";
    canvas.height = height;
    canvas.style.height = width + "px";
  }

  var SceneAnimator = new $SceneAnimator(width,height,FPS);
  var storyId;
  var storyMetaFile;
  var scenes;
  var sceneImages;
  var currentSceneIndex;

  /**
   * コンストラクター
   * @returns
   */
  var constructor = function() {
  };

  /**
   * 指定したマンガの話をリーダーで開く。
   */
  this.openStory = function(_storyId)
  {
    if (sceneImages != null) {
      for (var n = 0;n < scenes.length;n++) {
        var i = sceneImages[n];
        if (i != undefined) {
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
    App.apiStoryMetaFile(storyId,
        function(json) {
          storyMetaFile = json;
          scenes = storyMetaFile['scenes'];
          if (scenes.length == 0) {
            showFinished();
          } else {
            showReader();
            jumpToScene(0);
          }
        },
        function() {
          showError();
        }
    );
  };


  /**
   * 指定したシーン番号のシーン読み込みを準備する。
   * またこの内部でプリロード、破棄処理も行う。
   * 現在は一括ロード。
   */
  var fetchSceneImage = function(sceneIndex)
  {
    var under    = sceneIndex - 1;
    var prefetch = sceneIndex + 5;
    for (var n = 0;n < scenes.length;n++) {
      if (n < under && sceneImages[n] != undefined) {
        sceneImages[n] = undefined;
      } else if (n <= prefetch && sceneImages[n] == undefined) {
        sceneImages[n] = App.apiSceneImage(scenes[n]['id']);
      }
    }
  };

  /**
   * コマ毎の初期化
   * @return void
   */
  var jumpToScene = function(newSceneIndex)
  {
    fetchSceneImage(newSceneIndex);

    currentSceneIndex = newSceneIndex;

    var arguments = {
        "comic_title" : storyMetaFile["comic_title"] ,
        "story_number" : storyMetaFile["story_number"],
        "story_title" : storyMetaFile["story_title"],
        "scene_number" : newSceneIndex+1,
        "number_of_scenes": scenes.length
    };
    var format = _('hover_status');
    var title  = App.sprintf(format,arguments);
    $("#preview > *").attr("title",title);

    function onloaded() {
      var scene = scenes[currentSceneIndex];
      SceneAnimator.initializeWhenLoaded(i,scene['scroll_course'],scene['scroll_speed']);
      $("#unloaded").hide();
      paint();
    };

    var i = sceneImages[currentSceneIndex];
    if (i !== false && i.complete === true) {
      onloaded();
    } else {
      $("#unloaded").show();
      SceneAnimator.initializeWhenUnloaded();
      i.onload = onloaded;
    }
  };

  /**
   * 画面描画
   * @return void
   */
  var paint = function() 
  {
    var i = sceneImages[currentSceneIndex];
    if (i === undefined || i.complete === false) {
        return;
    }

    var x = SceneAnimator.x();
    var y = SceneAnimator.y();
    var w = i.width;
    var h = i.height;
    var dx = (width - w) / 2 + x;
    var dy = (height - h) / 2 + y;
    if (IE) {
      i.style.position = 'absolute';
      i.style.left = dx;
      i.style.top  = dy;
      $("#canvas").empty().append(i);
    } else {
      var context = canvas.getContext("2d");
      context.fillStyle = canvas.style.background;
      context.fillRect(0,0,width,height);
      context.drawImage(i,dx,dy);
    }
  };

  /**
   * 次のシーンへ進める
   */
  var goNextScene = function()
  {
    var next = currentSceneIndex + 1;
    if (next < scenes.length) {
      jumpToScene(currentSceneIndex + 1);
    } else {
      showFinished();
    }
  };

  /**
   * スクロールをひとつ先に進める
   * @private
   * @return void
   */
  var goNext = function() 
  {
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
   * アニメーションの各フレーム処理の実行
   * @private
   */
  var animation = function()
  {
    if (SceneAnimator.isScrolling()) {
      SceneAnimator.step();
      paint();
    }
    if (SceneAnimator.isScrolling()) {
      setTimeout(animation,1000 / FPS / 1.5);
    }
  };

  /**
   * プレビュー画面を表示する
   * @returns void
   */
  this.showPreview = function(_storyId)
  {
    storyId = _storyId;
    $("#thumbnail").attr("src","/icon/story_image/medium/" + storyId);
    $("#preview_ui").show();
    $("#preview").show();
    $("#preview > *").click(function(event) { Reader.openStory(storyId);event.preventDefault(); });
    App.centering($("#preview_ui"));
  }
  
  /**
   * 表示モードを「ローディング中」に切り替える
   */
  var showLoading = function()
  {
    $("#preview_ui").hide();
    $("#preview").show();
    $("#loading").show();
    $("#reader").hide();
    $("#finish").hide();
    $("#error").hide();
  };

  /**
   * 表示モードを「マンガ閲覧中」に切り替える
   */
  var showReader = function()
  {
    $("#preview").hide();
    $("#loading").hide();
    $("#reader").show();
    $("#finish").hide();
    $("#error").hide();
    $("#canvas").click(function(event) { goNext();event.preventDefault(); });
  };

  /**
   * 表示モードを通信エラーに切り替える
   */
  var showError = function()
  {
    $("#preview").show();
    $("#loading").hide();
    $("#reader").hide();
    $("#finish").hide();
    $("#error").show();
  };

  var showFinished = function()
  {
    var next_story_id = storyMetaFile["next_story_id"];
    var comic_id = storyMetaFile["comic_id"];
    
    $("#onemore").click(function(event) { Reader.openStory(storyId);event.preventDefault(); });
    if (member) {
      $("#vote").click(function() { parent.document.location.href = '/comic/view/' + comic_id + '/vote_story/' + storyId + '/1/done/'; });
      $("#bookmark").click(function() { parent.document.location.href = '/comic/view/' + comic_id + '/bookmark/done/'; });
    }

    if (next_story_id != false) {
      $("#next").click(function() { 
        if (member) {
          Reader.openStory(next_story_id);
        } else {
          parent.document.location.href = '/comic/view/' + comic_id + '/story/' + next_story_id;
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

  constructor();
}

