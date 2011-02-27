
/**
 * Singleton of $App class.
 */
var App;
var Reader;
var _;
var strings = {};
$(function() { App_startup(); });
/**
 * スタートアップ処理。
 * App シングルトンインスタンスを生成して処理を委譲する。
 *
 * @example
 *  $(function() {
 *    App_startup($("readerCanvas"));
 *  });
 */
function App_startup()
{
  App = new $App();
  Reader = new $Reader();
  _ = App.getLocalizedString;
}

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

    this.userId  = 0;
    this.languageId = 0;
    this.apiRoot = '/api';
    this.GET = parseQueryString(location.search);
    this.storyId = this.GET['storyId'];
    if (this.storyId == undefined) {
      alert("storyId isn't defined.");
    }
    this.showPreview(this.storyId);
  };

  this.center(parent,element)
  {
      var wWidth = parent.width();
      var dWidth=element.css("width").slice(0,-2);
      var dLeft=(wWidth/2-dWidth/2)+"px";
      element.css("left",dLeft);
  }

  /**
   * プレビュー画面を表示する
   * @returns void
   */
  this.showPreview = function(storyId)
  {
    $("#preview > *").click(this.click);
    $("#thumbnail").attr("src","/icon/story_image/medium/" + storyId);
    $("#preview").show();
    this.center($("#preview"),$("button"));
    $("#preview").width();
    
  }
  
  /**
   * 表示モードを「ローディング中」に切り替える
   */
  this.showLoading = function()
  {
    $("#preview").show();
    $("#loading").show();
    $("#reader").hide();
    $("#finish").hide();
    $("#error").hide();
  };

  /**
   * 表示モードを「マンガ閲覧中」に切り替える
   */
  this.showReader = function()
  {
    $("#preview").hide();
    $("#loading").hide();
    $("#reader").show();
    $("#finish").hide();
    $("#error").hide();
  };

  /**
   * 表示モードを通信エラーに切り替える
   */
  this.showError = function()
  {
    $("#preview").show();
    $("#loading").hide();
    $("#reader").hide();
    $("#finish").hide();
    $("#error").show();
  };

  this.showFinished = function()
  {
    $("#preview").hide();
    $("#loading").hide();
    $("#reader").show();
    $("#finish").show();
    $("#error").hide();
  };

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
   * @public
   */
  this.click = function()
  {
    Reader.openStory(App.storyId);
  };

  /**
   * どこまで読んだか？ローカルブックマークを記録する
   */
  this.bookmark = function(storyId,sceneIndex)
  {
  };

  /**
   * QueryStringを解析して連想配列にデコードする
   * @param String str QueryString
   * @returns Array デコード結果
   */
  var parseQueryString = function(str)
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


