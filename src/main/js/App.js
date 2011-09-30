/*global $, _gaq, window, strings, $Reader */

/**
 * Singleton of $App class.
 */
var App;
var Reader;
var _;

/**
 * App Class definition.
 *
 * アプリケーション固有の実装はここに書かない。
 * このクラスはブラウザ間の違い等の吸収やヘルパーの提供の役割。
 *
 * @constructor
 */
function $App()
{
  this.IE = false;
  this.IE_VER = false;
  this.ANDROID21 = false;

  /**
   * コンストラクター実装
   */
  this.constructor = function()
  {
    if (typeof window.console !== 'object'){
      window.console = {log:function(){},debug:function(){},info:function(){},warn:function(){},error:function(){},assert:function(){},dir:function(){},dirxml:function(){},trace:function(){},group:function(){},groupEnd:function(){},time:function(){},timeEnd:function(){},profile:function(){},profileEnd:function(){},count:function(){}};
    }
    _ = this.getLocalizedString;

    var ua = navigator.userAgent;
    if (navigator.appName === 'Microsoft Internet Explorer') {
      this.IE = true;

      var re  = ua.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/);
      if (re !== null) {
        this.IE_VER = parseFloat( re[1] );
      } else {
        this.IE_VER = 6;
      }
    } else {
      this.IE = false;
    }

    if (/Android\s2\.[0|1]/.test(ua)) {
      this.ANDROID21 = true;
    }

  };

  /**
   * windowのセンターにオブジェクトを配置する
   * @public
   */
  this.centering = function(element) {
    element.each(function(){
      var $window = $(window);
      var windowHeight = $window.height();
      var windowWidth  = $window.width();

      String.prototype.toInt = function(){
        var i = parseInt(this, 10);
        return isNaN(i) ? 0 : i;
      };
      var $self = $(this);
      var width = $self.width();
      var height = $self.height();
      console.log("centering w:" +width + " h:" + height);
      var paddingTop    = $self.css("padding-top").toInt();
      var paddingBottom = $self.css("padding-bottom").toInt();
      var borderTop     = $self.css("border-top-width").toInt();
      var borderBottom  = $self.css("border-bottom-width").toInt();
      var mediaBorder = (borderTop+borderBottom)/2;
      var mediaPadding = (paddingTop+paddingBottom)/2;
      var positionType = $self.parent().css("position");
      var halfWidth =  width /2;
      var halfHeight = height/2 + mediaPadding +mediaBorder;

      var cssProp = {
        position: 'absolute'
      };
      cssProp.top = windowHeight/2 - halfHeight;
      cssProp.marginTop = 0;
      cssProp.left = windowWidth/2 - halfWidth;
      cssProp.marginLeft = 0;
      if(positionType === 'static') {
        $self.parent().css("position","relative");
      }
      $self.css(cssProp);
    });
  };

  /**
   * 多言語対応のリソースを読み込む
   */
  this.getLocalizedString = function(english) {
    if (strings === undefined) {
      return english;
    }
    var string = strings[english];
    if (string === undefined) {
      return english;
    }
    var lang = 'ja';
    var localized = string[lang];
    if (localized === undefined) {
      return english;
    }
    return localized;
  };

  /**
   * sprintfもどきの書式に基づいた整形処理を行う
   * 埋め込む変数は {1},...{NN}で指定する。
   *
   * @example
   * console.log(sprintf("{2} in {1}",["A","B"]));
   * console.log(sprintf("{name} in {country}",{"name":"X","country":"Y"]));
   *
   * [Output]
   * B in A
   */
  this.sprintf = function(format,args) {
    var num = args.length;
    var string = format;
    for (var key in args) {
      if(args.hasOwnProperty(key)){
        string = string.replace("{" + (key) + "}",args[key]);
      }
    }
    return string;
  };


  /**
   * QueryStringを解析して連想配列にデコードする
   * @param String str QueryString
   * @returns Array デコード結果
   */
  this.parseQueryString = function(str)
  {
    var hash = {};
    if(str === 'undefined') {
      console.log('GET:Empty');
      return hash;
    }
    if(str.indexOf('?', 0) > -1) {
      str = str.split('?')[1];
    }
    str = str.split('&');
    for(var i = 0; str.length > i; i++){
      var j = str[i].split("=");
      var name  = j[0];
      var value = j[1];
      if(name !== ''){
        hash[name] = value === undefined ? true : decodeURIComponent(value);
      }
    }
    return hash;
  };

  this.constructor();
}


/**
 * スタートアップ処理。
 *
 * App シングルトンインスタンスを生成して処理を委譲する。
 *
 */
$(function() {
  console.log("start");

  /**
   *  URLアンカーからカンマ区切りのパラメーターを取得する
   */
  function getParametersFromAnchor() {
    var hash = location.hash;
    if (hash === undefined || hash === null || hash.length <= 2) {
      return [0];
    }
    return hash.substring(1).split(",");
  }

  /** URLアンカーからアプリケーション固有のパラメータを取得し
   *  名前つき配列に格納する
   */
  function getRealParameters() {
    var raw  = getParametersFromAnchor();
    var real = {};
    real.storyId = Math.floor(raw[0]);
    real.member  = 2 <= raw.length && raw[1] === 'member';
    real.auto    = 3 <= raw.length && raw[2] === 'auto';
    return real;
  }

  App = new $App();
  var params = getRealParameters();
  Reader = new $Reader(params.member);
  console.log("openStory:start:" + params.storyId);
  if(!params.auto){
    Reader.showPreview(params.storyId);
  }else{
    Reader.openStory(params.storyId);
  }
  console.log("started");
});
