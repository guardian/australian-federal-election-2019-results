import jquery from 'jquery'
import animateSprite from '../lib/jquery.animateSprite.min'

export class Sprite {
    constructor(el, character) {
      this.el = el
      $(el).css("background-image", `url(@@assetPath@@/assets/imgs/${character}-small-left.png)`)

      var animations = {
        turnbull: {
            winning: [2,3,2,3,2,3],
            neutralBlink1:[0,1,0,0,0,0,0,0,0,0,0,0,0,0,0],
            neutralBlink2:[0,0,0,0,1,0,0,0,0,0,0,1,0,0,0],
            neutralBlink3:[0,0,0,0,0,0,1,0,0,0,1,0,0,0,0],
            sadBlink1:[4,5,4,4,4,4,4,4,4,4,4,4,4,4,4],
            sadBlink2:[4,4,4,4,5,4,4,4,4,4,4,5,4,4,4],
            sadBlink3:[4,4,4,4,4,4,5,4,4,4,5,4,4,4,4]
        },
        shorten: {
            winning: [2,3,2,3,2,3],
            neutralBlink1:[0,0,0,0,0,0,0,0,0,0,0,0,0,1,0],
            neutralBlink2:[0,0,0,0,0,0,0,0,0,0,0,1,0,1,0],
            neutralBlink3:[0,0,0,0,0,1,0,0,0,0,0,0,0,1,0],
            sadBlink1:[4,4,4,4,4,4,4,4,4,4,4,4,4,5,4],
            sadBlink2:[4,4,4,4,4,4,4,4,4,4,4,5,4,5,4],
            sadBlink3:[4,4,4,4,4,5,4,4,4,4,4,4,4,5,4]
        }
      }
      $(this.el).animateSprite({
          fps: 6,
          loop:true,
          animations: animations[character],
          autoplay:false
      })
    }

    neutralBlink() {
      var el = this.el
      $(el).animateSprite('play',  'neutralBlink1');
      var timer = window.setInterval(function() {
        var randTime = Math.floor((Math.random() * 3) + 1);
        var blink = 'neutralBlink' + String(randTime)
        $(el).animateSprite('play', blink);
      }, 3000);
    }

    sadBlink() {
      var el = this.el
      $(el).animateSprite('play',  'sadBlink1');
      var timer = window.setInterval(function() {
        var randTime = Math.floor((Math.random() * 3) + 1);
        var blink = 'sadBlink' + String(randTime)
        $(el).animateSprite('play', blink);
      }, 3000);
    }

    cheer() {
      $(this.el).animateSprite('play', 'winning');
    }
}