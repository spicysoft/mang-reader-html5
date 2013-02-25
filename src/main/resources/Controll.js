/**
 * 親Frameからリーダの状態を取得/操作する
 *
 * リーダーはClosure Compilerで難読化されているため、要素のイベントをトリガーして操作する
 */
function $Controll() {
  //・Enter、Space,、下、右 ... 進む
  //・上、左、BS            ... 戻る
  //・Esc                   ... 全画面解除

  $(document).ready(function(){
    //親フレーム用のキー入力受付
    //小フレーム用はReader.js内にあります
    $(document).keydown(function(e){
      var tag = $(':focus').get(0);
      if(tag && (/textarea/i.test(tag.tagName) || /input/i.test(tag.tagName))){
        return;
      }
      if(e.keyCode == 32      //space
        || e.keyCode == 13  //enter
        || e.keyCode == 39  //right
        || e.keyCode == 40 //down
        ){
        Controll.next();
        return false;
      }else if(e.keyCode == 8//BS
          || e.keyCode == 37//left
          || e.keyCode == 38//up
        ){
        Controll.prev();
        return false;
      }
    });
  });

  $('iframe:first').load(function(e){
      document.getElementById('reader_reader').contentWindow._gaq =  _gaq;
  });

  var elem = function(hash){
    var $ = document.getElementById('reader_reader').contentWindow.$;
    if($){
        return $(hash);
    }
    return null;
  }

  this.next = function(){
    if(elem("#preview").css("display") == 'none'){
      elem("#canvas").trigger('mousedown');
    }else{
      elem("#preview_ui").click();
    }
  };

  var started = function(){
    return elem("#prev_scene").css("display") != 'none';
  }
  this.started = started;

  this.hideMenu = function(){
    elem("#menu_tab").trigger('click');
  };

  this.showMenu = function(){
    elem("#menu_switch").trigger('click');
  };

  this.prev = function(){
    if(Controll.view() === 'page'){
      elem("#prev_page").trigger('mouseup');
    }else{
      elem("#prev_scene").trigger('mouseup');
    }
  }

  this.first = function(){
     elem("#first_scene").trigger('mouseup');
  }

  this.start = function(){
    elem("#start").click();
  }

  this.total = function(){
    return elem("#progress_total").text();
  }

  this.current = function(){
    return elem("#progress_current").text();
  }

  this.change_mode = function(){
  	if(!isVisible("#menu_mode")){
      elem(".change_mode").trigger('click');
	  if(isVisible("#menu_setting"))elem("#menu_setting").hide();
    } else {
      elem("#menu_mode").hide();
    }

  }

  this.change_setting = function(){
	if(!isVisible("#menu_setting")){
      elem(".change_setting").trigger('click');
	  if(isVisible("#menu_mode")) elem("#menu_mode").hide();
    } else {
      elem("#menu_setting").hide();
    }
  }

  this.mode = function(){
    if(elem(".change_setting").attr('id') == 'change_reading'){
      return 'reading';
    } else {
      return 'original';
    }
  }

  this.view = function(){
    if(elem(".change_mode").attr('id') == 'change_coma_anime'){
      return  'scene';
    } else {
      return  'page';
    }
  }

  this.menuIsVisible = function(){
    return elem("#menu").offset().top == 0;
  }

  this.supportOriginalMode = function(){
    return !elem("#toggle_reading").hasClass("disable");
  }

  this.supportPageView = function(){
    return !elem("#toggle_scene_view").hasClass("disable");
  }

  this.ready = function(){
    return elem("#reader") != null;
  }

  this.onStarted = function(callback){
      $('iframe:first').load(function(e){
        var stat = Controll.menuIsVisible();
        var timer = setInterval(function(){
          if(elem("#preview").css("display") == 'none'){
            callback();
            clearInterval(timer);
          }
        }, 100);
      });
   }

  this.enableGA = function(){
    document.getElementById('reader_reader').contentWindow._gaq =  _gaq;
  };

  var isVisible = function(hash){
 	 return elem(hash).css("display") != 'none';
  };

  this.is_show_ad =false;
  this.hideAd = function(){
  	$("#ad_cover").hide();
	this.is_show_ad=false;
  }
  this.showAd = function(storyId, adSpaceId, callbackSkipAd) {
  	if(this.is_show_ad)return;
	this.is_show_ad=true;
  	var event = "_trackEvent";
	var category="/ad/";
	var adNetworkId="default";

	var ad_cover=$("#ad_cover");
	if(window.showInterstitial != undefined){
		console.log(this);
		showInterstitial();
		if(adSpaceId=="afterReadingInReader")callbackSkipAd();
	}else{
		ad_cover.show();
	}

	if(Math.random()>0.5){
		$("#top_button").show();
		$("#bottom_button").hide();
	} else {
		$("#top_button").hide();
		$("#bottom_button").show();
	}
	var ad_area=$("#ad_area");
	var ad_animate_time=2000;
	var ad = ad_area.children(".area");
	ad.css("pointer-events","none");
	var clickCover = $("#click_controll");
	clickCover.show();
	setTimeout(function(){
		ad.css("pointer-events","auto");
		clickCover.hide();
		},ad_animate_time);

	$(".go_premium").unbind("click").one("click",function(){
		tryPushAnalytics([event, category+adSpaceId, 'premium', adNetworkId]);
	});
	var topPos = (ad_area.height()+13)/2;
	ad_area.css({
		marginTop:"-"+(topPos-80)+"px",
		marginLeft:"-"+(ad_area.width()+26)/2+"px",
		opacity:0
	});

	ad_area.animate({
		marginTop:"-"+topPos+"px",
		opacity:1
	},ad_animate_time);

	var virtualUrl = category+adSpaceId+"/"+adNetworkId+"/"+storyId;
	tryPushAnalytics(['_trackPageview', virtualUrl]);

	var close_button = $(".ad_button_area a");
	close_button.addClass("disable");
	var self=this;
	setTimeout(function(){
		close_button.unbind("click");
		close_button.removeClass("disable").bind('click',function(){
			console.log("ad close button : click : " + Controll.current()  +"-"+ Controll.total());
			tryPushAnalytics([event, category+adSpaceId, 'skip', adNetworkId]);
			ad_cover.hide();
			self.is_show_ad=false;
			console.log("ad close button : click done");
			if("1"!=Controll.current() && Controll.current() == Controll.total()) {
				callbackSkipAd();
			}
		});
		},ad_animate_time+((adSpaceId=="afterReadingInReader")?0:1000));
	};
};

var Controll = new $Controll();

var tryPushAnalytics = function(data){
    try{
		console.log("G/A:"+data)
      if(typeof(_gaq) !== 'undefined') _gaq.push(data);
    } catch(e){
      console.log(e+":"+data)
    }
}

var isVisible = function(elem){
  return elem.css("display") != 'none';
};
/*
var popUpChangeMode = function(){
  if(!Controll.supportOriginalMode()){
    return;
  }
  if(Controll.mode() == "reading"){
    if(isVisible($("#popup_reading"))){
      $("#popup_reading").hide();
    }else{
      $("#popup_reading").show();
    }
  }else{
    if(isVisible($("#popup_original"))){
      $("#popup_original").hide();
    }else{
      $("#popup_original").show();
    }
  }
  $("#popup_scene").hide();
  $("#popup_page").hide();
};

var toggleMode = function(){
  if(Controll.mode() == "reading"){
    Controll.original();
    $("#menu_mode_reading").hide();
    $("#menu_mode_original").show();
    $("#popup_reading").hide();
    $("#popup_original").show();
  }else{
    Controll.reading();
    $("#menu_mode_original").hide();
    $("#menu_mode_reading").show();
    $("#popup_original").hide();
    $("#popup_reading").show();
  }
  setTimeout(function(){
    $("#popup_reading").hide();
    $("#popup_original").hide();
  },500);
}

var toggleView = function(){
  if(Controll.view() == "scene"){
    Controll.page();
    $("#menu_scene_view").hide();
    $("#menu_page_view").show();
    $("#popup_scene").hide();
    $("#popup_page").show();
  }else{
    Controll.scene();
    $("#menu_page_view").hide();
    $("#menu_scene_view").show();
    $("#popup_page").hide();
    $("#popup_scene").show();
  }
  setTimeout(function(){
    $("#popup_scene").hide();
    $("#popup_page").hide();
  },500);
}*/


var controll_timer;
var startReader = function(storyId){
    var current_view = "";
    var current_mode = "";
	setTimeout(function(){
		if(controll_timer)return;
		console.log("cached iframe");
		sync_iframe();
	},1000);
    $('iframe:first').load(function(e){
		if(controll_timer)return;
		console.log("loaded iframe");
		sync_iframe();
    });

    $("#menu_first").click(Controll.first);
    $("#menu_prev").click(Controll.prev);
    $("#menu_next").click(Controll.next);
    /*$("#menu_mode_reading").click(popUpChangeMode);
    $("#menu_mode_original").click(popUpChangeMode);
    $("#menu_scene_view").click(popUpChangeView);
    $("#menu_page_view").click(popUpChangeView);*/

    /*$("#popup_reading").click(toggleMode);
    $("#popup_original").click(toggleMode);
    $("#popup_scene").click(toggleView);
    $("#popup_page").click(toggleView);*/
	$("#change_mode").click(Controll.change_mode);
	$("#change_setting").click(Controll.change_setting);
	var sync_iframe = function(){
	  Controll.enableGA();
      controll_timer =  setInterval(function(){
        if(!Controll.ready()){
			console.log("error:",Controll.ready());
          return;
        }
        /*if(Controll.supportOriginalMode()){
          $("#menu_mode_reading").removeClass("disable");
        }
        if(Controll.supportPageView()){
          $("#menu_scene_view").removeClass("disable");
        }*/
        /*上記のような分岐がここにも必要と思われる*/
		$("#change_mode").removeClass("disable");
		$("#change_setting").removeClass("disable");

        var cur = Controll.current();
        var total = Controll.total();
        if(cur == '1' || cur == '--'){
          $("#menu_first").addClass("disable");
          $("#menu_prev").addClass("disable");
          $("#fullscreen_prev").addClass("disable");
          $("#fullscreen_page_prev").addClass("disable");
        }else{
          $("#menu_first").removeClass("disable");
          $("#menu_prev").removeClass("disable");
          $("#fullscreen_prev").removeClass("disable");
          $("#fullscreen_page_prev").removeClass("disable");
        }
        if(cur != '--' && cur == total){
          $("#menu_next").addClass("disable");
          $("#fullscreen_next").addClass("disable");
          $("#fullscreen_page_next").addClass("disable");
        }else{
          $("#menu_next").removeClass("disable");
          $("#fullscreen_next").removeClass("disable");
          $("#fullscreen_page_next").removeClass("disable");
        }
        $("#progress_current").text(cur);
        $("#progress_current_full").text(cur);
        $("#progress_total").text(total);
        $("#progress_total_full").text(total);
        if(current_view !=  Controll.view()){
          if(Controll.view() === 'page'){
            $("#fullscreen_next").hide();
            $("#fullscreen_prev").hide();
            $("#fullscreen_page_next").show();
            $("#fullscreen_page_prev").show();
            /*$("#menu_scene_view").hide();
            $("#menu_page_view").show();*/
          }else{
            $("#fullscreen_page_next").hide();
            $("#fullscreen_page_prev").hide();
            $("#fullscreen_next").show();
            $("#fullscreen_prev").show();
            /*$("#menu_page_view").hide();
            $("#menu_scene_view").show();*/
          }
          current_view = Controll.view();
        }
        /*if(current_mode !=  Controll.mode()){
          if(Controll.mode() == "reading"){
            $("#menu_mode_original").hide();
            $("#menu_mode_reading").show();
          }else{
            $("#menu_mode_reading").hide();
            $("#menu_mode_original").show();
          }
          current_mode = Controll.mode();
        }*/
      }, 100);
    }
}

