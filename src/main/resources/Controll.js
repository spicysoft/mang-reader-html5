/**
 * 親Frameからリーダの状態を取得/操作する
 *
 * リーダーはClosure Compilerで難読化されているため、要素のイベントをトリガーして操作する
 */
function $Controll() {
  //・Enter、Space,、下、右 ... 進む
  //・上、左、BS            ... 戻る
  //・Esc                   ... 全画面解除

  //親フレーム用のキー入力受付
  //小フレーム用はReader.js内にあります
  $(window).keydown(function(e){
    if(e.which == 32      //space
      || e.which == 13  //enter
      || e.which == 39  //right
      || e.whicch == 40 //down
      ){
      Controll.next();
      e.preventDefault();
    }else if(e.which == 8//BS
        || e.which == 37//left
        || e.which == 38//up
      ){
      Controll.prev();
      e.preventDefault();
    }
    console.log(e.which);
  });
  var elem = function(hash){
    return document.getElementById('reader_reader').contentWindow.$(hash);
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

  this.prev = function(){
    if(!started()){
      elem("#prev_page").trigger('mouseup');
    }else{
      elem("#prev_scene").trigger('mouseup');
    }
  }

  this.first = function(){
     elem("#first_scene").trigger('mouseup');
  }

  this.page = function(){
    elem("#toggle_scene_view").trigger('mouseup');
  }

  this.scene = function(){
    elem("#toggle_page_view").trigger('mouseup');
  }

  this.reading = function(){
    elem("#toggle_original").trigger('mouseup');
  }

  this.original = function(){
    elem("#toggle_reading").trigger('mouseup');
  }

  this.total = function(){
    return elem("#progress_total").text();
  }

  this.current = function(){
    return elem("#progress_current").text();
  }

  this.mode = function(){
    if(elem("#toggle_reading").css("display") == 'none'){
      return 'original';
    } else {
      return 'reading';
    }
  }

  this.view = function(){
    if(elem("#toggle_scene_view").css("display") == 'none'){
      return  'page';
    } else {
      return  'scene';
    }
  }

  this.supportOriginalMode = function(){
    return !elem("#toggle_reading").hasClass("disable");
  }

  this.supportPageView = function(){
    return !elem("#toggle_scene_view").hasClass("disable");
  }
};
var Controll = new $Controll();

var isVisible = function(elem){
  return elem.css("display") != 'none';
};

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
  }else{
    Controll.reading();
    $("#menu_mode_original").hide();
    $("#menu_mode_reading").show();
  }
  $("#popup_reading").hide();
  $("#popup_original").hide();
}

var toggleView = function(){
  if(Controll.view() == "scene"){
    Controll.page();
    $("#menu_scene_view").hide();
    $("#menu_page_view").show();
  }else{
    Controll.scene();
    $("#menu_page_view").hide();
    $("#menu_scene_view").show();
  }
  $("#popup_scene").hide();
  $("#popup_page").hide();
}

var popUpChangeView = function(){
  if(!Controll.supportPageView()){
    return;
  }
  if(Controll.view() == "scene"){
    if(isVisible($("#popup_scene"))){
      $("#popup_scene").hide();
    }else{
      $("#popup_scene").show();
    }
  }else{
    if(isVisible($("#popup_page"))){
      $("#popup_page").hide();
    }else{
       $("#popup_page").show();
    }
  }
  $("#popup_reading").hide();
  $("#popup_original").hide();
};

var startReader = function(storyId){
    $('iframe:first').load(function(e){
      setInterval(function(){
        if(Controll.supportOriginalMode()){
          $("#menu_mode_reading").removeClass("disable");
        }
        if(Controll.supportPageView()){
          $("#menu_scene_view").removeClass("disable");
        }
        var cur = Controll.current();
        var total = Controll.total();
        if(cur == '1' || cur == '--'){
          $("#menu_first").addClass("disable");
          $("#menu_prev").addClass("disable");
        }else{
          $("#menu_first").removeClass("disable");
          $("#menu_prev").removeClass("disable");
        }
        if(cur != '--' && cur == total){
          $("#menu_next").addClass("disable");
        }else{
          $("#menu_next").removeClass("disable");
        }
        $("#progress_current").text(cur);
        $("#progress_total").text(total);
      }, 100);
    });
    var pp_r_left = $("#menu_mode_reading").offset().left;
    var pp_r_top = $("#menu_mode_reading").offset().top-249;
    var pp_s_left = $("#menu_scene_view").offset().left-90;
    var pp_s_top = $("#menu_scene_view").offset().top-159;

    $("#popup_reading").css({top:pp_r_top, left:pp_r_left});
    $("#popup_original").css({top:pp_r_top, left:pp_r_left});
    $("#popup_scene").css({top:pp_s_top, left:pp_s_left});
    $("#popup_page").css({top:pp_s_top, left:pp_s_left});

    $("#menu_first").click(Controll.first);
    $("#menu_prev").click(Controll.prev);
    $("#menu_next").click(Controll.next);
    $("#menu_mode_reading").click(popUpChangeMode);
    $("#menu_mode_original").click(popUpChangeMode);
    $("#menu_scene_view").click(popUpChangeView);
    $("#menu_page_view").click(popUpChangeView);
    $("#menu_fullscreen").click(function(){
      window.open('/viewer/html5/'+storyId,"new","width="+(screen.availWidth-22)+", height="+(screen.availHeight-44)+",fullscreen=1,scrollbars=1,toolbar=1,menubar=1,staus=1,resizable=1");
    });
    $("#popup_reading").click(toggleMode);
    $("#popup_original").click(toggleMode);
    $("#popup_scene").click(toggleView);
    $("#popup_page").click(toggleView);
}

