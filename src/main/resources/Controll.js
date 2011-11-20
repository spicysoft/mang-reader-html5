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
      if(document.getElementById('reader_reader').contentWindow.$("#preview").css("display") == 'none'){
          document.getElementById('reader_reader').contentWindow.$("#canvas").trigger('mousedown');
      }else{
          document.getElementById('reader_reader').contentWindow.$("#preview_ui").click();
      }
    }else if(e.which == 8//BS
        || e.which == 37//left
        || e.which == 38//up
      ){
      console.log("prev");
    }else if(e.which == 80){//p
      console.log("page");
    }else if(e.which == 83){//s
      console.log("scene");
    }else if(e.which == 82){//r
      console.log("reading");
    }else if(e.which == 79){//o
      console.log("original");
    }
  });
};
var $Controll = new $Controll();