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
      this.next();
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
  var elem = function(hash){
    return document.getElementById('reader_reader').contentWindow.$(hash);
  }

  this.next = function(){
    if(elem("#preview").css("display") == 'none'){
        elem("#canvas").trigger('mousedown');
    }else{
        elem("#prev_scene").click();
    }
  };
  this.prev = function(){
      elem("#preview_ui").click();
  }
};
var Controll = new $Controll();