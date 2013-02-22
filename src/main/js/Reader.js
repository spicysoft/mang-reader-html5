/*global $, JQuery, _, _gaq,_gat,_ad_text, window, strings, App, $SceneAnimator */

/**
 * マンガを読み込み中のUI処理を行う MVCのコンポーネントに相当する処理を行う。
 */
function $Reader(params, _fps) {
  var member = params.member;
  var su = params.superuser;
  var nomenu = params.nomenu;
  var premium = params.premium;
  var should_show_ad = params.ad;

  var FPS = _fps;
  var API_ROOT = '/api';
  var width = 0;
  var height = 0;
  var canvas;

  var MODE_ORIGINAL = 'original';
  var MODE_READING  = 'reading';
  var current_mode  = MODE_READING;

  var VIEW_SCENE   = 0;//コマアニメモード
  var VIEW_PAGE_FP = 1;//フルページモード
  var VIEW_PAGE_FL = 2;//フルページモード(横)
  var VIEW_PAGE_W  = 3;//ワイドページモード
  var VIEW_SCENE_R = 4;//コマロールモード

  var current_view = VIEW_SCENE;
  //var current_view = VIEW_SCENE_R;
  //var current_view = VIEW_PAGE_W;

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
  var t = params.time;
  var dpi = 240;
  var cdn_host;
  var image_host = "";

  var error = 0;
  var started = false;
  var prev_image;

  var pageX = 0;
  var pageY = 0;
  var reverse = false;
  var pageScroll = false;
  var limitX = 0;
  var is_back = false;
  var trackstart = false;

  //0..右開き
  var spread = 0;
  var flick = 0;
  //var orientation = 'vertical';
  var orientation = 'horizontal';

  var ad_src = false;

  //Andoridでmenu_switchをクリックした際に、下のcanvasも同時にクリックされる不具合があるため
  //menuが表示されるまでの間、canvasのクリックをロックする
  var menu_click_lock = false;

  console.log("v6.0.12");

  var replaceCanvasForRollMode = function(){
     if(isRollMode() || App.IE){
         $("#canvas").replaceWith('<div id="canvas" style="background: #000;"></div>');
     }else{
         $("#canvas").replaceWith('<canvas id="canvas"></canvas>');
     }

  }

  if(!t){
    t = parseInt((new Date())/1000, 10);
  }

  var get_params = App.getUrlVars();
  if(su){
    su_key = get_params["k"];
    su_expire = get_params["expire"];
  }

  if(nomenu){
    $("#menu_switch").hide();
  }

  var act_start = App.isSmartPhone?"touchstart":"mousedown";
  var act_end = App.isSmartPhone?"touchend":"mouseup";
  var act_move = App.isSmartPhone?"touchmove":"mousemove";
  var act_button = App.isSmartPhone?"touchend":"mouseup";

  var isPageMode = function(){
	  return current_view === VIEW_PAGE_FP || current_view === VIEW_PAGE_FL || current_view === VIEW_PAGE_W;
  };

  var isRollMode = function(){
	  return current_view === VIEW_SCENE_R || current_view === VIEW_PAGE_W;
  };

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
     }else {
      var reader = $("#mangh5r");
      width = reader.width();
      height = reader.height();
      canvas = $("#canvas")[0];
      canvas.width = width;
      canvas.style.width = width + "px";
      canvas.height = height;
      canvas.style.height = height + "px";
      canvas.fillStyle = canvas.style.background;
    }
    if (App.IE && (App.IE_VER < 8 || document.documentMode < 8)) {
      dpi = resolveDpi(height);
    }else{
      dpi = resolveDpi(canvas.height);
    }
    console.log(width + "x" + height + " dpi:" + dpi);
  };

  setWidthAndHeight();
  var SceneAnimator = new $SceneAnimator(width, height, FPS);

  var updateIndex = function(nindex){
    if(isPageMode()){
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

  var getCanvas = function(){
    if(App.IE || isRollMode()){
      return  $("#canvas");
    }
    var context = canvas.getContext("2d");
    context.fillRect(0, 0, width, height);
    return context;
  };

  //refactor me
  var paintPageImageSpread = function(i0, i1, i2, i3){
    var d=0;
    var nd = 0;
    if(reverse){
      d = -1 * pageX;
      nd = width;
    }else{
      d = pageX;
      nd = -1 * width;
    }
    console.log("d:" + d);
    var dx0=0,dx1=0,dx2=0,dx3=0;
    var dy0=0,dy1=0,dy2=0,dy3=0;
    if(i0){
      dy0=(height-i0.height)/2;
      dx0=((width/2-i0.width)+d);
    }
    if(i1){
      dy1=(height-i1.height)/2;
      dx1=width/2+d;
    }
    if(i2){
      dy2= (height-i2.height)/2;
      dx2= (width/2-i2.width)+d+nd;
    }
    if(i3){
      dy3= (height-i3.height)/2;
      dx3= (width/2+d)+nd;
    }

    var c = getCanvas();
    if (App.IE) {
      var mask = "<div style='position:absolute; width:100%;height:100%;'></div>";
      if(i0){
        i0.style.cssText = "position: absolute; top: " + dy0 + "px; left:" + dx0 + "px;";
        c.empty().append(i0);
      }
      if(i1){
        i1.style.cssText = "position: absolute; top: " + dy1 + "px; left:" + dx1 + "px;";
        c.append(i1);
      }
      if(i2){
        i1.style.cssText = "position: absolute; top: " + dy2 + "px; left:" + dx2 + "px;";
        c.append(i2);
      }
      if(i3){
        i1.style.cssText = "position: absolute; top: " + dy3+ "px; left:" + dx3 + "px;";
        c.append(i3);
      }
      c.append(mask);
      c = null;
    } else {
      //Android2.1以下のCanvas drawImageバグ対応
      //  画像が勝手にscreen.width/320でスケールされるので、描画前にこの比率に合わせてcanvasをスケールしておく
      //@see http://d.hatena.ne.jp/koba04/20110605/1307205438
      if(App.ANDROID21){
        var rate =  Math.sqrt(320/screen.width);
        c.scale(rate, rate);
      }
      if(i0){
        c.drawImage(i0, dx0, dy0);
      }
      if(i1){
        c.drawImage(i1, dx1, dy1);
      }
      if(i2){
        c.drawImage(i2, dx2, dy2);
      }
      if(i3){
        c.drawImage(i3, dx3, dy3);
      }
    }
  };

  //フルページモード
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

    var c = getCanvas();
    if (App.IE) {
      var mask = "<div style='position:absolute; width:100%;height:100%;'></div>";
      i0.style.cssText = "position: absolute; top: " + dy0 + "px; left:" + dx0 + "px;";
      c.empty().append(i0);
      if(i1){
        i1.style.cssText = "position: absolute; top: " + dy1 + "px; left:" + dx1 + "px;";
        c.append(i1);
      }
      c.append(mask);
      c = null;
    } else {
      //Android2.1以下のCanvas drawImageバグ対応
      //  画像が勝手にscreen.width/320でスケールされるので、描画前にこの比率に合わせてcanvasをスケールしておく
      //@see http://d.hatena.ne.jp/koba04/20110605/1307205438
      if(App.ANDROID21){
        var rate =  Math.sqrt(320/screen.width);
        c.scale(rate, rate);
      }

      c.drawImage(i0, dx0, dy0);
      if(i1){
        c.drawImage(i1, dx1, dy1);
      }
    }
  };

  var paintImage = function(i){
      var x;
      var y;
      if(isPageMode()){
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

      var c = getCanvas();
      if (App.IE) {
        if(App.IE_VER==8 || document.documentMode==8){
          c.css({zoom:i.scale});
          i.style.cssText = "position: absolute; top: " + dy + "px; left:" + dx + "px;";
        }else{
          i.style.cssText = "position: absolute; top: " + dy + "px; left:" + dx + "px; zoom:"+i.scale+";";
        }
        var mask = "<div style='position:absolute; width:100%;height:100%;'></div>";
        c.empty().append(i).append(mask);
        c = null;
      } else {
        //Android2.1以下のCanvas drawImageバグ対応
        //  画像が勝手にscreen.width/320でスケールされるので、描画前にこの比率に合わせてcanvasをスケールしておく
        //@see http://d.hatena.ne.jp/koba04/20110605/1307205438
        if(App.ANDROID21){
          var rate =  Math.sqrt(320/screen.width);
          c.scale(rate, rate);
        }
        c.drawImage(i, dx, dy, i.scaledWidth(), i.scaledHeight());
      }
    };

  var paintRollImages = function(){
    var objects = [];
    var key = null;
    if(isPageMode()){
      objects = pages;
      key = "page_id";
    }else{
      objects = scenes;
      key = "scene_id";
    }
    var param = "";
    if(t > 0){
      param = "/"+t;
    }
    var c = getCanvas();
    c.empty();
    for(var i=0; i<objects.length; i++){
      var url = urlSceneImage(image_host, objects[i][key], current_mode, dpi, param);
      console.log(url);
      c.append("<p><img src='"+url+"' width='"+dpi+"px'/></p>");
    }
  };

  /**
   * 画面描画
   * @return void
   */
  var paint = function() {
     if(isRollMode()){
       paintRollImages();
       return;
     }
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
      if(isPageMode()){
        i = pageImages[current_mode][currentPageIndex];
      }else{
        i = sceneImages[current_mode][currentSceneIndex];
      }
    }
    if (i === undefined || !i.hasLoaded()) {
      return;
    }
    if(current_view === VIEW_PAGE_FL){
      if(pageScroll){
          if(reverse){
              if(currentPageIndex==0){
                  paintPageImageSpread(pageImages[current_mode][currentPageIndex],  null, pageImages[current_mode][currentPageIndex-1],  pageImages[current_mode][currentPageIndex-2]);
              }else{
                  paintPageImageSpread(pageImages[current_mode][currentPageIndex+1],  pageImages[current_mode][currentPageIndex], pageImages[current_mode][currentPageIndex-1],  pageImages[current_mode][currentPageIndex-2]);
              }
          }else{
	          if(currentPageIndex==0){
	              paintPageImageSpread(pageImages[current_mode][currentPageIndex],  null, pageImages[current_mode][currentPageIndex+2],  pageImages[current_mode][currentPageIndex+1]);
	          }else{
	              paintPageImageSpread(pageImages[current_mode][currentPageIndex+1],  pageImages[current_mode][currentPageIndex], pageImages[current_mode][currentPageIndex+3],  pageImages[current_mode][currentPageIndex+2]);
	          }
          }
      }else{
        if(currentPageIndex==0){
          paintPageImageSpread(pageImages[current_mode][currentPageIndex], null, null, null);
        }else{
          paintPageImageSpread(pageImages[current_mode][currentPageIndex+1],  pageImages[current_mode][currentPageIndex], null, null);
        }
      }
    }else if(current_view === VIEW_PAGE_FP){
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
	$("#ad_cover").hide();

    $("#errmsg_fan_only").hide();
    $("#errmsg_fan_only_guest").hide();
    $("#errmsg_friend_only").hide();
    $("#errmsg_friend_only_guest").hide();
    $("#errmsg_under18").hide();
    $("#errmsg_under18_guest").hide();
    $("#errmsg_servererr").hide();
    $("#errmsg_expired").hide();
    $("#errmsg_forbidden").hide();

	(parent["Controll"]["hideAd"])();

    if(msg){
      $("#errmsg_default").hide();
      $(msg).show();
    }else{
      $("#errmsg_default").show();
    }
    $("#error").show();
	console.log("errorMSG:",msg);
    if(msg == "#errmsg_under18_guest" || msg  == "#errmsg_fan_only_guest" || msg  == "#errmsg_friend_only_guest") {
      set_error_img_src(msg);
      $("#dialog_error").hide();
      $("#menu").hide();
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

  var apiError = function(req, status, error) {
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
    App.ajaxGet(API_ROOT + '/storyMetaFile/' + storyId+param, 'json', fnSuccess, fnError, cache);
  };

  /**
   * [サーバーAPI]
   * イイネ投票する
   */
  var apiVoteStory = function(comicId, storyId, value, fnSuccess, fnError){
    App.ajaxPost('/api/voteStory/'+comicId + '/' + storyId + '/' + value ,
     'json', fnSuccess, fnError);
  };

  /**
   * [サーバーAPI]
   * ブックマークする
   */
  var apiBookmark = function(comicId, fnSuccess, fnError){
    App.ajaxPost('/api/bookmark/'+comicId, 'json', fnSuccess, fnError);
  };

  var apiRead = function(storyId, fnSuccess, fnError){
	App.ajaxPost('/api/read/'+storyId, 'json', fnSuccess, fnError);
  };

  var updateProgress = function(){
    if(isPageMode()){
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
      if(isPageMode()&&!isRollMode()){
        if(this.width < this.height){
          var w = this.width * (height/dpi) * this.scale;
          if(w < width){
            return w;
          }
        }
      }
      return this.width * this.scale;
    };
    i.scaledHeight = function(){
      if(isPageMode()&&!isRollMode()){
        if(this.width < this.height){
          var w = this.width * (height/dpi) * this.scale;
          if(w < width){
            return this.height * (height/dpi) * this.scale;
          }
        }
      }
      return this.height * this.scale;
    };
    var param = "";
    if(t > 0){
      param = "/"+t;
    }
    if(isRefetch){
      param += "?r="+error;
    }
    i.src = urlmaker(image_host, id, mode,  dpi,  param);
    return i;
  };

  var urlSceneImage = function(host, sceneId, mode, dpi, param){
    return host+API_ROOT + '/sceneImage/' + sceneId + '/' + mode + '/' + dpi + param;
  };

  var urlPageImage = function(host, pageId, mode, dpi, param){
    return host+API_ROOT + '/pageImage/' + pageId + '/' + mode + '/' + dpi + param;
  };

  /**
   * [サーバーAPIとの通信メソッド] サーバーからシーン画像を取得する
   *
   * @private
   * @return Image ただし非同期なので読み込み完了していることは保証されない
   */
  var apiSceneImage = function(sceneId, mode, dpi, refetch) {
    return apiImage(sceneId, mode, dpi, refetch,
    	urlSceneImage,
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
    	  urlPageImage,
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
    var under = pageIndex - 3;
    var max;
    if(current_mode  === MODE_READING){
      max = 8;
    }else{
      max = 4;
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
    console.log("jumpTo:" + newIndex + " view:" + current_view);
    hideMenu(500);
    hideFinished();
    if(isPageMode()){
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

    if(isRollMode()){
    	paintRollImages();
    	return;
    }
    var i;
    if(isPageMode()){
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
      if(current_mode===MODE_READING){
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
      if(current_view === VIEW_SCENE){
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
    if(current_view === VIEW_PAGE_FL){
        if(currentPageIndex===1){
        	prev = 0;
        }else{
            prev = currentPageIndex - 2;
        }
    }else if(current_view === VIEW_PAGE_FP){
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
    $("#canvas").bind(act_move,canvas_move);
    $("#canvas").bind(act_end,canvas_up);
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
    console.log("go prev start");
    SceneAnimator.reverse = true;
    SceneAnimator.dirFwd = false;
    reverse = true;

    if((isPageMode()) && 0 === currentPageIndex ||
      current_view === VIEW_SCENE && 0 === currentSceneIndex){
      console.log("ignore goPrev");
      App.preventDefault(e);
      return;
    }
    if(isPageMode()){
      activate_button($("#prev_page"), 500);
    }else{
      activate_button($("#prev_scene"), 500);
    }
    hideFinished();

    if(current_view === VIEW_PAGE_FP){
      console.log("go prev pagemode");
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
    }else if(current_view === VIEW_PAGE_FL){
        console.log("go prev w pagemode");
        if (pageX >= width/2) {
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
      App.preventDefault(e);
    }
    console.log("go prev done");
  };

  var show_first_click = function(e){
    if(isPageMode() && 0 === currentPageIndex ||
      current_view === VIEW_SCENE && 0 === currentSceneIndex){
        App.preventDefault(e);
      return;
    }
    is_back = false;
    activate_button($("#first_scene"), 500);
    hideFinished();
    jumpTo(0);
    App.preventDefault(e);
  };

  var menuIsVisible = function(){
    return $("#menu").css("top") === "0px";
  };


  var menu_click = function(e){
    menu_click_lock = true;
    is_back = false;
    showMenu(500, 500);
    App.preventDefault(e);
  };

  var hideMenu = function(fadeout){
    menu_click_lock = false;
    if(!menuIsVisible()){
      return;
    }
    if(is_back){
      return;
    }
    $("#menu").animate(
      {top: "-208px"},
      fadeout,'swing',
      function(){
        $("#menu_switch").bind('click', menu_click);
      });
  };

  var menu_hide_click = function(e){
    is_back = false;
    hideMenu(500);
    App.preventDefault(e);
  };

  /**
   * メニューを表示する
   */
  var showMenu = function (lifetime, fadeout){
    if(menuIsVisible() || nomenu){
      console.log("menu is disbaled");
      menu_click_lock = false;
      return;
    }
    $("#menu_switch").unbind('click', menu_click);
    $("#menu").animate(
        {top: "0"},
        fadeout,'swing',
        function(){
          $("#menu_switch").unbind(act_start, menu_click);
          menu_click_lock = false;
        });

    if(current_view != isPageMode()){
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
                },apiError);
                hideAll();
              },0);
              App.preventDefault(e);
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
                 },apiError);
               hideAll();
             },0);
             App.preventDefault(e);
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
                App.preventDefault(e);
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
    console.log("jump next");
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
    if(current_view === VIEW_PAGE_FL){
      if(currentPageIndex==0){
    	  next = 1;
      }else if(currentPageIndex==pages.length-2){
    	  next = currentPageIndex + 1;
      }else{
          next = currentPageIndex + 2;
      }
    }else if(current_view === VIEW_PAGE_FP){
      next = currentPageIndex + 1;
    }else{
      next = currentSceneIndex + 1;
    }
    if (isPageMode() && next >= pages.length ||
        current_view === VIEW_SCENE && next >= scenes.length) {
      if (should_show_ad &&
    		  (isPageMode() && 1 < pages.length || current_view === VIEW_SCENE && 1 < scenes.length) ) {
        (parent["Controll"]["showAd"])(storyId, "afterReadingInReader", showFinished);
	  } else {
	  	showFinished();
	  }
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
    console.log("animation scroll:" + pageScroll);
    if(current_view === VIEW_PAGE_FP){
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
    }else if(current_view === VIEW_PAGE_FL){
        setTimeout(paint, 0);
        var i;
        if(reverse){
            if(currentPageIndex==0){
                i = pageImages[current_mode][currentPageIndex];
            }else{
                i = pageImages[current_mode][currentPageIndex-1];
            }
        }else{
            if(currentPageIndex==0){
                i = pageImages[current_mode][currentPageIndex];
            }else{
                i = pageImages[current_mode][currentPageIndex+1];
            }
        }

        var padding = 0;
        if(i){
          padding = width/2-i.width;
        }

        var limit = width;

        if(!i || pageX >= limit){
          pageScroll = false;
          prev_image = undefined;
          if(reverse){
            jumpPrev();
          }else{
            jumpNext();
          }
          pageX = 0;
          return;
        }
        console.log("limit:" + limit + " pagex:" + pageX + " w:" + width + " pad:"+padding + " i:"+i.width);
        if(pageX <= 0){
          limitX = limit/2.4;
          pageX  = limitX;
        }else{
          if(limitX < 1){
            pageX = pageX + 1;
          }else{
            limitX = (limit-pageX)/3.5;
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
    SceneAnimator.reverse = false;
    SceneAnimator.dirFwd = true;
    reverse = false;
    if(!hasAllTitleShown){
      jumpNext();
      return;
    }
    if(current_view === VIEW_PAGE_FP){
      if (pageX >= width) {
        console.log("*** alert next ***");
        jumpNext();
      }else if (!pageScroll) {
        pageScroll = true;
        animation();
      } else {
        setTimeout(paint, 0);
      }
    }else if(current_view === VIEW_PAGE_FL){
      if (pageX >= width/2) {
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

  var touch_start_x = 0;
  var touch_start_y = 0;
  var touch_pageX = 0;
  var touch_pageY = 0;

  var point_x = function(e){
    if(e.clientX){
      return e.clientX;
    }else if(event && event.changedTouches){
      return event.changedTouches[0].pageX;
    }
    return e.pageX;
  };

  var point_y = function(e){
    if(e.clientY){
      return e.clientY;
    }else if(event && event.changedTouches){
      return event.changedTouches[0].pageY;
    }
    return e.pageY;
  };

  var canvas_click = function(e) {
    console.log("canvas_click");
    touch_start_x = point_x(e);
    touch_start_y = point_y(e);
    App.preventDefault(e);
  };

  var canvas_move = function(e) {
    touch_pageX=point_x(e);
    touch_pageY=point_y(e);
    if(touch_start_x!=0 && !isRollMode()){
      var dx = touch_pageX - touch_start_x;
      $("#canvas").css("left", dx/2);
    }else if(touch_start_y!=0 && isRollMode()){
      var dy = touch_pageY - touch_start_y;
      if(dy > 100 || dy < -100){
        $("#canvas").css("top", dy + parseInt($("#canvas").css("top")));
      }
      console.log(dy);
    }
    App.preventDefault(e);
  };

  var canvas_up = function(e) {
    console.log("canvas_up");
    if(touch_start_x!=0 && !isRollMode()){
      var dx = touch_pageX - touch_start_x;
      if(dx > 100){
        pagex = Math.abs(touch_pageX)*-1;
        goNext();
      }else if(dx < -100){
        pagex = Math.abs(touch_pageX);
        goPrev();
      }else{
        menu_click(e);
      }
      console.log(dx);
    }else if(touch_start_y!=0 && isRollMode()){
      var dy = touch_pageY - touch_start_y;
      if(dy > 100 || dy < -100){
    	  //
      }else{
        menu_click(e);
      }
      console.log(dy);
    }else{
      goNext();
    }
    touch_start_x=0;
    touch_start_y=0;
    touch_pageX=0;
    touch_pageY=0;
    $("#canvas").css("left", 0);
    App.preventDefault(e);
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
          if(isPageMode()){
            jumpTo(currentPageIndex);
          }else{
            jumpTo(currentSceneIndex);
          }
        }
        $("#toggle_reading").hide();
        $("#toggle_original").show();
        saveConfig();
    }
    $("#menu_setting").fadeOut(300);
  };

  var change_mode_reading = function(){
    is_back = false;
    current_mode  = MODE_READING;
    if(hasAllTitleShown){
      if(isPageMode()){
        jumpTo(currentPageIndex);
      }else{
        jumpTo(currentSceneIndex);
      }
    }
    saveConfig();
    $("#menu_setting").fadeOut(300);
  };

  var change_view_page = function(){
    console.log("change_view_page");
    is_back = false;
    if(storyMetaFile['enable_page_mode']){
      //fixme
      if(width > height){
        current_view = VIEW_PAGE_FL;
      }else{
        current_view = VIEW_PAGE_FP;
      }
      replaceCanvasForRollMode();
      if(hasAllTitleShown){
        jumpTo(currentPageIndex);
      }
      $("#prev_scene").hide();
      $("#prev_page").show();
      saveConfig();
    }
    $("#menu_mode").fadeOut(300);
  };

  var change_view_page_wide = function(){
    console.log("change_view_page_wide");
    is_back = false;
    if(storyMetaFile['enable_page_mode']){
      current_view = VIEW_PAGE_W;
      replaceCanvasForRollMode();
      if(hasAllTitleShown){
        jumpTo(currentPageIndex);
      }
      $("#prev_scene").hide();
      $("#prev_page").show();
      saveConfig();
    }
    $("#menu_mode").fadeOut(300);
  };

  var change_view_scene = function(){
      console.log("change_view_scene");
      is_back = false;
      current_view = VIEW_SCENE;
      replaceCanvasForRollMode();
      if(hasAllTitleShown){
        jumpTo(currentSceneIndex);
      }
      $("#prev_page").hide();
      $("#prev_scene").show();
      saveConfig();
      $("#menu_mode").fadeOut(300);
  };

  var change_view_scene_roll = function(){
      console.log("change_view_scene_roll");
      is_back = false;
      current_view = VIEW_SCENE_R;
      replaceCanvasForRollMode();
      if(hasAllTitleShown){
        jumpTo(currentSceneIndex);
      }
      $("#prev_page").hide();
      $("#prev_scene").show();
      saveConfig();
      $("#menu_mode").fadeOut(300);
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
      if(m && parseInt(m,10) === VIEW_PAGE_FP){
          current_view = VIEW_PAGE_FP;
      }
    }

    if(m && parseInt(m,10) === VIEW_PAGE_FP){
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
		  if(premium){
		  	_gaq.push(['_setCustomVar', 1, 'IsMember', 'YES', 1]);
			_gaq.push(['_setCustomVar', 3, 'MemberType', 'Premium', 1]);
		  } else if(member) {
            _gaq.push(['_setCustomVar', 1, 'IsMember', 'YES', 1]);
			_gaq.push(['_setCustomVar', 3, 'MemberType', 'Free', 1]);
          } else {
            _gaq.push(['_setCustomVar', 1, 'IsMember', 'NO', 1]);
			_gaq.push(['_setCustomVar', 3, 'MemberType', 'Guest', 1]);
          }
          if(App.isApp){
            _gaq.push(['_setCustomVar', 2, 'Platform', 'Appli', 1]);
          } else {
            _gaq.push(['_setCustomVar', 2, 'Platform', 'Browser', 1]);
          }
          _gaq.push(['_trackPageview', url]);
          console.log('track:' + url);
       }
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
	if(should_show_ad){
		console.log(parent["Controll"]);
        (parent["Controll"]["showAd"])(storyId, "beforeReadingInReader", showFinished);
	}
    showLoading();

    apiStoryMetaFile(storyId, function(json) {
      console.log("apiStoryMetaFile");
      storyMetaFile = json;
      comicId = storyMetaFile["comic_id"];
      creatorId = storyMetaFile["creator_id"];
      scenes = storyMetaFile["scenes"];
      pages = storyMetaFile["pages"];
      var comic_title = storyMetaFile["comic_title"];
      var story_title = storyMetaFile["story_title"];
      var story_number = storyMetaFile["story_number"];
      $("#comic_title_menu").text(comic_title);
      $("#story_title_menu").text(story_title);
      $("#current_story").text(story_number);
      $("#total_story").text(storyMetaFile["story_count"]);

      cdn_host = storyMetaFile["cdn_host"];
      if(t > 0){
    	  image_host = cdn_host;
      }
      updateProgress();

      if(storyMetaFile['enable_original_mode'] && premium){
        enable_button($(".change_setting"));
        $("#set_reading").bind(act_button, change_mode_original);
        $("#set_original").bind(act_button, change_mode_reading);
      }
      if(storyMetaFile['enable_page_mode']){
        enable_button($(".change_mode"));
        $("#mode_anime_coma").bind(act_button, change_view_scene);
        $("#mode_full_page").bind(act_button, change_view_page);
        $("#mode_roll_coma").bind(act_button, change_view_scene_roll);
        $("#mode_wide_page").bind(act_button, change_view_page_wide);
      }

      comicTitleInsert = storyMetaFile['comic_title_insert']==='1';
      if(comicTitleInsert)	{
        comicTitleImage = apiComicTitleImage(storyMetaFile['comic_id']);
      }
      storyTitleInsert = storyMetaFile['story_title_insert']==='1';
      if(storyTitleInsert){
        $("#story_title").text(story_title);
        $("#story_number_num").text(story_number);
        $("#story_title_insert").bind(act_start, goNext);
      }
      if(comicTitleInsert || storyTitleInsert){
          hasAllTitleShown = false;
      }
      loadConfig();
      saveConfig();

      console.log("view: " + current_view);
      trackstart = true;

      if(isRollMode()){
    	  replaceCanvasForRollMode();
      }

      $(".change_setting").click(function(){
        $("#menu_setting").fadeIn(300);
      });

      $(".change_mode").click(function(){
        $("#menu_mode").fadeIn(300);
      });

      $("#prev_scene").bind(act_button, goPrev);
      $("#prev_page").bind(act_button, goPrev);
      $("#first_scene").bind(act_button, show_first_click);
      $("#close").bind(act_button, function(){
    	  (parent["closeReader"])();
      });
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
    }, apiError);

  };

  var showAd = function(adSpaceId) {
	//var event = "_trackEvent";
	var category="/ad/";
	var adNetworkId="adNetworkID";

	var ad_cover=$("#ad_cover");
	ad_cover.show();
	var close_button = $("#close_ad");
	close_button.addClass("disable");

	var ad_area=$("#ad_area");
	if(Math.random()>0.5){
		ad_area.toggleClass("top_button");
		close_button.toggleClass("top_button");
	}
	var ad = ad_area.children(".area");
	ad.css("pointer-events","none");
	setTimeout(function(){
		ad.css("pointer-events","auto");
	},1000);
	if(!ad.children().length){
		ad.append(App.adText());
		/*$(".go_premium").bind("click",function(){
			tryPushAnalytics([event, category+adSpaceId, 'premium', adNetworkId]);
		})*/
	}
	ad_area.css({
		marginTop:"-"+(ad_area.height()/2+13)+"px",
		marginLeft:"-"+(ad_area.width()/2+13)+"px"
	});

	var virtualUrl = category+adSpaceId+"/"+adNetworkId+"/"+storyId;
	tryPushAnalytics(['_trackPageview', virtualUrl]);

	ad_area.find('iframe:first').load(function(){
		ad_src = document.getElementById('reader_ad').contentWindow.location.href;
	});

	var frame_timer = setInterval(function(){
		var href = document.getElementById('reader_ad').contentWindow.location.href;
		if(ad_src && ad_src != href){
			ad_cover.hide();
			clearInterval(frame_timer);
			//tryPushAnalytics([event, category+adSpaceId, 'do', adNetworkId]);
		    (parent["goNextUrl"])(href);
		}
	},100);

	setTimeout(function(){
		close_button.removeClass("disable").one(act_button,function(){
			if(isPageMode() && currentPageIndex + 1 >= pages.length ||
					!isPageMode() && currentSceneIndex + 1 >= scenes.length) {
			      showFinished();
			}
			ad_cover.hide();
			clearInterval(frame_timer);
		});
	},3000);
  };
  var tryPushAnalytics = function(data){
  	try{
		if(typeof(_gaq) !== 'undefined') _gaq.push(data);
	} catch(e){
		console.log(e+":"+data)
	}
  }

  var resize = function() {
    setWidthAndHeight();
    SceneAnimator = new $SceneAnimator(width, height, FPS);
    if(started){
      clearSceneImages();
      clearPageImages();
      var cur;
      if(isPageMode()){
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
    $("#menu").css("top", -1 * 208 + "px");
    $("#menu").show();
    $("#menu_tab_close").bind('click', menu_hide_click);
    disable_button($(".change_setting"));
    disable_button($(".change_mode"));
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
      App.preventDefault(event);
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
