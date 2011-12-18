/**
 * コマスクロール関連:ReadingSceneで使用
 * @constructor
 */
function $PageAnimator(_readerWidth,_readerHeight,_fps) {

  /**
    * 定数：コマスクロールピクセル数(標準速度)
    */
  var SCROLL_PIXELS = ADJUST_SCALE * _fps;

  /** スクロール中はtrue */
  var scrolling = false;
  var scrollable = false;

  /** 描画エリアの横幅 */
  var imageWidth;
  /** 描画エリアの縦幅 */
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

  var reverse = false;
  var dirFwd = true;

  /**
   * スクロール初期化
   */
  var initializeWhenUnloaded = this.initializeWhenUnloaded = function() {
    scrolling  = false;
    scrollable = false;
    reverse = false;
    dirFwd = true;
  };

  this.x = function() {
    return scrolledPixelsX / ADJUST_SCALE;
  };

  this.y = function() {
    return scrolledPixelsY / ADJUST_SCALE;
  };

  /**
   * スクロール不要のシーンもしくは スクロールが完了してるかどうか？
   */
  this.isAtScrollEnd = function() {
    return actionCount === 0 || (scrolling === false && action === actionCount);
  };

  /**
   * シーンのスクロールアニメーションの先頭フレームにいるか？先頭フレームである場合true
   */
  this.isAtScrollStart = function() {
    if(reverse){
      return actionCount != 0 && scrolling == false && action >= actionCount;
    }else{
      return actionCount != 0 && scrolling == false && action <= 0;
    }
  };

  this.startBackScroll = function(){
    scrolling = true;
    action = actionCount-1;
  }

  /**
   * スクロール中かどうか？スクロール中の場合はtrue
   */
  var isScrolling = this.isScrolling = function() {
    return scrolling;
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
    movePixelX = 480 * ADJUST_SCALE * ADJUST_SCALE;
  };


  /**
   * スクロール初期化
   */
  var initializeWhenLoaded = this.initializeWhenLoaded = function(_image) {

    initializeWhenUnloaded();
    imageWidth  = _image.width;
    imageHeight = _image.height;
    limitRight  = (imageWidth - readerWidth) * ADJUST_SCALE / 2;
    limitLeft   = - limitRight;

    scrolledPixelsX = 0;
    limitBottom = (imageHeight - readerHeight) * ADJUST_SCALE / 2;
    limitTop    = -limitBottom;
    scrolledPixelsY = 0;
    scrollable = false;
    caliculate();
    scrolling = false;
  };

  /**
   * コマのスクロール
   */
  var step = this.step = function() {
    if (!scrolling) {
      return;
    }
    if (!reverse && actionCount <= action || reverse && action < 0) {
      return;
    }

    caliculate();

    var moved= false;
    // X軸
    if (movePixelX !== 0 && scrolledPixelsX >= limitLeft &&
       scrolledPixelsX <= limitRight) {
      // 動作に対応したベクトルに速度をかけて加算
      scrolledPixelsX += reverse ? -movePixelX : movePixelX;
      // 行き過ぎた場合は限界まで戻す。
      if (scrolledPixelsX <= limitLeft) {
        scrolledPixelsX = limitLeft;
      } else if (scrolledPixelsX >= limitRight) {
        scrolledPixelsX = limitRight;
      } else {
        moved = true;
      }
    }

    if (!moved) {
      if(!reverse && action >= actionCount){
        scrolling = false;
      }else if (reverse && action < 0){
        scrolling = false;
      }
    }
  };

  /**
   * スクロールを完了させる
   */
  this.skipScroll = function() {
    var stop = action+1;
    while (action < stop && isScrolling()) {
      step();
    }
    scrolling = false;
  };

  /**
   * スクロールを完了させる
   */
  this.skipBack = function() {
    reverse = true;
    scrolling = true;
    action--;
    var stop = action-1;
    while (stop < action) {
      step();
    }
    scrolling = false;
  };
}
