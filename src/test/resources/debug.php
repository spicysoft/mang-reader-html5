<!DOCTYPE html>
<html><head>
<meta http-equiv="Content-Type" content="text/html; charset=UTF-8">
<style>
.sprite2 {
	border: 1px solid #999;
	background:#000;
	background: rgba(0,0,0,0.7);
	border-radius: 5px;        /* CSS3草案 */
	-webkit-border-radius: 5px;    /* Safari,Google Chrome用 */
	-moz-border-radius: 5px;
	display:table;
	box-sizing:border-box;
}
.sprite2 div {
	display:table-cell;
	vertical-align:middle;
}
.sprite2 span {
	background-image: url(/files/viewer/html5/ja.480.png);
	background-size: 624px 795px;
	background-repeat:no-repeat;
	text-indent:-9999px;
	overflow:hidden;
	display:block;
	margin:auto;
}
#ad_cover {
    display:none;
    position:absolute;
    z-index: 1000;
    width:100%;
    height:100%;
    background:rgba(0,0,0,0.8);
}
#ad_area {
    width:336px;
    padding:13px 13px 0;
    position:relative;
    z-index: 12;
    background:#000;
    top:50%;
    left:50%;
	border:1px solid #aaa;
}
#ad_area .go_premium {
    font-size:13px;
    color:#888;
    text-decoration:underline;
    display: inline-block;
}
#ad_area a:hover {
    text-decoration:none;
}
#ad_area .loading {
	position:absolute;
	top: 140px;
	left: 160px;
}
#ad_area .loading img {
	background:#fff;
	border-radius: 5px;
	-moz-border-radius: 5px;
	-webkit-border-radius: 5px;
	-o-border-radius: 5px;
	-ms-border-radius: 5px;
	padding:5px;
}
#ad_area .area {
	position:relative;;
    padding-bottom:13px;
	text-align:center;
	width:336px;
	height:280px;
}
#ad_area .sprite2 {
	float:right;
}
/*広告閉じる*/
#close_ad					{width: 42px;height: 22px; cursor: pointer;}
#close_ad span              {background-position: -222px 0;width: 36px;height: 20px; cursor: pointer;}
#close_ad:hover span,
#close_ad.active span 		{background-position: -258px 0;width: 36px;height: 20px; cursor: pointer;}
#close_ad.disable span      {background-position: -294px 0;width: 36px;height: 20px; cursor: pointer;}

/*広告バツ*/
#close_ad_top				{width: 22px;height: 22px; cursor: pointer;}
#close_ad_top span			{background-position: -222px -20px;width: 20px;height: 20px; cursor: pointer;}
#close_ad_top:hover span,
#close_ad_top.active span 	{background-position: -242px -20px;width: 20px;height: 20px; cursor: pointer;}
#close_ad_top.disable span  {background-position: -262px -20px;width: 20px;height: 20px; cursor: pointer;}

#top_button {
	display:none;
}
#click_controll {
	position:absolute;
	top:0;
	left:0;
	width:100%;
	height:100%;
	z-index:50000;
	display:none;
	background:#000;
	filter: alpha(opacity=0);
	background:rgba(0,0,0,0);
}
#top_button .go_premium {margin-top:5px;}
.ad_button_area {padding-bottom:13px;text-align: left;}

</style>
</head><body style="background-color: #808080;"><div>
<div>Development</div>
<h2>member 480</h2>
<script type="text/javascript" >
  var storyId = 26761;
</script>
<script src="https://ajax.googleapis.com/ajax/libs/jquery/1.7.2/jquery.min.js" type="text/javascript" ></script>
<script src="/local-test/mr/target/dist-debug/Controll.js" type="text/javascript" ></script>
<script type="text/javascript" >

  var size = 480;
  var t = <?=time()?>;

  $(document).ready(function(){
    var html = '<iframe id="reader_reader" src="/local-test/mr/target/dist-debug/ja_pc.html#'+storyId+',nomember,nomenu,ad,'+t+'" width="'+ size +'px" height="' + size +'px" frameborder="0" allowfullscreen="true"></iframe>';
    $("#reader_wrapper").append(html);
    startReader(storyId);
    $('iframe:first').ready(function(){
    	Controll.injectAd("<div style='width:250px;height:250px;'>test</div>");
    });
  });
</script>
<div id="reader_container" style="width:480px;padding:0;margin:0;position:relative;">
 <link href="/local-test/mr/target/dist-debug/ja.pc.css" rel="stylesheet" type="text/css">
 <div id="reader_wrapper" style="height:480px;" >
 <div id="ad_cover">
     <div id="ad_area" class="">
       <div class="ad_button_area" id="top_button"><a class="go_premium" target="_blank" href="/premium/appeal">この広告は非表示にできます</a><a href="javascript:void(0);" id="close_ad_top" class="sprite2 disable"><div><span></span></div></a></div>
	   <div class="loading"><img src="/img/ja_smartphone/loading32.gif" height="32" width="32" >
</div>
       <div class="area">

       </div>
       <div class="ad_button_area" id="bottom_button"><a class="go_premium" target="_blank" href="/premium/appeal">この広告は非表示にできます</a><a href="javascript:void(0);" id="close_ad" class="sprite2 disable"><div><span></span></div></a></div>
     </div>
	 <div id="click_controll"></div>
   </div>
  </div>
 <div id="menu_bar_reader" class="menu_bar_design">
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

