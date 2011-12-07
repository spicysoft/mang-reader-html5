/*global $, _, _gaq, window, strings, App, $SceneAnimator */

/**
 * マンガを読み込み中のUI処理を行う MVCのコンポーネントに相当する処理を行う。
 *
 * @constructor
 */
function $Reader(_member, _superuser, _t, _nomenu) {
  var member = _member;
  var su = _superuser;
  var nomenu = _nomenu;
  var FPS = 33;
  var API_ROOT = '/api';
  var width = 0;
  var height = 0;

  var MODE_ORIGINAL = 'original';
  var MODE_READING  = 'reading';
  var current_mode  = MODE_READING;

  var VIEW_SCENE   = 0;
  var VIEW_PAGE    = 1;
  var current_view = VIEW_SCENE;

  var storyId;
  var storyMetaFile;
  var scenes;
  var pages;
  var sceneImages;
  var pageImages;
  var currentSceneIndex = 0;
  var currentPageIndex = 0;
  var isLoading = false;

  var su_key = "";
  var su_expire = 0;
  var t = _t;
  var dpi = 240;
  var cdn = false;

  if (App.IE) {
    // canvasが実装されていないのでdivに置換
    // style="background: #000;"を定義しないとクリッカブルにならない
    $("#canvas").replaceWith(
        '<div id="canvas" style="background: #000;"></div>');
  }

  var getUrlVars = function(){
    var vars = [], hash;
    var param = window.location.href.slice(window.location.href.indexOf('?') + 1);
    if(!param){
      return vars;
    }
    var hashes = param.split('&');
    for(var i = 0; i < hashes.length; i++) {
      if(hashes[i].indexOf('=') < 0){
        continue;
      }
      hash = hashes[i].split('=');
      vars.push(hash[0]);
      vars[hash[0]] = hash[1].split('#')[0];
    }
    return vars;
  };

  var get_vars = getUrlVars();
  if(su){
    su_key = get_vars["k"];
    su_expire = get_vars["expire"];
  }

  var act_start = App.isSmartPhone?"touchstart":"mousedown";
  var act_button = App.isSmartPhone?"touchend":"mouseup";

  var prevent_default = function(event) {
    if (App.IE) {
      event.returnValue = false;
    }else{
      event.preventDefault();
    }
  };

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

  var resolveDpi = function(w){
    if(w < 320){
      return 240;
    }else if(w < 480){
      return 320;
    }else if(w < 640){
      return 480;
    }else{
      return 640;
    }
  };
  dpi = resolveDpi(canvas.width);

  var SceneAnimator = new $SceneAnimator(width, height, FPS);

  var updateIndex = function(nindex){
    if(current_view === VIEW_PAGE){
      currentPageIndex = nindex;
      var sceneIndex = 0;
      for(var i; i<scenes.length; i++){
        if(currentPageIndex === (scenes[i]['page_number']-1)){
          break;
        }
        sceneIndex++;
      }
      currentSceneIndex = sceneIndex;
    }else{
      currentSceneIndex = nindex;
      currentPageIndex = scenes[currentSceneIndex]['page_number']-1;
    }
  };

  /**
   * 画面描画
   * @return void
   */
  var paint = function() {
    var i;
    if(current_view === VIEW_PAGE){
        i = pageImages[current_mode][currentPageIndex];
    }else{
        i = sceneImages[current_mode][currentSceneIndex];
    }

    if (i === undefined || !i.hasLoaded()) {
      return;
    }

    var x = SceneAnimator.x();
    var y = SceneAnimator.y();
    var w = i.width;
    var h = i.height;
    var dx = (width - w) / 2 + x;
    var dy = (height - h) / 2 + y;

    if (App.IE) {
      i.style.cssText = "position: absolute; top: " + dy + "px; left:" + dx + "px;";
      $("#canvas").empty().append(i);
    } else {
      var context = canvas.getContext("2d");

      context.fillStyle = canvas.style.background;
      context.fillRect(0, 0, width, height);

      //Android2.1以下のCanvas drawImageバグ対応
      //  画像が勝手にscreen.width/320でスケールされるので、描画前にこの比率に合わせてcanvasをスケールしておく
      //@see http://d.hatena.ne.jp/koba04/20110605/1307205438
      if(App.ANDROID21){
        context.save();
        var rate =  Math.sqrt(320/screen.width);
        context.scale(rate, rate);
      }

      context.drawImage(i, dx, dy);
      if(App.ANDROID21){
        context.restore();
      }
    }
  };

  var ajax = function(url, datatype, fnSuccess, fnError, method, cache){
    var settings = {
      'url' : url,
      'type' : method,
      'async' : true,
      'cache' : cache,
      'dataType' : datatype,
      'success' : function(json) {
        fnSuccess(json);
      },
      'error' : function(req, status, error) {
        console.log(this);
        console.log(status);
        console.log(error);
        fnError();
      }
    };
    $.ajax(settings);
  };

  var ajax_get = function(url, datatype, fnSuccess, fnError, cache){
    ajax(url, datatype, fnSuccess, fnError, 'get', cache);
  };

  var ajax_post = function(url, datatype, fnSuccess, fnError){
    ajax(url, datatype, fnSuccess, fnError, 'post', false);
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
    var param='';
    var cache = true;
    if(su){
      param = '?mode=superuser&k='+su_key+'&expire='+su_expire;
      cache = false;
    }else{
      if(t > 0){
        param = "?t="+t;
      }
    }

    var host = "";
    if(cdn){
      host = "http://cdn."+location.host;
    }
    ajax_get(host + API_ROOT + '/storyMetaFile/' + storyId+param, 'json', fnSuccess, fnError, cache);
  };

  /**
   * [サーバーAPI]
   *
   * イイネ投票する
   */
  var apiVoteStory = function(comicId, storyId, value, fnSuccess, fnError){
    ajax_post('/api/voteStory/'+comicId + '/' + storyId + '/' + value ,
     'json', fnSuccess, fnError);
  };

  /**
   * [サーバーAPI]
   *
   * ブックマークする
   */
  var apiBookmark = function(comicId, fnSuccess, fnError){
    ajax_post('/api/bookmark/'+comicId, 'json', fnSuccess, fnError);
  };

  var apiRead = function(storyId, fnSuccess, fnError){
    ajax_post('/api/read/'+storyId, 'json', fnSuccess, fnError);
  };

  var updateProgress = function(){
    if(current_view === VIEW_PAGE){
      $("#progress_total").text(pages.length);
      $("#progress_current").text(currentPageIndex+1);
    }else{
      $("#progress_total").text(scenes.length);
      $("#progress_current").text(currentSceneIndex+1);
    }
  };

  /**
   * 表示モードを通信エラーに切り替える
   * TODO 新エラー
   */
  var showError = function() {
    $("#preview").show();
    $("#loading").hide();
    $("#reader").hide();
    $("#finish").hide();
    $("#error").show();
  };

  var goToNextStory = function(next_story_id, comic_id, param){
    var after_param = '';
    if(param !== ""){
      after_param = "?after="+param;
    }
    if(next_story_id === false){
      parent.document.location.href = '/comic/view/'+comic_id+'/story/_undelivered'+after_param;
    }else{
      if (member) {
        parent.document.location.href = '/comic/view/'+comic_id+'/story/'+next_story_id+after_param;
      } else {
        parent.document.location.href = '/comic/landing/nomember?next=/comic/view/'+
          comic_id+'/story/'+next_story_id;
      }
    }
  };

  /**
   * [サーバーAPIとの通信メソッド] サーバーからシーン画像を取得する
   *
   * @private
   * @return Image ただし非同期なので読み込み完了していることは保証されない
   */
  var apiSceneImage = function(sceneId, mode, dpi) {
    var i = new Image();
    i.hasLoaded = function(){
      //IE9でImage.completeが動作しない場合があるので、
      //Image.widthを見てロードが完了したか判断する
      return this.width > 0;
    };
    i.onerror = function(){
       console.log("error!"+sceneId);
       //TODO エラー処理
    };
    var param = "";
    if(t > 0){
      param = "?t="+t;
    }
    var host = "";
    if(cdn){
      host = "http://cdn."+location.host;
    }
    i.src = host+API_ROOT + '/sceneImage/' + sceneId + '/' + mode + '/' + dpi + param;
    return i;
  };

  /**
   * [サーバーAPIとの通信メソッド] サーバーからページ画像を取得する
   *
   * @private
   * @return Image ただし非同期なので読み込み完了していることは保証されない
   */
  var apiPageImage = function(pageId, mode, dpi) {
    var i = new Image();
    i.hasLoaded = function(){
      //IE9でImage.completeが動作しない場合があるので、
      //Image.widthを見てロードが完了したか判断する
      return this.width > 0;
    };
    i.onerror = function(){
       console.log("error!"+pageId);
       //TODO エラー処理
    };
    var param = "";
    if(t > 0){
      param = "?t="+t;
    }
    var host = "";
    if(cdn){
      host = "http://cdn."+location.host;
    }
    i.src = host+API_ROOT + '/pageImage/' + pageId + '/' + mode + '/' + dpi + param;
    return i;
  };

  /**
   * 指定したシーン番号のシーン読み込みを準備する。
   * またこの内部でプリロード、破棄処理も行う。 現在は一括ロード。
   */
  var fetchSceneImage = function(sceneIndex) {
    var under = sceneIndex - 4;
    var prefetch = sceneIndex + 12;
    for ( var n = 0; n < scenes.length; n++) {
      if (n < under && sceneImages[current_mode][n] !== undefined) {
        sceneImages[current_mode][n] = undefined;
      } else if (under <= n && n <= prefetch && sceneImages[current_mode][n] === undefined) {
        var ndpi;
        if(in_array(dpi, scenes[n]['support_size'])){
          ndpi = dpi;
        }else{
          ndpi = scenes[n]['support_size'][0];
        }
        sceneImages[current_mode][n] = apiSceneImage(scenes[n]['scene_id'], current_mode, ndpi);
      }
    }
  };

  var fetchPageImage = function (pageIndex){
    var under = pageIndex - 1;
    var prefetch = pageIndex + 4;
    for ( var n = 0; n < pages.length; n++) {
      if (n < under && pageImages[current_mode][n] !== undefined) {
        pageImages[current_mode][n] = undefined;
      } else if (under <= n && n <= prefetch && pageImages[current_mode][n] === undefined) {
        var ndpi;
        if(in_array(dpi, pages[n]['support_size'])){
          ndpi = dpi;
        }else{
          ndpi = pages[n]['support_size'][0];
        }
        pageImages[current_mode][n] = apiPageImage(pages[n]['page_id'], current_mode, ndpi);
      }
    }
  };

  /**
   * コマ毎の初期化 jumpToScene
   * @return void
   */
  var jumpTo = function(newIndex) {
    hideMenu(500);
    if(current_view === VIEW_PAGE){
        fetchPageImage(newIndex);
    }else{
        fetchSceneImage(newIndex);
    }
    updateIndex(newIndex);
    updateProgress();

    var i;
    if(current_view === VIEW_PAGE){
      i = pageImages[current_mode][newIndex];
    }else{
      i = sceneImages[current_mode][newIndex];
    }

    function onloaded() {
      if(current_view === VIEW_SCENE){
        var scene = scenes[currentSceneIndex];
        SceneAnimator.initializeWhenLoaded(i, scene["scroll_course"], scene["scroll_speed"]);
      }else{
        SceneAnimator.initializeWhenLoaded(i, 0, 240);//FIXME
      }
      $("#loading").hide();
      isLoading = false;
      paint();
    }

    if (i !== undefined && i.hasLoaded()) {
      onloaded();
    } else {
      isLoading = true;
      showMenu(500,500);
      $("#loading").show();
      SceneAnimator.initializeWhenUnloaded();
      i.onload = onloaded;
    }
  };

  /**
   * 前のコマに戻る
   */
  var jumpPrev = function() {
    var prev;
    if(current_view === VIEW_PAGE){
      prev = currentPageIndex - 1;
    }else{
      prev = currentSceneIndex - 1;
    }

    if (0 <= prev) {
      jumpTo(prev);
    }
  };

  var hideFinished = function(){
    $("#finish").hide();
    $("#finish_actions").hide();
  };

  var activate_button = function(item, time){
    item.addClass("active");
    if(0 < time){
      setTimeout(function(){
        item.removeClass("active");
      },time);
    }
  };

  var disable_button = function(item){
    item.addClass("disable");
  };

  var enable_button = function(item){
    item.removeClass("disable");
  };

  /**
   * スクロールをひとつ前に戻す
   *
   * @private
   * @return void
   */
  var goPrev= function(e) {
    console.log("goPrev");
    if(current_view === VIEW_PAGE && 0 === currentPageIndex ||
      current_view === VIEW_SCENE && 0 === currentSceneIndex){
      prevent_default(e);
      return;
    }
    if(current_view === VIEW_PAGE){
      activate_button($("#prev_page"), 500);
    }else{
      activate_button($("#prev_scene"), 500);
    }

    hideFinished();
    jumpPrev();
    prevent_default(e);
  };

  var show_first_click = function(e){
    if(current_view === VIEW_PAGE && 0 === currentPageIndex ||
        current_view === VIEW_SCENE && 0 === currentSceneIndex){
        prevent_default(e);
        return;
    }
    activate_button($("#first_scene"), 500);
    hideFinished();
    jumpTo(0);
    prevent_default(e);
  };

  var menuIsVisible = function(){
    return $("#menu").css("top") === "0px";
  };

  var hideMenu = function(fadeout){
    if(!menuIsVisible()){
      return;
    }
    $("#menu").animate(
        {top: "-132px"},
        fadeout,'swing',
        function(){
          $("#menu_switch").bind(act_start, menu_click);
        });
  };

  var menu_hide_click = function(e){
      hideMenu(500);
      prevent_default(e);
  };

  /**
   * メニューを表示する
   */
  var showMenu = function (lifetime, fadeout){
    if(menuIsVisible() || nomenu){
      return;
    }
    $("#menu_switch").unbind(act_start, menu_click);
    $("#menu").animate(
        {top: "0"},
        fadeout,'swing',
        function(){
          $("#menu_switch").unbind(act_start, menu_click);
        });

    if(current_view === VIEW_SCENE && currentSceneIndex === 0){
      disable_button($("#prev_scene"));
      disable_button($("#first_scene"));
    }else{
      enable_button($("#prev_scene"));
      enable_button($("#first_scene"));
    }
    if(current_view === VIEW_PAGE && currentPageIndex === 0){
      disable_button($("#prev_page"));
      disable_button($("#first_scene"));
    }else{
      enable_button($("#prev_page"));
      enable_button($("#first_scene"));
    }
  };

  var menu_click = function(e){
      showMenu(500, 500);
      prevent_default(e);
  };

  var hideAll = function(){
    hideMenu(500);
    $("#next").hide();
    $("#vote").hide();
    $("#bookmark").hide();
    $("#loading").show();
    $("#canvas").css({cursor:"wait"});
  };

  var showFinished = function() {
    var next_story_id = storyMetaFile["next_story_id"];
    var comic_id = storyMetaFile["comic_id"];
    showMenu(0);
    $("#next").unbind(act_button);
    $("#vote").unbind(act_button);
    $("#bookmark").unbind(act_button);

    if (member) {
      setTimeout(
        function(){
          $("#vote").bind(act_start,
            function(e) {
              activate_button($("#vote"), 0);
            });
          $("#vote").bind(act_button,
            function(e) {
              activate_button($("#vote"), 0);
              setTimeout(function(){
                apiVoteStory(comic_id, storyId, 1, function(){
                  goToNextStory(next_story_id, comic_id, "vote");
                },function(){showError();});
                hideAll();
              },0);
              prevent_default(e);
            });
           $("#bookmark").bind(act_start,
             function(e) {
               activate_button($("#bookmark"), 0);
             });
           $("#bookmark").bind(act_button,
             function(e) {
               activate_button($("#bookmark"), 0);
               setTimeout(function(){
                 apiBookmark(comic_id, function(){
                   goToNextStory(next_story_id, comic_id, "bookmark");
                 },function(){showError();});
               hideAll();
             },0);
             prevent_default(e);
           });
           enable_button($("#vote"));
           enable_button($("#bookmark"));
         }
      ,500);
      disable_button($("#vote"));
      disable_button($("#bookmark"));
    }else if(!su) {
      disable_button($("#vote"));
      disable_button($("#bookmark"));
    }else{
      $("#vote").hide();
      $("#bookmark").hide();
    }

    if(su){
        $("#next").hide();
    }else{
        disable_button($("#next"));
        setTimeout(
          function(){
            $("#next").bind(act_start,
              function(e) {
                activate_button($("#next"), 0);
              });
            $("#next").bind(act_button,
              function(e) {
                setTimeout(function(){
                  goToNextStory(next_story_id, comic_id, "");
                },0);
                hideAll();
                prevent_default(e);
            });
            enable_button($("#next"));
          }
          ,500);
    }

    $("#preview").hide();
    $("#loading").hide();
    $("#reader").show();
    $("#error").hide();
    $("#finish").show();
    $("#finish_actions").show();
  };

  /**
   * 次のシーンへ進める
   */
  var jumpNext = function() {
    if(isLoading){
      return;
    }
    var next;
    if(current_view === VIEW_PAGE){
      next = currentPageIndex + 1;
    }else{
      next = currentSceneIndex + 1;
    }
    if (current_view === VIEW_PAGE && next >= pages.length ||
        current_view === VIEW_SCENE && next >= scenes.length) {
      showFinished();
    } else {
      jumpTo(next);
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
      setTimeout(animation, 1000 / FPS);
    }
  };

  /**
   * スクロールをひとつ先に進める
   *
   * @private
   * @return void
   */
  var goNext = function() {
    SceneAnimator.reverse = false;
    SceneAnimator.dirFwd = true;

    if (SceneAnimator.isAtScrollStart()) {
      SceneAnimator.startScroll();
      animation();

    } else if (SceneAnimator.isScrolling()) {
      SceneAnimator.skipScroll();
      paint();

    } else if (SceneAnimator.isAtScrollEnd()) {
      jumpNext();

    } else {
      throw "Illega state";
    }
  };

  /**
   * 表示モードを「ローディング中」に切り替える
   */
  var showLoading = function() {
    isLoading = true;
    showMenu(500,0);
    $("#canvas").css({cursor:"default"});
    $("#dialog_loading").show();
    $("#reader").hide();
    $("#finish").hide();
    $("#error").hide();
  };

  /**
   * 表示モードを「マンガ閲覧中」に切り替える
   */
  var showReader = function() {
    $("#canvas").css({cursor:"pointer"});
    $("#dialog_loading").hide();
    $("#reader").show();
    $("#finish").hide();
    $("#error").hide();
    var canvas_click = function(event) {
      goNext();
      prevent_default(event);
    };
    $("#canvas").unbind(act_start,canvas_click);
    $("#canvas").bind(act_start,canvas_click);

    var format = _("Loading images");
    var args = {
      "story_number"   : storyMetaFile.story_number,
      "story_title"    : storyMetaFile.story_title,
      "number_of_story": storyMetaFile.number_of_story
    };
    isLoading = false;
  };

  var clearSceneImages = function(){
    if(sceneImages === undefined){
      return;
    }
    for ( var n = 0; n < sceneImages[MODE_READING].length; n++) {
      var ir = sceneImages[MODE_READING][n];
      if (ir !== undefined) {
        ir.onload = null;
      }
      var io = sceneImages[MODE_ORIGINAL][n];
      if (io !== undefined) {
        io.onload = null;
      }
    }
  };

  var clearPageImages = function(){
    if(pageImages === undefined){
      return;
    }
    for ( var n = 0; n < pageImages[MODE_READING].length; n++) {
      var ir = pageImages[MODE_READING][n];
      if (ir !== undefined) {
        ir.onload = null;
      }
      var io = pageImages[MODE_ORIGINAL][n];
      if (io !== undefined) {
        io.onload = null;
      }
    }
  };
  /**
   * 指定したマンガの話をリーダーで開く。
   */
  var openStory = function(_storyId) {
    storyId = _storyId;
    clearSceneImages();
    clearPageImages();
    sceneImages = [];
    sceneImages[MODE_ORIGINAL] = [];
    sceneImages[MODE_READING] = [];
    pageImages = [];
    pageImages[MODE_ORIGINAL] = [];
    pageImages[MODE_READING] = [];

    scenes = null;
    currentSceneIndex = 0;
    currentPageIndex = 0;
    storyMetaFile = null;
    showLoading();
    apiStoryMetaFile(storyId, function(json) {
      storyMetaFile = json;
      scenes = storyMetaFile["scenes"];
      pages = storyMetaFile["pages"];

      if(storyMetaFile["csn"]){
        cdn = true;
      }
      updateProgress();

      if(storyMetaFile['enable_original_mode']){
        enable_button($("#toggle_reading"));
        $("#toggle_reading").bind(act_button, change_mode_original);
        $("#toggle_original").bind(act_button, change_mode_reading);
      }
      if(storyMetaFile['enable_page_mode']){
        enable_button($("#toggle_scene_view"));
        $("#toggle_scene_view").bind(act_button, change_view_page);
        $("#toggle_page_view").bind(act_button, change_view_scene);
      }
      $("#prev_scene").bind(act_button, goPrev);
      $("#prev_page").bind(act_button, goPrev);
      $("#first_scene").bind(act_button, show_first_click);

      if (scenes.length === 0) {
        showFinished();
      } else {
        showReader();
        jumpTo(0);
      }
      if(!su){
        apiRead(storyId, function(json){console.log(json);});
      }
    }, function() {
      showError();
    });
    _gaq.push(['_trackPageview', '/event/viewer/open/'+storyId]);
  };

  var change_mode_original = function(){
    if(storyMetaFile['enable_original_mode']){
        current_mode  = MODE_ORIGINAL;
        if(current_view === VIEW_PAGE){
          jumpTo(currentPageIndex);
        }else{
          jumpTo(currentSceneIndex);
        }
        $("#toggle_reading").hide();
        $("#toggle_original").show();
    }
  };

  var change_mode_reading = function(){
    current_mode  = MODE_READING;
    if(current_view === VIEW_PAGE){
        jumpTo(currentPageIndex);
    }else{
        jumpTo(currentSceneIndex);
    }
    $("#toggle_original").hide();
    $("#toggle_reading").show();
  };

  var change_view_page = function(){
    console.log("change_view_page");
    if(storyMetaFile['enable_page_mode']){
      current_view = VIEW_PAGE;
      jumpTo(currentPageIndex);
      $("#toggle_scene_view").hide();
      $("#toggle_page_view").show();
      $("#prev_scene").hide();
      $("#prev_page").show();
    }
  };

  var change_view_scene = function(){
      current_view = VIEW_SCENE;
      jumpTo(currentSceneIndex);
      $("#toggle_page_view").hide();
      $("#toggle_scene_view").show();
      $("#prev_page").hide();
      $("#prev_scene").show();
  };

  var prepareMenu = function(){
      $("#menu").css("top", -1 * 132 + "px");//FIXME menuの高さが合わないのでハードコーディングした。なおしたい。
      $("#menu").show();
      $("#menu_tab").bind(act_button, menu_hide_click);
      disable_button($("#toggle_reading"));
      disable_button($("#toggle_scene_view"));
  };

  /**
   * プレビュー画面を表示する
   * @returns void
   */
  this.showPreview = function(_storyId) {
    $("#thumbnail").attr("src", "/icon/story_image/medium/" + _storyId);
    $("#thumbnail").hide();
    $("#thumbnail").bind("load", function(e){
      $("#thumbnail").width(canvas.width);
      $("#thumbnail").height(canvas.width * ($("#thumbnail").height()/$("#thumbnail").width()));
      App.centering($("#thumbnail"));
      $("#thumbnail").show();
    });
    $("#preview_ui").show();
    $("#preview").show();
    $("#preview > *").unbind('click');
    $("#preview > *").click(function(event) {
      openStory(_storyId);
      $("#preview").hide();
      prevent_default(event);
    });
  };

  //子フレーム用のキー入力受付
  $(window).keydown(function(e){
      //console.log(e.keyCode);
      if(e.which === 32      //space
        || e.which === 13  //enter
        || e.which === 39  //right
        || e.whicch === 40 //down
        ){
        $("#canvas").trigger('mousedown');
        e.preventDefault();
      }else if(e.which === 8//BS
          || e.which === 37//left
          || e.which === 38//up
        ){
        ("#prev_scene").trigger('mouseup');
        e.preventDefault();
      }
    });

  this.openStory = openStory;
  this.goNext = goNext;

  prepareMenu();
}

