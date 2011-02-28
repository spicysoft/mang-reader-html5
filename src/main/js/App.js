/**
 * Singleton of $App class.
 */
var App;
var Reader;
var _;
var strings = {};

/**
 * スタートアップ処理。
 * App シングルトンインスタンスを生成して処理を委譲する。
 */
$(function() {
  App = new $App(); 
  var GET = App.parseQueryString(location.search);
  var storyId = GET['storyId'];
  if (storyId == undefined) {
    alert("storyId isn't defined.");
  }
  Reader = new $Reader();
  Reader.showPreview(storyId);

});

/**
 * App Class definition.
 * @constructor
 */
function $App()
{
  /**
   * コンストラクター実装
   */
  this.constructor = function()
  {
    if (typeof window.console != 'object'){
      window.console = {log:function(){},debug:function(){},info:function(){},warn:function(){},error:function(){},assert:function(){},dir:function(){},dirxml:function(){},trace:function(){},group:function(){},groupEnd:function(){},time:function(){},timeEnd:function(){},profile:function(){},profileEnd:function(){},count:function(){}};
    }
    this.apiRoot = '/api';
    this.languageId = 0;
    _ = this.getLocalizedString;
  };

  /**
   * @private 
   */
  this.centering = function(element) {
    element.each(function(){
      var $self = jQuery(this);
      var width = $self.width();
      var height = $self.height();
      var paddingTop = parseInt($self.css("padding-top"));
      var paddingBottom = parseInt($self.css("padding-bottom"));
      var borderTop = parseInt($self.css("border-top-width"));
      var borderBottom = parseInt($self.css("border-bottom-width"));
      var mediaBorder = (borderTop+borderBottom)/2;
      var mediaPadding = (paddingTop+paddingBottom)/2;
      var positionType = $self.parent().css("position");
      var halfWidth = (width/2)*(-1);
      var halfHeight = ((height/2)*(-1))-mediaPadding-mediaBorder;
      var cssProp = {
        position: 'absolute'
      };

      cssProp.height = height;
      cssProp.top = '50%';
      cssProp.marginTop = halfHeight;

      cssProp.width = width;
      cssProp.left = '50%';
      cssProp.marginLeft = halfWidth;

      if(positionType == 'static') {
        $self.parent().css("position","relative");
      }

      $self.css(cssProp);
    });
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

  /**
   * [サーバーAPIとの通信メソッド]
   * サーバーからシーン画像を取得する
   * @return Image ただし非同期なので読み込み完了していることは保証されない
   */
  this.apiSceneImage = function(sceneId)
  {
    var i = new Image();
    i.src = this.apiRoot + '/sceneImage/' + sceneId;
    return i;
  };

  /**
   * [サーバーAPIとの通信メソッド]
   *
   * Story Metaファイルを取得する
   * @param storyId ストーリー番号
   * @param fnSuccess 成功時のコールバック
   * @param fnError 失敗時のコールバック
   * @returns void 非同期通信です。通信を開始後、完了をまたずにすぐに処理が戻ります。
   */
  this.apiStoryMetaFile = function(storyId,fnSuccess,fnError) 
  {
    var settings = {
        'url': this.apiRoot + '/storyMetaFile/' + storyId,
        'type': 'get',
        'async': true,
        'cache': false,
        'dataType' : 'json',
        'success' : function(json) { fnSuccess(json); },
        'error': function() { fnError();}
    };

    $.ajax(settings);
  };

  this.constructor();
}


