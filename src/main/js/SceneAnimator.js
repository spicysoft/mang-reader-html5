/**
 * コマスクロール関連:ReadingSceneで使用
 * @constructor
 */
function $SceneAnimator(_readerWidth,_readerHeight,_fps) 
{
  /**
   * 定数：誤差を減らすため、スクロール位置情報を数倍する。
   */
  var ADJUST_SCALE = 100;

  /**
   * 定数：コマスクロールピクセル数(標準速度)
   */
  var SCROLL_PIXELS = ADJUST_SCALE * _fps;

  /**
   * 定数：スクロール方向毎のコマの初期横位置(-1:左端, 0:中央, 1:右端)
   * コマの初期位置なので、画面の初期位置とは逆になる。
   * [0]なし、[1]↓、[2]↑、[3]←、[4]→、[5]Ｎ、[6]逆Ｚ、[7]逆Ｎ、[8]Ｚ
   */
  var START_X_POSITION = [0,0,0,-1,1,-1,-1,1,1];

  /**
   * 定数：スクロール方向毎のコマの初期縦位置(-1:上端, 0:中央, 1:下端)
   * コマの初期位置なので、画面の初期位置とは逆になる。
   *  [0]なし、[1]↓、[2]↑、[3]←、[4]→、[5]Ｎ、[6]逆Ｚ、[7]逆Ｎ、[8]Ｚ
   */
  var START_Y_POSITION = [0,1,-1,0,0,1,1,1,1];

  /**
   * 定数：スクロール方向毎のX軸ベクトル[スクロール方向][動作番号]
   * コマの移動方向なので、画面の移動方向とは逆になる。
   *  [0]なし、[1]↓、[2]↑、[3]←、[4]→、[5]Ｎ、[6]逆Ｚ、[7]逆Ｎ、[8]Ｚ
   */
  var X_VECTOR = [
    [0,0,0],[0,0,0],
    [0,0,0],[SCROLL_PIXELS,0,0],
    [-SCROLL_PIXELS,0,0],[0,SCROLL_PIXELS,0],
    [SCROLL_PIXELS,-SCROLL_PIXELS,SCROLL_PIXELS],
    [0,-SCROLL_PIXELS,0],[-SCROLL_PIXELS,SCROLL_PIXELS,-SCROLL_PIXELS]
  ];

  /**
   * 定数：スクロール方向毎のY軸ベクトル[スクロール方向][動作番号]
   * コマの移動方向なので、画面の移動方向とは逆になる。
   *  [0]なし、[1]↓、[2]↑、[3]←、[4]→、[5]Ｎ、[6]逆Ｚ、[7]逆Ｎ、[8]Ｚ
   */
  var Y_VECTOR = [
    [0,0,0],
    [-SCROLL_PIXELS,0,0],[SCROLL_PIXELS,0,0],
    [0,0,0],[0,0,0],[-SCROLL_PIXELS,SCROLL_PIXELS,-SCROLL_PIXELS],
    [0,-SCROLL_PIXELS,0],[-SCROLL_PIXELS,SCROLL_PIXELS,-SCROLL_PIXELS],
    [0,-SCROLL_PIXELS,0]
  ];


  /** スクロール中はtrue */
  var scrolling = false;
  /** スクロール動作数 */
  var actionCount;
  /** スクロール */
  var action;
  /** スクロールスピード */
  var speed;
  /** スクロールコース */
  var course;
  /** 描画エリアの横幅 */
  var imageWidth;
  /** 描画エリアの縦幅 */
  var imageHeight;
  /** コマ画像の横幅 */
  var imageWidth;
  /** コマ画像の縦幅 */
  var imageHeight;
  /** 中心からのコマの相対横位置 */
  var scrolledPixelsX = 0;
  /** 中心からのコマの相対縦位置 */
  var scrolledPixelsY = 0;
  /** スクロール限界の左端 */
  var limitLeft;
  /** スクロール限界の右端 */
  var limitRight;
  /** スクロール限界の上端 */
  var limitTop;
  /** スクロール限界の下端 */
  var limitBottom;
  /** X方向の移動ピクセル数 */
  var movePixelX;
  /** Y方向の移動ピクセル数 */
  var movePixelY;
  /** リーダー画面の幅*/
  var readerWidth = _readerWidth;
  /** リーダー画面の高さ*/
  var readerHeight = _readerHeight;
  
  /**
   * スクロール初期化
   */
  var initializeWhenLoaded = this.initializeWhenLoaded = function(_image,_course,_speed) 
  {
    initializeWhenUnloaded();
    speed        = _speed;
    course       = _course;
    imageWidth   = _image.width;
    imageHeight  = _image.height;
    actionCount  = X_VECTOR[course].length;
    limitRight   = (imageWidth - readerWidth) * ADJUST_SCALE / 2;
    limitLeft    = - limitRight;
    if (limitRight <= 0) {
      scrolledPixelsX = 0;
    } else {
      scrolledPixelsX = START_X_POSITION[course] * limitRight;
      scrollable = true;
    }
    limitBottom = (imageHeight - readerHeight) * ADJUST_SCALE / 2;
    limitTop    = -limitBottom;
    if (limitBottom <= 0) {
      scrolledPixelsY = 0;
    } else {
      scrolledPixelsY = START_Y_POSITION[course] * limitBottom;
      scrollable = true;
    }
    if (course == 0) {
      scrollable = false;
    }
    if (!scrollable) { 
      actionCount = 0;
    }
    caliculate();
    scrolling = false;
  };

  /**
   * スクロール初期化
   */
  var initializeWhenUnloaded = this.initializeWhenUnloaded = function() {
    action     = 0;
    actionCount= 0;
    scrolling  = false;
    scrollable = false;
  };

  this.x = function() 
  {
    return scrolledPixelsX / ADJUST_SCALE;
  };

  this.y = function()
  {
    return scrolledPixelsY / ADJUST_SCALE;
  };

  /**
   * スクロール不要のシーンもしくは スクロールが完了してるかどうか？
   */
  this.isAtScrollEnd = function() {
    return actionCount == 0 || (scrolling == false && action == actionCount);
  };

  /**
   * シーンのスクロールアニメーションの先頭フレームにいるか？先頭フレームである場合true
   */
  this.isAtScrollStart = function() {
    return actionCount != 0 && scrolling == false && action == 0;
  };

  /**
   * スクロール中かどうか？スクロール中の場合はtrue
   */
  var isScrolling = this.isScrolling = function() {
    return scrolling;
  };

  /**
   * スクロールを完了させる
   */
  this.skipScroll = function() {
    while (action < actionCount && isScrolling()) {
      step();
    }
  };

  /**
   * スクロールを開始する
   */
  this.startScroll = function() {
    scrolling = true;
  };

  /**
   * 移動ピクセル数設定
   */
  var caliculate = function() {
    if (actionCount <= action) {
      return;
    }

    movePixelX = X_VECTOR[course][action];
    movePixelY = Y_VECTOR[course][action];
    if (movePixelX != 0 && movePixelY != 0) {
      var moveAreaWidth = limitRight - limitLeft;
      var moveAreaHeight = limitBottom - limitTop;
      if (moveAreaWidth < moveAreaHeight) {
        if (moveAreaWidth != 0)
          movePixelX = movePixelX * moveAreaHeight / moveAreaWidth;
      } else if (moveAreaWidth > moveAreaHeight) {
        if (moveAreaHeight != 0)
          movePixelY = movePixelY * moveAreaWidth / moveAreaHeight;
      }
    }
    if (movePixelX != 0) {
      movePixelX = speed * ADJUST_SCALE * ADJUST_SCALE / movePixelX;
    }
    if (movePixelY != 0) {
      movePixelY = speed * ADJUST_SCALE * ADJUST_SCALE / movePixelY;
    }
  };

  /**
   * コマのスクロール
   */
  var step = this.step = function() {
    if (!scrolling) {
      return;
    }
    if (actionCount <= action) {
      return;
    }

    caliculate();

    var moved= false;
    // X軸
    if (movePixelX != 0 && scrolledPixelsX >= limitLeft
        && scrolledPixelsX <= limitRight) {
      // 動作に対応したベクトルに速度をかけて加算
      scrolledPixelsX += movePixelX;
      // 行き過ぎた場合は限界まで戻す。
      if (scrolledPixelsX <= limitLeft) {
        scrolledPixelsX = limitLeft;
      } else if (scrolledPixelsX >= limitRight) {
        scrolledPixelsX = limitRight;
      } else {
        moved = true;
      }
    }
    // Y軸
    if (movePixelY != 0 && scrolledPixelsY >= limitTop
        && scrolledPixelsY <= limitBottom) {
      scrolledPixelsY += movePixelY;
      if (scrolledPixelsY <= limitTop) {
        scrolledPixelsY = limitTop;
      } else if (scrolledPixelsY >= limitBottom) {
        scrolledPixelsY = limitBottom;
      } else {
        moved = true;
      }
    }

    if (!moved) {
      action++;
      if(action >= actionCount){
        scrolling = false;
      }
    }
  };

}
