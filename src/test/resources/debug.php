<!DOCTYPE html><html><head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
</head><body style="background-color: #808080;"><div>
<div>Development</div>
<h2>member 480</h2>
<script type="text/javascript" >
  var storyId = 27960;
</script>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js" type="text/javascript" ></script>
<script src="/local-test/mr/target/dist-debug/Controll.js" type="text/javascript" ></script>
<script type="text/javascript" >

  var size = 480;
  var t = <?=time()?>;

  $(document).ready(function(){
    var html = '<iframe id="reader_reader" src="/local-test/mr/target/dist-debug/ja_pc.html#'+storyId+',nomember,nomenu,no_ad,'+t+'" width="'+ size +'px" height="' + size +'px" frameborder="0" allowfullscreen="true"></iframe>';
    $("#reader_wrapper").append(html);
    startReader(storyId);
    $('iframe:first').ready(function(){
    	Controll.injectAd("<div style='width:250px;height:250px;'>test</div>");
    });
  });
</script>
<div id="reader_container" style="padding:0;margin:0;position:relative;">
 <link href="/local-test/mr/target/dist-debug/ja.pc.css" rel="stylesheet" type="text/css">
 <div id="reader_wrapper" style="height:480px;" ></div>
 <div id="menu_bar_reader" class="menu_bar_design" style="width:480px">
  <div id="menu_first" class="sprite menu_left disable tooltip" title="最初に戻る"><div><span></span></div></div>
  <div id="menu_prev" class="sprite menu_left disable tooltipss" title="一つ前に戻る&#13;&#10;(キーボード[←][↑][BS]も有効です)"><div><span></span></div></div>
  <div id="menu_bar" class="menu_left" style="z-index:9;">
    <div id="progress"  class="menu_font">
      <span id="progress_current">--</span><span style="color:#808080;">/<span id="progress_total">--</span></span>
    </div>
  </div>
  
  <div id="menu_next"          class="sprite menu_left disable tooltipss" title="次へ進む&#13;&#10;(キーボード[→][↓][Enter][Space]も有効です)"><div><span></span></div></div>
  
  <div id="menu_fullscreen"    class="sprite menu_right tooltip" title="フルスクリーン表示する"><div><span></span></div></div>
  <div id="close_fullscreen" class="sprite menu_right tooltip" style="display:none;" title="通常サイズで表示する"><div><span></span></div></div>
  <div id="change_mode" title="読書モードを変更します" class="menu_right menu_font disable tooltipss">モード変更</div>
  <div id="setting" title="設定を変更します" class="menu_right menu_font disable tooltipss">設定</div>
  
  
 </div>
</div>
</body></html>

