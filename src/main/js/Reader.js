/*global $, JQuery, _, _gaq,_gat, window, strings, App, $SceneAnimator */

/**
 * マンガを読み込み中のUI処理を行う MVCのコンポーネントに相当する処理を行う。
 */
function $Reader(_member, _superuser, _t, _nomenu, _fps) {
  var member = _member;
  var su = _superuser;
  var nomenu = _nomenu;
  var FPS = _fps;
  var API_ROOT = '/api';
  var width = 0;
  var height = 0;
  var canvas;

  var MODE_ORIGINAL = 'original';
  var MODE_READING  = 'reading';
  var current_mode  = MODE_READING;

  var VIEW_SCENE   = 0;
  var VIEW_PAGE    = 1;
  var current_view = VIEW_SCENE;

  var storyId;
  var creatorId;
  var comicId;
  var storyMetaFile;
  var scenes;
  var pages;
  var sceneImages;
  var pageImages;
  var currentSceneIndex = 0;
  var currentPageIndex = 0;
  var isLoading = false;

  var comicTitleInsert = false;
  var comicTitleImage;
  var storyTitleInsert = false;
  var hasComicTitleShown = false;
  var hasStoryTitleShown = false;
  var hasAllTitleShown = true;

  var su_key = "";
  var su_expire = 0;
  var t = _t;
  var dpi = 240;
  var cdn_host;

  var error = 0;
  var started = false;
  var prev_image;

  var pageX = 0;
  var reverse = false;
  var pageScroll = false;
  var limitX = 0;
  var is_back = false;
  var trackstart = false;

  console.log("v4.0.2");

  if (App.IE) {
    // canvasが実装されていないのでdivに置換
    // style="background: #000;"を定義しないとクリッカブルにならない
    $("#canvas").replaceWith(
        '<div id="canvas" style="background: #000;"></div>');
  }

  if(!t){
    t = parseInt((new Date())/1000, 10);
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

  if(nomenu){
    $("#menu_switch").hide();
  }

  var resolveDpi = function(w){
    console.log("resolve src:" + w);
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

  var setWidthAndHeight = function(){
    if (App.IE && (App.IE_VER < 8 || document.documentMode < 8)) {
      width = $(window).width();
      height = $(window).height();
      console.log("w-h: "+width+"-"+height);
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
      canvas.style.height = height + "px";
    }
    if (App.IE && (App.IE_VER < 8 || document.documentMode < 8)) {
      dpi = resolveDpi(Math.max(width, height));
    }else{
      dpi = resolveDpi(Math.max(canvas.width, canvas.height));
    }
    console.log(width + "x" + height + " dpi:" + dpi);
  };

  setWidthAndHeight();
  var SceneAnimator = new $SceneAnimator(width, height, FPS);

  var updateIndex = function(nindex){
    if(current_view === VIEW_PAGE){
      currentPageIndex = nindex;
      var sceneIndex = 0;
      for(var i=0; i<scenes.length; i++){
        if(currentPageIndex === (scenes[i]['page_number']-1)){
          break;
        }
        sceneIndex++;
      }
      currentSceneIndex = sceneIndex;
    }else{
      if(scenes[nindex] !== undefined){
        currentSceneIndex = nindex;
        currentPageIndex = scenes[currentSceneIndex]['page_number']-1;
      }else{
        console.log("corrupt index:" + nindex);
      }
    }
  };

  var paintComicTitle = function(i){
      var w=i.width;
      var h=i.height;
      var dx= Math.round((width - w) / 2);
      var dy= Math.round((height - h) / 2);

      if (App.IE) {
        i.width = w;
        i.height = h;
        i.style.cssText = "position: absolute; top: " + dy + "px; left:" + dx + "px;";
        $("#canvas").empty().append(i);
      } else {
        var context = canvas.getContext("2d");
        context.drawImage(i, dx, dy, w, h);
      }
  };

  var paintPageImage = function(i0, i1){
    var d=0;
    if(reverse){
      d = pageX;
    }else{
      d = -1 * pageX;
    }
    var x0 = d;
    var x1;
    if(reverse){
      x1=d-width;
    }else{
      x1=d+width;
    }

    var w0=i0.width;
    var h0=i0.height;
    var dx0=(width - w0) / 2 + x0;
    var dy0=(height - h0) / 2;

    var w1 = 0;
    var h1 = 0;
    var dx1 = 0;
    var dy1 = 0;
    if(i1){
      w1=i1.width;
      h1=i1.height;
      dx1=(width - w1) / 2 + x1;
      dy1=(height - h1) / 2;
    }

    if (App.IE) {
      var mask = "<div style='position:absolute; width:100%;height:100%;'></div>";
      i0.style.cssText = "position: absolute; top: " + dy0 + "px; left:" + dx0 + "px;";
      var elm = $("#canvas").empty().append(i0);
      if(i1){
        i1.style.cssText = "position: absolute; top: " + dy1 + "px; left:" + dx1 + "px;";
        elm = elm.append(i1);
      }
      elm.append(mask);
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

      context.drawImage(i0, dx0, dy0);
      if(i1){
        context.drawImage(i1, dx1, dy1);
      }
      if(App.ANDROID21){
        context.restore();
      }
    }
  };

  var paintImage = function(i){
      var x;
      var y;
      if(current_view === VIEW_PAGE){
        x=0;
        y=0;
      }else{
        x=SceneAnimator.x();
        y=SceneAnimator.y();
      }
      var w=i.scaledWidth();
      var h=i.scaledHeight();
      var dx=(width - w) / 2 + x;
      var dy=(height - h) / 2 + y;
      if (App.IE) {
        if(App.IE_VER==8 || document.documentMode==8){
          $("#canvas").css({zoom:i.scale});
          i.style.cssText = "position: absolute; top: " + dy + "px; left:" + dx + "px;";
        }else{
          i.style.cssText = "position: absolute; top: " + dy + "px; left:" + dx + "px; zoom:"+i.scale+";";
        }
        var mask = "<div style='position:absolute; width:100%;height:100%;'></div>";
        $("#canvas").empty().append(i).append(mask);
      } else {
        var context = canvas.getContext("2d");
        context.save();
        context.fillStyle = canvas.style.background;
        context.fillRect(0, 0, width, height);
        //Android2.1以下のCanvas drawImageバグ対応
        //  画像が勝手にscreen.width/320でスケールされるので、描画前にこの比率に合わせてcanvasをスケールしておく
        //@see http://d.hatena.ne.jp/koba04/20110605/1307205438
        if(App.ANDROID21){
          var rate =  Math.sqrt(320/screen.width);
          context.scale(rate, rate);
        }
        console.log(dx + ' ' + dy + ' ' + i.scaledWidth() + ' ' + i.scaledHeight());
        context.drawImage(i, dx, dy, i.scaledWidth(), i.scaledHeight());
        context.restore();
      }
    };

  /**
   * 画面描画
   * @return void
   */
  var paint = function() {
    var i;
    if(comicTitleInsert && !hasComicTitleShown){
      i = comicTitleImage;
      if (i === undefined || !i.hasLoaded()) {
        return;
      }
      paintComicTitle(i);
      hasComicTitleShown = true;
      return;
    }else if(storyTitleInsert && !hasStoryTitleShown){
      $("#story_title_insert").show();
      hasStoryTitleShown = true;
      return;
    }else{
      $("#story_title_insert").hide();
      if(current_view === VIEW_PAGE){
        i = pageImages[current_mode][currentPageIndex];
      }else{
        i = sceneImages[current_mode][currentSceneIndex];
      }
    }
    if (i === undefined || !i.hasLoaded()) {
      return;
    }
    if(current_view === VIEW_PAGE){
      if(prev_image === undefined ||
          reverse && currentPageIndex === 0 ||
          !reverse && currentPageIndex === pages.length-1){
        paintImage(i);
        prev_image = i;
      }else if(pageScroll){
        if(reverse){
          paintPageImage(i, pageImages[current_mode][currentPageIndex-1]);
        }else{
          paintPageImage(i, pageImages[current_mode][currentPageIndex+1]);
        }
      }else{
        paintImage(i);
      }
    }else{
      paintImage(i);
    }
  };

  /**
   * 表示モードを通信エラーに切り替える
   */
  var showError = function(msg){
    $("#dialog_loading").hide();
    $("#reader").hide();
    $("#finish").hide();

    $("#errmsg_fan_only").hide();
    $("#errmsg_fan_only_guest").hide();
    $("#errmsg_friend_only").hide();
    $("#errmsg_friend_only_guest").hide();
    $("#errmsg_under18").hide();
    $("#errmsg_under18_guest").hide();
    $("#errmsg_servererr").hide();
    $("#errmsg_expired").hide();
    $("#errmsg_forbidden").hide();

    if(msg){
      $("#errmsg_default").hide();
      $(msg).show();
    }else{
      $("#errmsg_default").show();
    }
	
    $("#error").show();
	if(msg == "#errmsg_under18_guest") {
		set_error_img_src(msg);
		$("#dialog_error").hide();
	} else {
		$("#dialog_error").show();
	}
    
  };
  var set_error_img_src = function(msg){
  	var img = $(msg + " img");
	var rect = img.width();
	if(cdn_host==undefined)cdn_host="";
	img.attr("src",cdn_host+"/icon/story_image/"+rect+"x"+rect+"/" + storyId + "/"+t);
	
  }

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
        if(error === "Not Authoriezed"){
          showError("#errmsg_expired");
        }else if(error === "Fan Only"){
          if(member){
            showError("#errmsg_fan_only");
          }else{
            showError("#errmsg_fan_only_guest");
          }
        }else if(error === "Friend Only"){
          if(member){
            showError("#errmsg_friend_only");
          }else{
            showError("#errmsg_friend_only_guest");
          }
        }else if(error === "Under 18"){
          if(member){
            showError("#errmsg_under18");
          }else{
            showError("#errmsg_under18_guest");
          }
        }else if(error === "Forbidden"){
          showError("#errmsg_forbidden");
        }else if(error === "Closed Story"){
          showError("#errmsg_default");
        }else{
          if(error){
            showError("#errmsg_servererr");
          }else{
            console.log("unhandled error:" + status);
          }
        }
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
        param = "/"+t;
      }
    }
    ajax_get(API_ROOT + '/storyMetaFile/' + storyId+param, 'json', fnSuccess, fnError, cache);
  };

  /**
   * [サーバーAPI]
   * イイネ投票する
   */
  var apiVoteStory = function(comicId, storyId, value, fnSuccess, fnError){
    ajax_post('/api/voteStory/'+comicId + '/' + storyId + '/' + value ,
     'json', fnSuccess, fnError);
  };

  /**
   * [サーバーAPI]
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

  var goToNextStory = function(next_story_id, comic_id, param){
    var after_param = '';
    if(param !== ""){
      after_param = "?after="+param;
    }
    var url = '';
    if(next_story_id === false){
      if (member) {
        url = '/story/undelivered/'+comic_id+after_param;
      } else {
        url = '/story/landing/nomember?next=/story/undelivered/'+comic_id+after_param;
      }
    }else{
      if (member) {
        url = '/story/'+next_story_id+after_param;
      } else {
        url = '/story/landing/nomember?next=/story/'+next_story_id;
      }
    }
    (parent["goNextUrl"])(url);
  };

  var apiImage = function(id, mode, dpi, isRefetch, urlmaker, refetch){
    var i = new Image();
    i.scale = 1;
    i.hasLoaded = function(){
      //IE9でImage.completeが動作しない場合があるので、
      //Image.widthを見てロードが完了したか判断する
      if(!App.IE && this.complete === false){
        return false;
      }
      return this.width > 0 && this.height > 0;
    };
    i.onerror = function(){
       //再読み込みする
       console.log("error! id:"+id);
       if(error > 20){
         showError();
         return;
       }
       error++;
       refetch(id, mode, dpi, i);
    };
    i.scaledWidth = function(){
      return this.width * this.scale;
    };
    i.scaledHeight = function(){
      return this.height * this.scale;
    };
    var param = "";
    if(t > 0){
      param = "/"+t;
    }
    if(isRefetch){
      param += "?r="+error;
    }
    var host = "";
    if(t > 0){
      host = cdn_host;
    }
    i.src = urlmaker(host, id, mode,  dpi,  param);
    return i;
  };


  /**
   * [サーバーAPIとの通信メソッド] サーバーからシーン画像を取得する
   *
   * @private
   * @return Image ただし非同期なので読み込み完了していることは保証されない
   */
  var apiSceneImage = function(sceneId, mode, dpi, refetch) {
    return apiImage(sceneId, mode, dpi, refetch,
        function(host, sceneId, mode, dpi, param){
          return host+API_ROOT + '/sceneImage/' + sceneId + '/' + mode + '/' + dpi + param;
        },
        function(sceneId, mode, dpi, prev){
          console.log("refetch scene:" + sceneId);
          for(var i=0;i<scenes.length;i++){
            if(scenes[i]['scene_id']===sceneId){
              sceneImages[mode][i] = undefined;
              if(i===currentSceneIndex){
                  jumpTo(currentSceneIndex);
              }
              break;
            }
          }
        }
    );
  };

  var apiPageImage = function(pageId, mode, dpi) {
      return apiImage(pageId, mode, dpi, false,
          function(host, pageId, mode, dpi, param){
            return host+API_ROOT + '/pageImage/' + pageId + '/' + mode + '/' + dpi + param;
          },
          function(pageId, mode, dpi, prev){
            console.log("refetch page:" + pageId);
            for(var i=0;i<pages.length;i++){
              if(pages[i]['pageId']===pageId){
                pageImages[mode][i] = undefined;
                if(i===currentPageIndex){
                    jumpTo(currentPageIndex);
                  }
                break;
              }
            }
          }
      );
  };

  var apiComicTitleImage = function(comicId) {
      return apiImage(comicId, 0, 0, false,
          function(host, comicId, mode, dpi, param){
            return host + '/icon/xlarge/' + comicId + param;
          },
          function(comicId, mode, dpi){
            //
          }
      );
  };

  /**
   * 指定したシーン番号のシーン読み込みを準備する。
   * またこの内部でプリロード、破棄処理も行う。 現在は一括ロード。
   */
  var fetchSceneImage = function(sceneIndex) {
    var under = sceneIndex - 2;
    var max;
    if(current_mode  === MODE_READING){
      if(sceneIndex < 2){
        max = 3;
      }else if(4 < sceneIndex){
        max = 8;
      }else{
        max = sceneIndex+sceneIndex;
      }
    }else{
      max = 2;
    }
    var prefetch = sceneIndex + max;
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
        sceneImages[current_mode][n] = apiSceneImage(scenes[n]['scene_id'], current_mode, ndpi, false);
        sceneImages[current_mode][n].scale = dpi/ndpi;
      }
    }
  };

  var fetchPageImage = function (pageIndex){
    var under = pageIndex - 1;
    var max;
    if(current_mode  === MODE_READING){
      max = 3;
    }else{
      max = 1;
    }
    var prefetch = pageIndex + max;

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
        pageImages[current_mode][n].scale = 1;
      }
    }
  };

  var showComicTitle = function(){
    function onloaded() {
        $("#canvas").css({cursor:"default"});
        $("#dialog_loading").hide();
        isLoading = false;
        setTimeout(function(){
            hideMenu(500);
        },500);
        setTimeout(paint, 0);
    }

    if (comicTitleImage !== undefined && comicTitleImage.hasLoaded()) {
      onloaded();
    } else {
      isLoading = true;
      $("#dialog_loading").show();
      $("#canvas").css({cursor:"wait"});
      comicTitleImage.onload = onloaded;
    }
  };

  var showStoryTitle = function(){
    paint();
  };

  /**
   * コマ毎の初期化 jumpToScene
   * @return void
   */
  var jumpTo = function(newIndex) {
    console.log("jumpTo:" + newIndex);
    hideMenu(500);
    hideFinished();
    if(current_view === VIEW_PAGE){
        fetchPageImage(newIndex);
    }else{
        fetchSceneImage(newIndex);
    }

    if(comicTitleInsert && !hasComicTitleShown){
      console.log("show comic title");
      showComicTitle();
      trackPageView('comictitle');
      return;
    }
    if(storyTitleInsert && !hasStoryTitleShown){
      console.log("show story title");
      showStoryTitle();
      trackPageView('storytitle');
      return;
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
      }
      $("#canvas").css({cursor:"pointer"});
      $("#dialog_loading").hide();
      isLoading = false;
      setTimeout(function(){
          hideMenu(500);
      },500);
      setTimeout(paint, 0);
      if(!trackstart){
        return;
      }
      var quality = '/';
      if(current_mode==MODE_READING){
        quality = '/compressed';
      }else{
        quality = '/original';
      }
      if(current_view === VIEW_SCENE){
          trackPageView('frame'+quality+'/'+newIndex);
      }else{
          trackPageView('page'+quality+'/'+newIndex);
      }
    }

    if (i !== undefined && i.hasLoaded()) {
      onloaded();
    } else {
      isLoading = true;
      showMenu(500,500);
      $("#dialog_loading").show();
      $("#canvas").css({cursor:"wait"});
      if(i===undefined){
        console.log("empty image: " + newIndex);
        jumpTo(newIndex);
        return;
      }
      if(current_view === VIEW_SCENE){/*pai*/
        SceneAnimator.initializeWhenUnloaded();
      }
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
      is_back = true;
      jumpTo(prev);
    }
  };

  var hideFinished = function(){
    $("#finish").hide();
    $("#finish_actions").hide();
    $("#canvas").unbind(act_start,canvas_click);
    $("#canvas").bind(act_start,canvas_click);
  };

  var activate_button = function(item, time){
    item.addClass("active");
    if(0 < time){
      setTimeout(function(){
        item.removeClass("active");
      },time);
    }
  };

  //todo jquery pluginにする
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
    SceneAnimator.reverse = true;
    SceneAnimator.dirFwd = false;
    reverse = true;

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

    if(current_view === VIEW_PAGE){
      if (pageX >= width) {
        console.log("*** alert prev ***");
        jumpPrev();
        pageX = 0;
      }else if (!pageScroll) {
        pageScroll = true;
        animation();
      } else {
        setTimeout(paint, 0);
      }
    }else{
      if (SceneAnimator.isAtScrollStart()) {
        jumpPrev();
      } else if (SceneAnimator.isScrolling()) {
        jumpPrev();
      } else if (SceneAnimator.isAtScrollBackEnd()){
        jumpPrev();
      } else {
        SceneAnimator.restartBackScroll();
        animation();
      }
    }
    if(e){
      e.preventDefault();
    }
  };

  var show_first_click = function(e){
    if(current_view === VIEW_PAGE && 0 === currentPageIndex ||
      current_view === VIEW_SCENE && 0 === currentSceneIndex){
      prevent_default(e);
      return;
    }
    is_back = false;
    activate_button($("#first_scene"), 500);
    hideFinished();
    jumpTo(0);
    prevent_default(e);
  };

  var menuIsVisible = function(){
    return $("#menu").css("top") === "0px";
  };


  var menu_click = function(e){
    is_back = false;
    showMenu(500, 500);
    e.preventDefault();
  };

  var hideMenu = function(fadeout){
    if(!menuIsVisible()){
      return;
    }
    if(is_back){
      return;
    }
    $("#menu").animate(
      {top: "-132px"},
      fadeout,'swing',
      function(){
        $("#menu_switch").bind('click', menu_click);
      });
  };

  var menu_hide_click = function(e){
    is_back = false;
    hideMenu(500);
    e.preventDefault();
  };

  /**
   * メニューを表示する
   */
  var showMenu = function (lifetime, fadeout){
    if(menuIsVisible() || nomenu){
      return;
    }
    $("#menu_switch").unbind('click', menu_click);
    $("#menu").animate(
        {top: "0"},
        fadeout,'swing',
        function(){
          $("#menu_switch").unbind(act_start, menu_click);
        });

    if(current_view === VIEW_SCENE){
      if(currentSceneIndex === 0){
        disable_button($("#prev_scene"));
        disable_button($("#first_scene"));
      }else{
        enable_button($("#prev_scene"));
        enable_button($("#first_scene"));
      }
    }else{
      if(currentPageIndex === 0){
        disable_button($("#prev_page"));
        disable_button($("#first_scene"));
      }else{
        enable_button($("#prev_page"));
        enable_button($("#first_scene"));
      }
    }
  };

  var hideAll = function(){
    hideMenu(500);
    $("#next").hide();
    $("#vote").hide();
    $("#bookmark").hide();
    $("#dialog_loading").show();
    $("#canvas").css({cursor:"wait"});
  };

  var showFinished = function() {
    var next_story_id = storyMetaFile["next_story_id"];
    showMenu(0);
    $("#next").unbind(act_button);
    $("#vote").unbind(act_button);
    $("#bookmark").unbind(act_button);
    $("#canvas").unbind(act_start,canvas_click);

    disable_button($("#vote"));
    disable_button($("#bookmark"));
    disable_button($("#next"));

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
                apiVoteStory(comicId, storyId, 1, function(){
                  goToNextStory(next_story_id, comicId, "vote");
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
                 apiBookmark(comicId, function(){
                   goToNextStory(next_story_id, comicId, "bookmark");
                 },function(){showError();});
               hideAll();
             },0);
             prevent_default(e);
           });
           enable_button($("#vote"));
           enable_button($("#bookmark"));
         }
      ,500);
    }

    if(!su){
      setTimeout(
          function(){
            $("#next").bind(act_start,
              function(e) {
                activate_button($("#next"), 0);
              });
            $("#next").bind(act_button,
              function(e) {
                console.log("clicked: next");
                setTimeout(function(){
                  goToNextStory(next_story_id, comicId, "none");
                },0);
                hideAll();
                prevent_default(e);
            });
            enable_button($("#next"));
          }
          ,500);
    }

    $("#preview").hide();
    $("#dialog_loading").hide();
    $("#reader").show();
    $("#dialog_error").hide();
    $("#finish").show();
    $("#finish_actions").show();

    trackPageView('backcover');
  };

  /**
   * 次のシーンへ進める
   */
  var jumpNext = function() {
    if(isLoading){
      return;
    }
    is_back = false;
    if(comicTitleInsert && !hasComicTitleShown ||
        storyTitleInsert && !hasStoryTitleShown){
      jumpTo(0);
      return;
    }else if((comicTitleInsert || storyTitleInsert) && !hasAllTitleShown){
      hasAllTitleShown = true;
      jumpTo(0);
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
   * ページモードの際はイージングする（速->遅）
   * @private
   */
  var animation = function() {
    if(current_view === VIEW_PAGE){
      setTimeout(paint, 0);
      if(pageX >= width){
        pageScroll = false;
        prev_image = undefined;
        if(reverse){
          goPrev();
        }else{
          goNext();
        }
        pageX = 0;
        return;
      }
      if(pageX <= 0){
        limitX = width/2.4;
        pageX  = limitX;
      }else{
        if(limitX < 1){
            pageX = pageX + 1;
        }else{
            limitX = (width-pageX)/3.5;
            pageX = pageX + limitX;
        }
      }
      requestAnimationFrame(animation);
    }else{
      if (SceneAnimator.isScrolling()) {
        SceneAnimator.step();
        setTimeout(paint, 0);
      }
      if (SceneAnimator.isScrolling()) {
        requestAnimationFrame(animation);
      }
    }
  };

  /**
   * スクロールをひとつ先に進める
   *
   * @private
   * @return void
   */
  var goNext = function() {
    console.log("goNext");
    SceneAnimator.reverse = false;
    SceneAnimator.dirFwd = true;
    reverse = false;
    if(!hasAllTitleShown){
      jumpNext();
      return;
    }
    if(current_view === VIEW_PAGE){
      if (pageX >= width) {
        console.log("*** alert next ***");
        jumpNext();
      }else if (!pageScroll) {
        pageScroll = true;
        animation();
      } else {
        setTimeout(paint, 0);
      }
    }else{
      if (SceneAnimator.isAtScrollStart()) {
        SceneAnimator.startScroll();
        animation();
      } else if (SceneAnimator.isScrolling()) {
        SceneAnimator.skipScroll();
        setTimeout(paint,0);
      } else if (SceneAnimator.isAtScrollEnd()) {
        jumpNext();
      } else {
        SceneAnimator.restartScroll();
        animation();
      }
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
    $("#dialog_error").hide();
  };

  var canvas_click = function(event) {
      goNext();
      prevent_default(event);
  };

  /**
   * 表示モードを「マンガ閲覧中」に切り替える
   */
  var showReader = function() {
    $("#canvas").css({cursor:"pointer"});
    $("#dialog_loading").hide();
    $("#reader").show();
    $("#finish").hide();
    $("#dialog_error").hide();

    $("#canvas").unbind(act_start,canvas_click);
    $("#canvas").bind(act_start,canvas_click);

    var format = _("Loading images");
    var args = {
      "story_number"   : storyMetaFile.story_number,
      "story_title"    : storyMetaFile.story_title,
      "number_of_story": storyMetaFile.number_of_story
    };
    isLoading = false;
    is_back = false;
  };

  var clearSceneImages = function(){
    if(sceneImages !== undefined){
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
    }
    sceneImages = [];
    sceneImages[MODE_ORIGINAL] = [];
    sceneImages[MODE_READING] = [];
  };

  var clearPageImages = function(){
    if(pageImages !== undefined){
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
    }
    pageImages = [];
    pageImages[MODE_ORIGINAL] = [];
    pageImages[MODE_READING] = [];
  };


  var saveConfig = function(){
    console.log("saved config");
    $.cookie('mang.reader.config.view',current_view,{ expires: 14 });
    $.cookie('mang.reader.config.mode',current_mode,{ expires: 14 });
  };

  var change_mode_original = function(){
    is_back = false;
    if(storyMetaFile['enable_original_mode']){
        current_mode  = MODE_ORIGINAL;
        if(hasAllTitleShown){
          if(current_view === VIEW_PAGE){
            jumpTo(currentPageIndex);
          }else{
            jumpTo(currentSceneIndex);
          }
        }
        $("#toggle_reading").hide();
        $("#toggle_original").show();
        saveConfig();
    }
  };

  var change_mode_reading = function(){
    is_back = false;
    current_mode  = MODE_READING;
    if(hasAllTitleShown){
      if(current_view === VIEW_PAGE){
        jumpTo(currentPageIndex);
      }else{
        jumpTo(currentSceneIndex);
      }
    }

    $("#toggle_original").hide();
    $("#toggle_reading").show();
    saveConfig();
  };

  var change_view_page = function(){
    is_back = false;
    if(storyMetaFile['enable_page_mode']){
      current_view = VIEW_PAGE;
      if(hasAllTitleShown){
        jumpTo(currentPageIndex);
      }
      $("#toggle_scene_view").hide();
      $("#toggle_page_view").show();
      $("#prev_scene").hide();
      $("#prev_page").show();
      saveConfig();
    }
  };

  var change_view_scene = function(){
      is_back = false;
      current_view = VIEW_SCENE;
      if(hasAllTitleShown){
        jumpTo(currentSceneIndex);
      }
      $("#toggle_page_view").hide();
      $("#toggle_scene_view").show();
      $("#prev_page").hide();
      $("#prev_scene").show();
      saveConfig();
  };

  var loadConfig = function(){
    var m = false;
    var v = false;
    if(storyMetaFile['enable_original_mode']){
      v = $.cookie('mang.reader.config.mode');
      if(v && v === MODE_ORIGINAL){
          current_mode  = MODE_ORIGINAL;
      }
    }
    if(storyMetaFile['enable_page_mode']){
      m = $.cookie('mang.reader.config.view');
      if(m && parseInt(m,10) === VIEW_PAGE){
          current_view = VIEW_PAGE;
      }
    }

    if(m && parseInt(m,10) === VIEW_PAGE){
        change_view_page();
    }
    if(v && v === MODE_ORIGINAL){
        change_mode_original();
    }
  };

  var trackPageView = function(action){
    var url = '/comicreading/'+creatorId+'/'+comicId+'/'+storyId+'/'+action;
     try{
        if(typeof(_gaq) !== 'undefined') {
        _gaq.push(['_trackPageview', url]);
        }
        console.log('track:' + url);
     }catch(e){
       //
     }
  };

  /**
   * 指定したマンガの話をリーダーで開く。
   */
  var openStory = function(_storyId) {
    started = true;
    storyId = _storyId;
    clearSceneImages();
    clearPageImages();

    scenes = null;
    currentSceneIndex = 0;
    currentPageIndex = 0;
    storyMetaFile = null;
    showLoading();
    apiStoryMetaFile(storyId, function(json) {
      console.log("apiStoryMetaFile");
      storyMetaFile = json;
      comicId = storyMetaFile["comic_id"];
      creatorId = storyMetaFile["creator_id"];
      scenes = storyMetaFile["scenes"];
      pages = storyMetaFile["pages"];

      cdn_host = storyMetaFile["cdn_host"];
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

      comicTitleInsert = storyMetaFile['comic_title_insert']==='1';
      if(comicTitleInsert)	{
        comicTitleImage = apiComicTitleImage(storyMetaFile['comic_id']);
      }
      storyTitleInsert = storyMetaFile['story_title_insert']==='1';
      if(storyTitleInsert){
        $("#story_title").text(storyMetaFile['story_title']);
        $("#story_number_num").text(storyMetaFile['story_number']);
        $("#story_title_insert").bind(act_start, goNext);
      }
      if(comicTitleInsert || storyTitleInsert){
          hasAllTitleShown = false;
      }
      loadConfig();
      saveConfig();
      trackstart = true;

      $("#prev_scene").bind(act_button, goPrev);
      $("#prev_page").bind(act_button, goPrev);
      $("#first_scene").bind(act_button, show_first_click);
      trackPageView('cover');

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
  };

  var resize = function() {
    setWidthAndHeight();
    SceneAnimator = new $SceneAnimator(width, height, FPS);
    if(started){
      clearSceneImages();
      clearPageImages();
      var cur;
      if(current_view === VIEW_PAGE){
        cur = currentPageIndex;
      }else{
        cur = currentSceneIndex;
      }
      jumpTo(cur);
    }else{
      console.log("start!");
      $("#thumbnail").click();
    }
  };

  var prepareMenu = function(){
    $("#menu").css("top", -1 * 132 + "px");//FIXME menuの高さが合わないのでハードコーディングした。なおしたい。
    $("#menu").show();
    $("#menu_tab").bind('click', menu_hide_click);
    disable_button($("#toggle_reading"));
    disable_button($("#toggle_scene_view"));
   };

  /**
   * プレビュー画面を表示する
   * @returns void
   */
  this.showPreview = function(_storyId) {
    var param = "";
    if(t > 0){
      param = "/"+t;
    }

    $("#thumbnail").attr("src", "/icon/story_image/"+dpi+"/" + _storyId + "/"+t);

    $("#thumbnail").hide();
    $("#thumbnail").bind("load", function(e){
      $("#thumbnail").width(dpi);
      $("#thumbnail").height(dpi * ($("#thumbnail").height()/$("#thumbnail").width()));
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
  $(document).keydown(function(e){
    if(e.keyCode === 32 || //space
       e.keyCode === 13 || //enter
       e.keyCode === 39 || //right
       e.keyCode === 40 ){ //down
      console.log("gonext !!!");
      goNext();
      return false;
    }else if(e.keyCode === 8    ||//BS
             e.keyCode === 37   ||//left
             e.keyCode === 38){   //up
      console.log("goprev !!!");
      goPrev();
      return false;
    }
  });
  this.openStory = openStory;
  this.goNext = goNext;
  this.resize = resize;
  prepareMenu();
}
