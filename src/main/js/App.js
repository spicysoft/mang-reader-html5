/**
 * Singleton of $App class.
 */
var App;
var Reader;
var _;

/**
 * スタートアップ処理。
 *
 * App シングルトンインスタンスを生成して処理を委譲する。
 *
 */
$(function() {
  App = new $App();
  var params = getRealParameters();

  Reader = new $Reader(params['member']);
  Reader.showPreview(params['storyId']);

  /** URLアンカーからアプリケーション固有のパラメータを取得し
   * 名前つき配列に格納する
   */
  function getRealParameters()
  {
    var raw  = getParametersFromAnchor();
    var real = {};
    real['storyId'] = Math.floor(raw[0]);
    real['member']  = 2 <= raw.length && raw[1] == 'member';
    return real;
  }

  /** URLアンカーからカンマ区切りのパラメーターを取得する */
  function getParametersFromAnchor()
  {
    var hash = location.hash;
    if (hash == undefined || hash == null || hash.length <= 2) {
      return [0];
    }
    return hash.substring(1).split(",");
  }
});



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

  /**
   * コンストラクター実装
   */
  this.constructor = function()
  {
    if (typeof window.console != 'object'){
      window.console = {log:function(){},debug:function(){},info:function(){},warn:function(){},error:function(){},assert:function(){},dir:function(){},dirxml:function(){},trace:function(){},group:function(){},groupEnd:function(){},time:function(){},timeEnd:function(){},profile:function(){},profileEnd:function(){},count:function(){}};
    }
    _ = this.getLocalizedString;

    if (navigator.appName == 'Microsoft Internet Explorer') {
      this.IE = true;
      var ua = navigator.userAgent;
      var re  = ua.match(/MSIE ([0-9]{1,}[\.0-9]{0,})/);
      if (re != null) {
        this.IE_VER = parseFloat( re[1] );
      } else {
        this.IE_VER = 6;
      }
    } else {
      this.IE = false;
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

      var $self = jQuery(this);
      var width = $self.width();
      var height = $self.height();
      var paddingTop = toInt($self.css("padding-top"));
      var paddingBottom = toInt($self.css("padding-bottom"));
      var borderTop = toInt($self.css("border-top-width"));
      var borderBottom = toInt($self.css("border-bottom-width"));
      var mediaBorder = (borderTop+borderBottom)/2;
      var mediaPadding = (paddingTop+paddingBottom)/2;
      var positionType = $self.parent().css("position");
      var halfWidth =  width /2;
      var halfHeight = height/2 + mediaPadding +mediaBorder;

      var cssProp = {
        position: 'absolute'
      };
      cssProp.height = height;
      cssProp.top = windowHeight/2 - halfHeight;
      cssProp.marginTop = 0;
      cssProp.width = width;
      cssProp.left = windowWidth/2 - halfWidth;
      cssProp.marginLeft = 0;
      if(positionType == 'static') {
        $self.parent().css("position","relative");
      }
      $self.css(cssProp);
    });

    function toInt(v) {
      var i = parseInt(v);
      return isNaN(i) ? 0 : i;
    }
  }

  /**
   * 多言語対応のリソースを読み込む
   */
  this.getLocalizedString = function(english) {
    if (strings == undefined) {
      return english;
    }
    var string = strings[english];
    if (string == undefined) {
      return english;
    }
    var lang = 'ja';
    var localized = string[lang];
    if (localized == undefined) {
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
      string = string.replace("{" + (key) + "}",args[key]);
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
    if(str == 'undefined') {
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
      if(name != ''){
        hash[name] = value == undefined ? true : decodeURIComponent(value);
      }
    }
    return hash;
  };

  this.constructor();
}


