<!DOCTYPE html><html><head>

</head><body style="background-color: #808080;"><div>
<div>Development</div>
<h2>member 480</h2>
<script type="text/javascript" >
  var storyId = 27555;
</script>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js" type="text/javascript" ></script>
<script src="/local-test/mr/target/dist-debug/Controll.js" type="text/javascript" ></script>
<script type="text/javascript" >

  var size = 480;
  var t = <?=time()?>;

  $(document).ready(function(){
    var html = '<iframe id="reader_reader" src="/local-test/mr/target/dist-debug/ja_pc.html#'+storyId+',nomember,nomenu,'+t+'" width="'+ size +'px" height="' + size +'px" frameborder="0" allowfullscreen="true"></iframe>';
    $("#reader_wrapper").append(html);
    startReader(storyId);
  });
</script>
<div id="reader_container" style="padding:0;margin:0;position:relative;">
 <link href="/local-test/mr/target/dist-debug/ja.pc.css" rel="stylesheet" type="text/css">
 <div id="reader_wrapper" ></div>
 <div id="popup_reading" class="sprite" style="display:none;" ></div>
 <div id="popup_original" class="sprite" style="display:none;"></div>
 <div id="popup_scene" class="sprite" style="display:none;"></div>
 <div id="popup_page" class="sprite" style="display:none;"></div>
 <div id="menu_bar_reader" style="position:absolute;top:480px;padding:0;margin:0;">
  <div id="menu_first" class="sprite menu disable"></div>
  <div id="menu_prev" class="sprite menu disable"></div>
  <div id="menu_bar" class="sprite menu" style="z-index:9;">
    <div id="progress">
      <span id="progress_current">--</span><span style="color:#808080;">/<span id="progress_total">--</span></span>
    </div>
  </div>
  <div id="menu_next"          class="sprite menu"></div>
  <div id="menu_mode_reading"  class="sprite menu disable"></div>
  <div id="menu_mode_original" class="sprite menu" style="display:none;"></div>
  <div id="menu_scene_view"    class="sprite menu disable"></div>
  <div id="menu_page_view"     class="sprite menu" style="display:none;"></div>
  <div id="menu_fullscreen"    class="sprite menu" ></div>
 </div>
</div>
</body></html>

