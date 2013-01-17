/*global $, _gaq, window, strings, $Reader */

/**
 * Singleton of $App class.
 */
var App;
var Reader;
var _;

String.prototype.toInt = function(){
    var i = parseInt(this, 10);
    return isNaN(i) ? 0 : i;
};

function in_array( what, where ){
  for(var i=0;i<where.length;i++){
    if(what === where[i]){
      return true;
    }
  }
  return false;
}

/**
 * App Class definition.
 *
 * アプリケーション固有の実装はここに書かない。
 * このクラスはブラウザ間の違い等の吸収やヘルパーの提供の役割。
 *
 * @constructor
 */
function $App() {

  this.IE = false;
  this.IE_VER = false;
  this.ANDROID21 = false;
  this.isSmartPhone = false;
  this.isAndroid = false;
  this.isApp = false;
  this.speed = 1;

  /**
   * コンストラクター実装
   */
  this.constructor = function(){
    if (typeof window.console !== 'object'){
      window.console = {log:function(){},debug:function(){},info:function(){},warn:function(){},error:function(){},assert:function(){},dir:function(){},dirxml:function(){},trace:function(){},group:function(){},groupEnd:function(){},time:function(){},timeEnd:function(){},profile:function(){},profileEnd:function(){},count:function(){}};
    }
    if(typeof window.requestAnimationFrame         == 'undefined'
      && typeof window.webkitRequestAnimationFrame == 'undefined'
      && typeof window.mozRequestAnimationFrame    == 'undefined'
      && typeof window.oRequestAnimationFrame      == 'undefined'
      && typeof window.msRequestAnimationFrame     == 'undefined'){
        this.speed = 2;
    }

    window.requestAnimationFrame = (function(){
      return window.requestAnimationFrame	||
        window.webkitRequestAnimationFrame	||
        window.mozRequestAnimationFrame		||
        window.oRequestAnimationFrame		||
        window.msRequestAnimationFrame		||
        function(callback, element){
          window.setTimeout(callback, 33);
        };
    })();

    _ = this.getLocalizedString;

    var ua = navigator.userAgent;
    if (navigator.appName === 'Microsoft Internet Explorer') {
      this.IE = true;
      console.log(ua);
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
      this.isSmartPhone = true;
      this.isAndroid = true;
    } else if (/Android/.test(ua)){
      this.isSmartPhone = true;
      this.isAndroid = true;
    } else if (/iPhone\sOS/.test(ua)){
      this.isSmartPhone = true;
    } else {
      this.isSmartPhone = false;
    }
    if(/mang\/\d+/.test(ua)){
      this.isApp = true;
    }

    this.adText = function(){
      return _ad_text;
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

      var $self = $(this);
      var width = $self.width();
      var height = $self.height();
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
  this.parseQueryString = function(str) {
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

  function isNumeric(num){
    if (num.match(/[^0-9]/g)) {
      return false;
    }
    return true;
  }

  /** URLアンカーからアプリケーション固有のパラメータを取得し
   *  名前つき配列に格納する
   */
  function getRealParameters() {
    var raw  = getParametersFromAnchor();
    var real = {};
    real.storyId = Math.floor(raw[0]);
    real.member  = in_array('member', raw);
    real.auto    = in_array('auto', raw);
    real.superuser = in_array('superuser', raw);
    real.nomenu = in_array('nomenu', raw);
    real.ad = in_array('ad', raw);
    real.time = 0;
    for(var i=1;i<raw.length;i++){
      if(isNumeric(raw[i])){
        real.time = raw[i];
        break;
      }
    }

    console.log(raw);
    console.log(real);
    return real;
  }

  App = new $App();
  var params = getRealParameters();
  Reader = new $Reader(params.member, params.superuser, params.time, params.nomenu, params.ad, 50/App.speed);

  $(window).resize(function(){
    console.log("window resize : " + $(window).width() + " " + $(window).height());
    if(/Android/.test(window.navigator.userAgent)){
      $("html").css("zoom" ,$(window).width()/css_size);
    }
    Reader.resize();
  });
    if(!params.auto){
        Reader.showPreview(params.storyId);
      }else{
        Reader.openStory(params.storyId);
      }

});
