var _gaq = _gaq || [];
var loadGoogleAnalytics = function(){
  _gaq.push(['_setAccount', 'UA-22337891-1']);
  _gaq.push(['_setDomainName', '.mang.jp']);
  _gaq.push(['_setAllowLinker', true]);
  _gaq.push(['_setAllowHash', false]);
  (function() {
  var ga = document.createElement('script'); ga.type = 'text/javascript'; ga.async = true;
  ga.src = ('https:' == document.location.protocol ? 'https://ssl' : 'http://www') + '.google-analytics.com/ga.js';
  var s = document.getElementsByTagName('script')[0]; s.parentNode.insertBefore(ga, s);
  })();
};