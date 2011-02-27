/**
 * マンガを読み込み中のUI処理を行う
 * MVCのコンポーネントに相当する処理を行う。
 * @constructor
 */
function $Reader()
{
  var FPS = 10;
  var IE  = /MSIE/.test(navigator.userAgent)&&!window.opera;

  var reader = $("#mangh5r");
  var width  = reader.width();
  var height = reader.height();

  var SceneAnimator = new $SceneAnimator(width,height,FPS);

  var canvas = $("#canvas")[0];
  canvas.width  = width;
  canvas.style.width = width + "px";
  canvas.height = height;
  canvas.style.height = width + "px";

  var storyId;
  var storyMetaFile;
  var scenes;
  var sceneImages;
  var currentSceneIndex;

  /**
   * 指定したマンガの話をリーダーで開く。
   */
  this.openStory = function(_storyId)
  {
    App.showLoading();
    storyId = _storyId;
    scenes = null;
    sceneImages = [];
    currentSceneIndex = 0;
    
    App.apiStoryMetaFile(storyId,
        function(json) {
          storyMetaFile = json;
          scenes = storyMetaFile['scenes'];
          if (scenes.length == 0) {
            App.showFinished();
          } else {
            App.showReader();
            jumpToScene(0);
          }
        },
        function() {
          App.showError();
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
    App.bookmark(storyId,currentSceneIndex);

    var arguments = {
        "comic_title" : storyMetaFile["comic_title"] ,
        "story_number" : storyMetaFile["story_number"],
        "story_title" : storyMetaFile["story_title"],
        "scene_number" : newSceneIndex+1,
        "number_of_scenes": scenes.length
    };
    var format = _("{comic_title} / #{story_number} {story_title} ({scene_number} / {number_of_scenes} frames)");
    var title  = App.sprintf(format,arguments);
    $("#ui").attr("title",title);

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

  var onClick = function ()
  {
    goNext();
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
      App.showFinished();
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

  $("#reader").click(onClick);
}

