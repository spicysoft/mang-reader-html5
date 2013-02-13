<!DOCTYPE html>
<html><head>
<meta charset="UTF-8" />
 <link href="/local-test/mr/target/dist-debug/ja.pc.css" rel="stylesheet" type="text/css">
</head><body>
<script src="/local-test/mr/target/dist-debug/jquery-1.5.min.js" type="text/javascript" ></script>
<script src="/local-test/mr/target/dist-debug/Controll.js" type="text/javascript" ></script>
<script type="text/javascript" >
  setInterval(function(){
    $("#progress_current").text(Controll.current());
    $("#progress_total").text(Controll.total());
  }, 100);
  var popUpChangeMode = function(){
    //
  };
  var popUpChangeView = function(){
    //
  };
  var hideFullScreen = function(){
    history.back();
  }
</script>
<style type="text/css">
body {
    background-color: #000000;
    padding:0;margin:0px;
}
#reader_container {padding:0;margin:0;position:absolute;width:100%;height:100%;}
#header {
    position: absolute;
    top: 0px;
    left: 0px;
    width: 100%;
    height: 88px;
    color: #FFF;
    margin:0;
    padding: 4px;
    background: -moz-linear-gradient(top, #666, #000 60%, #000);
    background: -webkit-gradient(linear, left top, left bottom, from(#666), color-stop(0.6, #000), to(#000));
}
#reader_wrapper {
    position: absolute;
    top:88px;
    width:100%;
    text-align:center;
}
#reader_reader {
    position: relative;
    margin: auto;
}
.caption {
    font-size: 120%;
    color:#909090;
    position: relative;
    margin: 8px 4px 8px 4px;
    font-weight: bold;
}
#caption_title {
    font-size: 160%;
    color:#ffffff;
}
#fullscreen_prev {
    left:5%;top:45%;position:absolute;z-index:99;
}
#fullscreen_next {
    right:5%;top:45%;position:absolute;z-index:99;
}
#footer {
    position:absolute;
    width:100%;
    bottom:0px;
    height:28px;
}
#menubar_reader {
    position:relative;
    bottom:0px;
    padding:0;
    margin:auto;
    width:925px;
}
#reader_reader {
    position:relative;margin:auto;
}
</style>
<div id="reader_container">
 <div id="header">
  <div id="caption_title" class="caption">マンガタイトル</div>
  <div class="caption">第1234話/全56789話</div>
  <div class="caption">マンガストーリータイトル</div>
 </div>
 <div id="reader_wrapper">
  <div id="fullscreen_prev" class="sprite" onclick="Controll.prev();" ></div>
  <iframe id="reader_reader" src="/local-test/mr/target/dist-debug/ja_pc.html#26035,member,<?=time()?>" width="1080" height="960" frameborder="0" allowfullscreen="true" scrolling="no"></iframe>
  <div id="fullscreen_next" class="sprite" onclick="Controll.next();"></div>
 </div>
 <div id="footer">
  <div id="menu_bar_reader">
   <div id="menu_first" class="sprite menu" onclick="Controll.first();""></div>
   <div id="menu_prev" class="sprite menu" onclick="Controll.prev();""></div>
   <div id="menu_bar_fullscreen" class="sprite menu" style="z-index:9;">
    <div id="progress">
     <span id="progress_current">--</span><span style="color:#808080;">/<span id="progress_total">--</span></span>
    </div>
   </div>
   <div id="menu_next" class="sprite menu"  onclick="Controll.next();"></div>
   <div id="menu_mode_reading"  class="sprite menu" onclick="popUpChangeMode();"></div>
   <div id="menu_mode_original" class="sprite menu" style="display:none;" onclick="popUpChangeMode();"></div>
   <div id="menu_scene_view" class="sprite menu" onclick=""></div>
   <div id="menu_page_view" class="sprite menu" style="display:none;" onclick=""></div>
   <div id="menu_fullscreen" class="sprite menu" onclick="hideFullScreen();"></div>
  </div>
 </div>
</div>
</body>
</html>
