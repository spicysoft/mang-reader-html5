<!DOCTYPE html><html><head>
<meta charset="UTF-8" />
 <link  href="/local-test/mr/target/dist-debug/layout.480.css" rel="stylesheet" type="text/css">
 <link href="/local-test/mr/target/dist-debug/ja.pc.css" rel="stylesheet" type="text/css">
</head><body style="padding:0;width:480px;height:508px;"><div>
<script src="/local-test/mr/target/dist-debug/jquery-1.5.min.js" type="text/javascript" ></script>
<script src="/local-test/mr/target/dist-debug/Controll.js" type="text/javascript" ></script>
<script type="text/javascript" >
  var story_id = 1925;
  setInterval(function(){
    $("#progress_current").text(Controll.current());
    $("#progress_total").text(Controll.total());
  }, 100);
</script>
<style type="text/css">
.sprite2 {background-image: url(ja.480.png?v=1); background-repeat: no-repeat; text-indent:-9999px; overflow: hidden; display:block;}
#logo_reader {background-position: -513px -1px;width: 153px;height: 36px;}
.caption {
    font-size: 100%;
    color:#909090;
    position: relative;
    margin: 6px 8px 6px 8px;
    font-weight: bold;
}
#caption_title {
    font-size: 100%;
    color:#ffffff;
    margin: 8px 8px 8px 8px;
}
</style>
<div style="position:absolute;width:480px;background-color:#000;opacity:0.6;z-index:99;" >
  <div id="caption_title" class="caption">ニートとフリーターと小学生</div>
  <div class="caption">第999話/全999話</div>
  <div class="caption">第999話</div>
 <div id="logo_reader" class="sprite2" style="position:absolute; right:18px; top:16px;"></div>
</div>
<div id="reader_container" style="padding:0;margin:0;position:relative;">
 <iframe id="reader_reader" src="/local-test/mr/target/dist-debug/ja_pc.html#1961,member,<?=time()?>" width="480" height="480" frameborder="0" allowfullscreen="true" scrolling="no"></iframe>
 <div id="menu_bar_reader" style="position:absolute;top:480px;padding:0;margin:0;">
  <div id="menu_first" class="sprite menu" onclick="Controll.first();""></div>
  <div id="menu_prev" class="sprite menu" onclick="Controll.prev();"></div>
  <div id="menu_bar_ex" class="sprite menu" style="z-index:9;">
    <div id="progress">
      <span id="progress_current">--</span><span style="color:#808080;">/<span id="progress_total">--</span></span>
    </div>
  </div>
  <div id="menu_next"          class="sprite menu" onclick="Controll.next();"></div>
  <div id="menu_mode_reading"  class="sprite menu" onclick="popUpChangeMode();"></div>
  <div id="menu_mode_original" class="sprite menu" style="display:none;" onclick="popUpChangeMode();"></div>
  <div id="menu_scene_view"    class="sprite menu" onclick=""></div>
  <div id="menu_page_view"     class="sprite menu" style="display:none;" onclick=""></div>
 </div>
</div>
</body></html>

