(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
"use strict";
module.exports = {
    Paddle: Paddle,
    Scoreboard: Scoreboard,
    Ball: Ball
};

var ZERO = new Phaser.Point(0, 0);
function fromAngle(degrees) {
    var rads = degrees * (Math.PI/180);
    return new Phaser.Point(Math.cos(rads), Math.sin(rads));
}

/** 
 * {{{1 Paddle
 * @param x {number} The x position to create the paddle on
 */
function Paddle(x, miny, maxy, texture, game) {
    this.sprite = game.add.sprite(x, (maxy-miny) / 2 + miny, texture);
    this.sprite.anchor.set(0.5, 0.5);
    this.miny = miny + this.sprite.height/2;
    this.maxy = maxy - this.sprite.height/2;
}

Paddle.prototype.destroy = function() {
    this.sprite.destroy();
};

Paddle.prototype.move = function(dy) {
    var y = Phaser.Math.clamp(this.sprite.y + dy, this.miny, this.maxy);
    this.sprite.y = y; 
};

Paddle.prototype.reset = function() {
    var center = (this.maxy-this.miny) / 2 + this.miny;
    this.sprite.reset(this.sprite.x, center);
};

Paddle.prototype.getReflection = function(hit) {
    var relativeY = this.sprite.centerY - hit.y;
    var sign = relativeY > 0? -1 : +1;
    var left = Math.abs(relativeY);
    var angle = 0;
    while (left > 0.25 * this.sprite.height/2) {
        angle += 15;
        left -= 0.25 * this.sprite.height/2;
    }
    return angle * sign;
};
//1}}}

/**
 * {{{1 Scoreboard
 * Keeps track of score and displays it using sprites.
 */
function Scoreboard(x, y, sprite, game) {
    this._sprite = sprite;
    this._init(x, y, game);
}

Scoreboard.prototype._init = function(x, y, game) {
    this._x = x;
    this._y = y;
    this._digits = game.add.group();
    this._tens = game.add.sprite(x, y, this._sprite, 0);
    var spacing = this._tens.width / 4;
    this._ones = game.add.sprite(x + this._tens.width + spacing, y, 
            this._sprite, 0);
    this._digits.add(this._tens);
    this._digits.add(this._ones);
    this.setScore(0);
};

Scoreboard.prototype.destroy = function() {
    this._tens = null;
    this._ones = null;
    this._digits.destroy();
    this._digits = null;
};

Scoreboard.prototype.setVisible = function(v) {
    this._digits.visible = v;
};

Scoreboard.prototype.reset = function() {
    this.setScore(0);
};

Scoreboard.prototype.setScore = function(score) {
    this.score = score;
    this._refresh();
};

Scoreboard.prototype.addScore = function(n) {
    this.score += n || 1;
    this._refresh();
};

Scoreboard.prototype._refresh = function() {
    this._tens.visible = this.score >= 10;
    var score = this.score % 100;
    this._tens.frame = Math.floor(score / 10);
    this._ones.frame = score % 10;
};
//1}}}



/**
 * {{{1 Ball
 */
function Ball(x, y, texture, pong) {
    this.pong = pong;
    this.initialX = x;
    this.initialY = y;
    this.sprite = pong.game.add.sprite(x, y, texture);
    this.sprite.anchor.set(0.5, 0.5);
    this.speed = pong.speed;
    this.miny = this.sprite.height/2;
    this.maxy = pong.game.height - this.sprite.height/2 - 1;
    this.reset();
}

Ball.prototype.reset = function() {
    var range = this.maxy - this.miny;
    var miny = this.miny + range/5;
    var maxy = this.maxy - range/5;
    var y = Math.floor(Math.random() * (maxy - miny)) + miny;
    this.sprite.x = this.initialX;
    this.sprite.y = y;
    this.velocity = new Phaser.Point(0, 0);
};

Ball.prototype.serve = function(side) {
    if (!side) side = Math.round(Math.random())? +1 : -1;
    var angle = this.pong.game.rnd.between(-1, 1) * 45;
    if (side < 0) angle += 180;
    this.velocity = fromAngle(angle);
    this.velocity.normalize().multiply(this.speed, this.speed);
};

Ball.prototype.update = function() {
    if (this.speed === 0 || this.velocity.x === 0 + this.velocity.y === 0) {
        return;
    }
    
    this.sprite.x += this.velocity.x;
    this.sprite.y += this.velocity.y;

    if (this.sprite.y < this.miny || this.sprite.y > this.maxy) {
        this.sprite.y = Phaser.Math.clamp(this.sprite.y, this.miny, this.maxy);
        this.pong.playSound('wallhit');
            
        this.velocity.y = -this.velocity.y;
        this.sprite.y += this.velocity.y;
    }
};



Ball.prototype.bounce = function(hitInfo) {
    var startToHit = Phaser.Point.subtract(
            hitInfo.ballPath.end,
            hitInfo.hit);
    var moveBack = Phaser.Point.normalize(this.velocity);
    moveBack = Phaser.Point.negative(moveBack, moveBack);
    moveBack.setMagnitude(startToHit.getMagnitude());
    this.sprite.x = hitInfo.ballPath.start.x + moveBack.x;
    this.sprite.y = hitInfo.ballPath.start.y + moveBack.y;
    if (hitInfo.side !== 'front') {
        this.velocity.y = -this.velocity.y;
    } else {
        var speed = this.velocity.getMagnitude();
        var degrees = hitInfo.player.paddle.getReflection(hitInfo.hit);
        var speedFactor = degrees? 1.05 : 0.95;
        var vec = fromAngle(degrees).setMagnitude(speed * speedFactor);
            if (this.velocity.x > 0) vec.x *= -1;
        this.velocity = vec;
    }
};

//1}}}

},{}],2:[function(require,module,exports){
// {{{1 Dominik's awesome Pong clone
//
// repository:  https://github.com/lincore81/PhaserPong
// play:        https://lincore81.github.io/PhaserPong
// 
// Copyright (c) 2016 Dominik Rosehnal
// 
// Permission is hereby granted, free of charge, to any person obtaining a copy of
// this software and associated documentation files (the "Software"), to deal in
// the Software without restriction, including without limitation the rights to
// use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies
// of the Software, and to permit persons to whom the Software is furnished to do
// so, subject to the following conditions:
// 
// The above copyright notice and this permission notice shall be included in all
// copies or substantial portions of the Software.
// 
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER
// DEALINGS IN THE SOFTWARE.
// 1}}}
"use strict";

var entities = require('./entities.js');
var players = require('./players.js');

var pong = main();
var game = pong.game;

//{{{1 main()
function main() {
    var pong = {};
    pong.pause = false;
    var state = {preload: preload, create: create, update: update};
    pong.state = state;
    pong.game = new Phaser.Game(800, 480, Phaser.CANVAS, 'pong', state);
    pong.controllers = [];
    pong.debug = false;
    window.pong = pong;
    window.game = pong.game;
    return pong;
}
//1}}}

//{{{1 preload()
function preload() {
    //game.load.spritesheet('digits', 'img/digits.png', 64, 64);
    game.load.audio('wallhit', 'sound/wallhit.mp3');
    game.load.audio('paddlehit', 'sound/paddlehit.mp3');
    game.load.audio('out', 'sound/out.mp3');
}
//1}}}

// {{{1 create()
function create() {
    pong.pixel = 8;
    createTextures(game, pong.pixel, 4, 4);
    pong.sfx = {
        wallhit: game.add.audio('wallhit'),
        paddlehit: game.add.audio('paddlehit'),
        out: game.add.audio('out')
    };
    pong.mute = false;
    pong.volume = 0.05;
    pong.paused = true;
    pong.speed = 8;

    var top = 2 * pong.pixel
      , bottom = game.height - 2*pong.pixel
      , left = 100
      , right = game.width - 100

      , scoreboard1 = new entities.Scoreboard(
                    game.width / 4, 
                    top, 
                    'digits',
                    game)
      , scoreboard2 = new entities.Scoreboard(
                    game.width / 4 * 3 - 128, 
                    top, 
                    'digits',
                    game)
      , paddle1 = new entities.Paddle(
                    left, top, bottom, 
                    game.cache.getImage('paddle1'), 
                    game)
      , paddle2 = new entities.Paddle(
                    right, top, bottom, 
                    game.cache.getImage('paddle2'), 
                    game)
      , c1 = new players.KeyboardPlayer(paddle1, pong)
      , c2 = new players.GodPlayer(paddle2, pong);

    pong.ball = new entities.Ball(
            game.width / 2, 
            game.height / 2,
            game.cache.getImage('ball'), 
            pong);

    pong.player1 = {
        scoreboard: scoreboard1,
        paddle: paddle1,
        controller: c1,
        side: -1
    };
    pong.player2 = {
        scoreboard: scoreboard2,
        paddle: paddle2,
        controller: c2,
        side: +1,
    };
    pong.player1.other = pong.player2;
    pong.player2.other = pong.player1;

    pong.controllers = [pong.ball, c1, c2];
     

    pong.playSound = function(key) {
        if (pong.mute) return;
        var sound = pong.sfx[key];
        if (!sound) {
            console.log('sound not found: ', key);
        } else {
            sound.play('', 0, pong.volume);
        }
    };

    game.input.onDown.add(function() {
        game.paused = !game.paused;
    });
    var muteKey = game.input.keyboard.addKey(Phaser.Keyboard.M);
    muteKey.onDown.add(function(key) {
        pong.mute = !pong.mute;
    });

    // finally...
    serve();
    c1.enable();
    c2.enable();
    pong.paused = false;
}
//1}}}


var collision;
//{{{1 update()
function update() {
    if (pong.paused) return;
    pong.controllers.forEach(function(c) {
       c.update();
    }); 
    var hitInfo = hitTest();
    if (hitInfo) {
        collision = hitInfo;
        //console.log(hitInfo);
        pong.ball.bounce(hitInfo);
        //game.paused = true;
        pong.playSound('paddlehit');
    } else {
        var scoredPlayer = checkMiss();
        if (scoredPlayer) score(scoredPlayer);
    }

}
//1}}}

// {{{1 gameplay flow 
// if the ball left the field, return the player who scores
function checkMiss() {
    if (pong.ball.sprite.right < 0) return pong.player2;
    if (pong.ball.sprite.left >= pong.game.width) return pong.player1;
}

function score(player) {
    pong.playSound('out');
    player.scoreboard.addScore();
    serve(player.other);
}

function serve(player) {
    pong.ball.reset();
    setTimeout(function() {
        pong.ball.serve(player? player.side : undefined);
    }, 1000);
}
// 1}}}

//{{{1 hitTest()
function hitTest() {
    if (pong.ball.velocity.x === 0) return false;
    // only check the paddle on the side the ball is travelling to
    var dir = pong.ball.velocity.x < 0? -1 : +1,
        player = pong.player1.side === dir? pong.player1 : pong.player2,
        ballSprite = pong.ball.sprite,
        paddleSprite = player.paddle.sprite;
    var ballPaths = [
            new Phaser.Line(
                ballSprite.left - pong.ball.velocity.x,
                ballSprite.top - pong.ball.velocity.y,
                ballSprite.left, ballSprite.top),
            new Phaser.Line(
                ballSprite.right - pong.ball.velocity.x,
                ballSprite.top - pong.ball.velocity.y,
                ballSprite.right, ballSprite.top),
            new Phaser.Line(
                ballSprite.right - pong.ball.velocity.x,
                ballSprite.bottom - pong.ball.velocity.y,
                ballSprite.right, ballSprite.bottom),
            new Phaser.Line(
                ballSprite.left - pong.ball.velocity.x,
                ballSprite.bottom - pong.ball.velocity.y,
                ballSprite.left, ballSprite.bottom)];


    var frontX = dir<0? paddleSprite.right : paddleSprite.left;
    var edge = new Phaser.Line(
            frontX, paddleSprite.top,
            frontX, paddleSprite.bottom);
    
    var result;
    for (var i = 0; i < ballPaths.length; i++) {
        result = testIntersection(ballPaths[i]);
        if (result) return result; 
    }

    function testIntersection(path) {
        var hit = path.intersects(edge, true);
        collision = {
            side: 'front', 
            dir: dir,
            ballPath: path, 
            edge: edge,
            hit: hit,
            player: player
        };
        return hit? collision : null;
    }
}
//1}}}

// {{{1 debug rendering
// render the frontal collision edge of both paddles
var edge1 = new Phaser.Line(0, 0, 0, 0), 
    edge2 = new Phaser.Line(0, 0, 0, 0);

function render() {
    if (!pong.debug) return;
    function getEdge(paddleSprite, dir, out) {
        var frontX = dir<0? paddleSprite.right : paddleSprite.left;
        out.start.set(frontX, paddleSprite.top);
        out.end.set(frontX, paddleSprite.bottom);
    }
    getEdge(pong.player1.paddle.sprite, pong.player1.side, edge1);
    getEdge(pong.player2.paddle.sprite, pong.player2.side, edge2);
    game.debug.geom(edge1, '#ff00ff');
    game.debug.geom(edge2, '#ff00ff');
    var mid1 = new Phaser.Line(
            pong.player1.paddle.sprite.left, pong.player1.paddle.sprite.centerY,
            pong.player1.paddle.sprite.right, pong.player1.paddle.sprite.centerY);
    var mid2 = new Phaser.Line(
            pong.player2.paddle.sprite.left, pong.player2.paddle.sprite.centerY,
            pong.player2.paddle.sprite.right, pong.player2.paddle.sprite.centerY);

    game.debug.geom(mid1, '#333333');
    game.debug.geom(mid2, '#333333');

    var top = 2*pong.pixel,
        bottom = game.height - 2*pong.pixel,
        left = 0,
        right = game.width;
    game.debug.geom(new Phaser.Line(left, top, right, top), '0xfff');
    game.debug.geom(new Phaser.Line(left, bottom, right, bottom), '0xfff');

    game.debug.geom(pong.ball.sprite.getBounds(), '#ff0');

    if (!collision) return;
    game.debug.geom(collision.edge, '#00ff00');
    game.debug.geom(collision.ballPath, '#0000ff');
    game.debug.geom(collision.hit, '#ff0000');
}
//1}}}

//{{{1 graphics generation
function createTextures(game, pixelSize, paddle1HeightPx, paddle2HeightPx) {
    var digitsData = [
       //----|----|----|----// 4x6
        '0000    1 2222 3333', // |
        '0  0    1    2    3', // |
        '0  0    1 2222 3333', // |
        '0  0    1 2       3', // |
        '0  0    1 2       3', // |
        '0000    1 2222 3333', // |
        '                   ', // -
        '4  4 5555 6666 7777', // |
        '4  4 5    6       7', // |
        '4444 5555 6666    7', // |
        '   4    5 6  6    7', // |
        '   4    5 6  6    7', // |
        '   4 5555 6666    7', // |
        '                   ', // -
        '8888 9999          ', // |
        '8  8 9  9   *   *  ', // |
        '8888 9999          ', // |
        '8  8    9  *     * ', // |
        '8  8    9   *****  ', // |
        '8888 9999          '];// |

    var bitmap = drawBitmap(digitsData, pixelSize, '#666')
      , frameWidth = pixelSize * 4
      , frameHeight = pixelSize * 6
      , spacing = pixelSize;

    game.cache.addSpriteSheet('digits', null, bitmap.canvas, 
            frameWidth, frameHeight, 10, 0, spacing);

    // paddle1:
    var g = game.make.graphics(0, 0);
    g.beginFill(0xffffff);
    g.drawRect(0, 0, pixelSize, paddle1HeightPx * pixelSize);
    g.endFill();
    game.cache.addImage('paddle1', null, g.generateTexture());
    g.destroy();
    
    // paddle2:
    g = game.make.graphics(0, 0);
    g.beginFill(0xffffff);
    g.drawRect(0, 0, pixelSize, paddle2HeightPx * pixelSize);
    g.endFill();
    game.cache.addImage('paddle2', null, g.generateTexture());
    g.destroy();

    // ball:
    g = game.make.graphics(0, 0);
    g.beginFill(0xffffff);
    g.drawRect(0, 0, pixelSize, pixelSize);
    g.endFill();
    game.cache.addImage('ball', null, g.generateTexture());
    g.destroy();

    // center line:
    var x = (game.width - pixelSize/2) / 2;
    g = game.add.graphics(x, 0);
    var l = 2*pixelSize;
    g.beginFill(0x666666);
    for (var y = 0; y < game.height; y += l*2) {
        g.drawRect(0, y, pixelSize/2, l);
    }
    g.endFill();
    pong.centerLine = g;
}

/**
 * Assumes data to be an array of string. 
 */
function drawBitmap(data, pixelSize, color) {
    var height = data.length * pixelSize
      , width  = data[0].length * pixelSize
      , bitmap = game.make.bitmapData(width, height)
      , pixel  = game.make.bitmapData(pixelSize, pixelSize);

    pixel.ctx.beginPath();
    pixel.ctx.rect(0, 0, pixelSize, pixelSize);
    pixel.ctx.fillStyle = color;
    pixel.ctx.fill();

    data.forEach(function(line, y) {
        line.split('').forEach(function (ch, x) {
            if (ch === ' ') return;
            bitmap.draw(pixel, x * pixelSize, y * pixelSize);
        });
    });

    return bitmap;
}
// 1}}}

},{"./entities.js":1,"./players.js":3}],3:[function(require,module,exports){
"use strict";
module.exports = {
    MouseWheelPlayer: MouseWheelPlayer,
    GodPlayer: GodPlayer,
    ComputerPlayer: ComputerPlayer,
    KeyboardPlayer: KeyboardPlayer
};

/**
 * {{{1 MouseWheelPlayer
 *
 */
function MouseWheelPlayer(paddle, pong) {
    this.paddle = paddle;
    this.pong = pong;
    this._enabled = false;
    this.wheelListener = (function(event) {
        if (this.pong.paused) return;
        if (pong.game.input.mouse.wheelDelta === Phaser.Mouse.WHEEL_UP) {
            this.wheelDelta++;
        } else if (pong.game.input.mouse.wheelDelta === Phaser.Mouse.WHEEL_DOWN) {
            this.wheelDelta--;
        } else {
            console.log('wheel did neither go up nor down?');
        }
    }).bind(this);
}

MouseWheelPlayer.prototype.enable = function() {
    if (this._enabled) return;
    this.wheelDelta = 0;
    if (this.pong.game.input.mouse.mouseWheelCallback) {
        console.log('mouseWheelCallback already registered!');
    }
    this.pong.game.input.mouse.mouseWheelCallback = this.wheelListener;
    this._enabled = true;
};

MouseWheelPlayer.prototype.disable = function() {
    if (!this._enabled) return;
    this._enabled = false;
    this.pong.game.input.mouse.mouseWheelCallback = null;
};

MouseWheelPlayer.prototype.update = function() {
    if (!this._enabled) return;
    if (this.wheelDelta === 0) return;
    var sign = this.wheelDelta < 0? -1 : +1;
    var dy = -(this.wheelDelta) * 16;
    this.paddle.move(dy);
    this.wheelDelta -= sign;
};
//1}}}


/**
 * {{{1 KeyboardPlayer
 *
 */
function KeyboardPlayer(paddle, pong) {
    this.paddle = paddle;
    this.pong = pong;
    this._enabled = false;
}

KeyboardPlayer.prototype.enable = function() {
    if (this._enabled) return;
    this._enabled = true;
};

KeyboardPlayer.prototype.disable = function() {
    if (!this._enabled) return;
    this._enabled = false;
};

KeyboardPlayer.prototype.update = function() {
    if (!this._enabled) return;
    var dy = 0;
    if (this.pong.game.input.keyboard.isDown(Phaser.Keyboard.UP)) {
        dy -= 10;
    }
    if (this.pong.game.input.keyboard.isDown(Phaser.Keyboard.DOWN)) {
        dy += 10; 
    }
    this.paddle.move(dy);
};
//1}}}

/**
 * {{{1 GodPlayer
 */
function GodPlayer(paddle, pong) {
    this.paddle = paddle;
    this.pong = pong;
    this._enabled = false;
}

GodPlayer.prototype.enable = function() {
    this._enabled = true;
};

GodPlayer.prototype.disable = function() {
    this._enabled = false;
};


GodPlayer.prototype.update = function() {
    if (!this._enabled) return;
    this.paddle.sprite.centerY = this.pong.ball.sprite.centerY;
};
//1}}}

/**
 * {{{1 ComputerPlayer
 * does not play perfect.
 */
function ComputerPlayer(paddle, pong) {
    this.paddle = paddle;
    this.pong = pong;
    this._enabled = false;
    this._tick = 0;
    this.maxSpeed = 20;
}

ComputerPlayer.prototype.enable = function() {
    this._enabled = true;
};

ComputerPlayer.prototype.disable = function() {
    this._enabled = false;
};


ComputerPlayer.prototype.update = function() {
    if (!this._enabled) return;
    // skip every eigth frame to give humans a chance
    
    var ballSprite = this.pong.ball.sprite;
    var paddleSprite = this.paddle.sprite;
    var dist = Math.abs(paddleSprite.centerY - ballSprite.centerY);
    if (ballSprite.bottom <= paddleSprite.top) {
        this.paddle.move(-this.maxSpeed);
    } else if (ballSprite.top >= paddleSprite.bottom) {
        this.paddle.move(this.maxSpeed);
    } else if (Math.floor(Math.random() * 10) === 0 && ++this._tick % 10 === 0) {
        this.paddle.move(Math.floor(Math.random() * this.maxSpeed - this.maxSpeed/2));
    }
};

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZW50aXRpZXMuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9wbGF5ZXJzLmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBIiwiZmlsZSI6ImdlbmVyYXRlZC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzQ29udGVudCI6WyIoZnVuY3Rpb24gZSh0LG4scil7ZnVuY3Rpb24gcyhvLHUpe2lmKCFuW29dKXtpZighdFtvXSl7dmFyIGE9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtpZighdSYmYSlyZXR1cm4gYShvLCEwKTtpZihpKXJldHVybiBpKG8sITApO3ZhciBmPW5ldyBFcnJvcihcIkNhbm5vdCBmaW5kIG1vZHVsZSAnXCIrbytcIidcIik7dGhyb3cgZi5jb2RlPVwiTU9EVUxFX05PVF9GT1VORFwiLGZ9dmFyIGw9bltvXT17ZXhwb3J0czp7fX07dFtvXVswXS5jYWxsKGwuZXhwb3J0cyxmdW5jdGlvbihlKXt2YXIgbj10W29dWzFdW2VdO3JldHVybiBzKG4/bjplKX0sbCxsLmV4cG9ydHMsZSx0LG4scil9cmV0dXJuIG5bb10uZXhwb3J0c312YXIgaT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2Zvcih2YXIgbz0wO288ci5sZW5ndGg7bysrKXMocltvXSk7cmV0dXJuIHN9KSIsIlwidXNlIHN0cmljdFwiO1xubW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGFkZGxlOiBQYWRkbGUsXG4gICAgU2NvcmVib2FyZDogU2NvcmVib2FyZCxcbiAgICBCYWxsOiBCYWxsXG59O1xuXG52YXIgWkVSTyA9IG5ldyBQaGFzZXIuUG9pbnQoMCwgMCk7XG5mdW5jdGlvbiBmcm9tQW5nbGUoZGVncmVlcykge1xuICAgIHZhciByYWRzID0gZGVncmVlcyAqIChNYXRoLlBJLzE4MCk7XG4gICAgcmV0dXJuIG5ldyBQaGFzZXIuUG9pbnQoTWF0aC5jb3MocmFkcyksIE1hdGguc2luKHJhZHMpKTtcbn1cblxuLyoqIFxuICoge3t7MSBQYWRkbGVcbiAqIEBwYXJhbSB4IHtudW1iZXJ9IFRoZSB4IHBvc2l0aW9uIHRvIGNyZWF0ZSB0aGUgcGFkZGxlIG9uXG4gKi9cbmZ1bmN0aW9uIFBhZGRsZSh4LCBtaW55LCBtYXh5LCB0ZXh0dXJlLCBnYW1lKSB7XG4gICAgdGhpcy5zcHJpdGUgPSBnYW1lLmFkZC5zcHJpdGUoeCwgKG1heHktbWlueSkgLyAyICsgbWlueSwgdGV4dHVyZSk7XG4gICAgdGhpcy5zcHJpdGUuYW5jaG9yLnNldCgwLjUsIDAuNSk7XG4gICAgdGhpcy5taW55ID0gbWlueSArIHRoaXMuc3ByaXRlLmhlaWdodC8yO1xuICAgIHRoaXMubWF4eSA9IG1heHkgLSB0aGlzLnNwcml0ZS5oZWlnaHQvMjtcbn1cblxuUGFkZGxlLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zcHJpdGUuZGVzdHJveSgpO1xufTtcblxuUGFkZGxlLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24oZHkpIHtcbiAgICB2YXIgeSA9IFBoYXNlci5NYXRoLmNsYW1wKHRoaXMuc3ByaXRlLnkgKyBkeSwgdGhpcy5taW55LCB0aGlzLm1heHkpO1xuICAgIHRoaXMuc3ByaXRlLnkgPSB5OyBcbn07XG5cblBhZGRsZS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY2VudGVyID0gKHRoaXMubWF4eS10aGlzLm1pbnkpIC8gMiArIHRoaXMubWlueTtcbiAgICB0aGlzLnNwcml0ZS5yZXNldCh0aGlzLnNwcml0ZS54LCBjZW50ZXIpO1xufTtcblxuUGFkZGxlLnByb3RvdHlwZS5nZXRSZWZsZWN0aW9uID0gZnVuY3Rpb24oaGl0KSB7XG4gICAgdmFyIHJlbGF0aXZlWSA9IHRoaXMuc3ByaXRlLmNlbnRlclkgLSBoaXQueTtcbiAgICB2YXIgc2lnbiA9IHJlbGF0aXZlWSA+IDA/IC0xIDogKzE7XG4gICAgdmFyIGxlZnQgPSBNYXRoLmFicyhyZWxhdGl2ZVkpO1xuICAgIHZhciBhbmdsZSA9IDA7XG4gICAgd2hpbGUgKGxlZnQgPiAwLjI1ICogdGhpcy5zcHJpdGUuaGVpZ2h0LzIpIHtcbiAgICAgICAgYW5nbGUgKz0gMTU7XG4gICAgICAgIGxlZnQgLT0gMC4yNSAqIHRoaXMuc3ByaXRlLmhlaWdodC8yO1xuICAgIH1cbiAgICByZXR1cm4gYW5nbGUgKiBzaWduO1xufTtcbi8vMX19fVxuXG4vKipcbiAqIHt7ezEgU2NvcmVib2FyZFxuICogS2VlcHMgdHJhY2sgb2Ygc2NvcmUgYW5kIGRpc3BsYXlzIGl0IHVzaW5nIHNwcml0ZXMuXG4gKi9cbmZ1bmN0aW9uIFNjb3JlYm9hcmQoeCwgeSwgc3ByaXRlLCBnYW1lKSB7XG4gICAgdGhpcy5fc3ByaXRlID0gc3ByaXRlO1xuICAgIHRoaXMuX2luaXQoeCwgeSwgZ2FtZSk7XG59XG5cblNjb3JlYm9hcmQucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oeCwgeSwgZ2FtZSkge1xuICAgIHRoaXMuX3ggPSB4O1xuICAgIHRoaXMuX3kgPSB5O1xuICAgIHRoaXMuX2RpZ2l0cyA9IGdhbWUuYWRkLmdyb3VwKCk7XG4gICAgdGhpcy5fdGVucyA9IGdhbWUuYWRkLnNwcml0ZSh4LCB5LCB0aGlzLl9zcHJpdGUsIDApO1xuICAgIHZhciBzcGFjaW5nID0gdGhpcy5fdGVucy53aWR0aCAvIDQ7XG4gICAgdGhpcy5fb25lcyA9IGdhbWUuYWRkLnNwcml0ZSh4ICsgdGhpcy5fdGVucy53aWR0aCArIHNwYWNpbmcsIHksIFxuICAgICAgICAgICAgdGhpcy5fc3ByaXRlLCAwKTtcbiAgICB0aGlzLl9kaWdpdHMuYWRkKHRoaXMuX3RlbnMpO1xuICAgIHRoaXMuX2RpZ2l0cy5hZGQodGhpcy5fb25lcyk7XG4gICAgdGhpcy5zZXRTY29yZSgwKTtcbn07XG5cblNjb3JlYm9hcmQucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl90ZW5zID0gbnVsbDtcbiAgICB0aGlzLl9vbmVzID0gbnVsbDtcbiAgICB0aGlzLl9kaWdpdHMuZGVzdHJveSgpO1xuICAgIHRoaXMuX2RpZ2l0cyA9IG51bGw7XG59O1xuXG5TY29yZWJvYXJkLnByb3RvdHlwZS5zZXRWaXNpYmxlID0gZnVuY3Rpb24odikge1xuICAgIHRoaXMuX2RpZ2l0cy52aXNpYmxlID0gdjtcbn07XG5cblNjb3JlYm9hcmQucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zZXRTY29yZSgwKTtcbn07XG5cblNjb3JlYm9hcmQucHJvdG90eXBlLnNldFNjb3JlID0gZnVuY3Rpb24oc2NvcmUpIHtcbiAgICB0aGlzLnNjb3JlID0gc2NvcmU7XG4gICAgdGhpcy5fcmVmcmVzaCgpO1xufTtcblxuU2NvcmVib2FyZC5wcm90b3R5cGUuYWRkU2NvcmUgPSBmdW5jdGlvbihuKSB7XG4gICAgdGhpcy5zY29yZSArPSBuIHx8IDE7XG4gICAgdGhpcy5fcmVmcmVzaCgpO1xufTtcblxuU2NvcmVib2FyZC5wcm90b3R5cGUuX3JlZnJlc2ggPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl90ZW5zLnZpc2libGUgPSB0aGlzLnNjb3JlID49IDEwO1xuICAgIHZhciBzY29yZSA9IHRoaXMuc2NvcmUgJSAxMDA7XG4gICAgdGhpcy5fdGVucy5mcmFtZSA9IE1hdGguZmxvb3Ioc2NvcmUgLyAxMCk7XG4gICAgdGhpcy5fb25lcy5mcmFtZSA9IHNjb3JlICUgMTA7XG59O1xuLy8xfX19XG5cblxuXG4vKipcbiAqIHt7ezEgQmFsbFxuICovXG5mdW5jdGlvbiBCYWxsKHgsIHksIHRleHR1cmUsIHBvbmcpIHtcbiAgICB0aGlzLnBvbmcgPSBwb25nO1xuICAgIHRoaXMuaW5pdGlhbFggPSB4O1xuICAgIHRoaXMuaW5pdGlhbFkgPSB5O1xuICAgIHRoaXMuc3ByaXRlID0gcG9uZy5nYW1lLmFkZC5zcHJpdGUoeCwgeSwgdGV4dHVyZSk7XG4gICAgdGhpcy5zcHJpdGUuYW5jaG9yLnNldCgwLjUsIDAuNSk7XG4gICAgdGhpcy5zcGVlZCA9IHBvbmcuc3BlZWQ7XG4gICAgdGhpcy5taW55ID0gdGhpcy5zcHJpdGUuaGVpZ2h0LzI7XG4gICAgdGhpcy5tYXh5ID0gcG9uZy5nYW1lLmhlaWdodCAtIHRoaXMuc3ByaXRlLmhlaWdodC8yIC0gMTtcbiAgICB0aGlzLnJlc2V0KCk7XG59XG5cbkJhbGwucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJhbmdlID0gdGhpcy5tYXh5IC0gdGhpcy5taW55O1xuICAgIHZhciBtaW55ID0gdGhpcy5taW55ICsgcmFuZ2UvNTtcbiAgICB2YXIgbWF4eSA9IHRoaXMubWF4eSAtIHJhbmdlLzU7XG4gICAgdmFyIHkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4eSAtIG1pbnkpKSArIG1pbnk7XG4gICAgdGhpcy5zcHJpdGUueCA9IHRoaXMuaW5pdGlhbFg7XG4gICAgdGhpcy5zcHJpdGUueSA9IHk7XG4gICAgdGhpcy52ZWxvY2l0eSA9IG5ldyBQaGFzZXIuUG9pbnQoMCwgMCk7XG59O1xuXG5CYWxsLnByb3RvdHlwZS5zZXJ2ZSA9IGZ1bmN0aW9uKHNpZGUpIHtcbiAgICBpZiAoIXNpZGUpIHNpZGUgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpPyArMSA6IC0xO1xuICAgIHZhciBhbmdsZSA9IHRoaXMucG9uZy5nYW1lLnJuZC5iZXR3ZWVuKC0xLCAxKSAqIDQ1O1xuICAgIGlmIChzaWRlIDwgMCkgYW5nbGUgKz0gMTgwO1xuICAgIHRoaXMudmVsb2NpdHkgPSBmcm9tQW5nbGUoYW5nbGUpO1xuICAgIHRoaXMudmVsb2NpdHkubm9ybWFsaXplKCkubXVsdGlwbHkodGhpcy5zcGVlZCwgdGhpcy5zcGVlZCk7XG59O1xuXG5CYWxsLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zcGVlZCA9PT0gMCB8fCB0aGlzLnZlbG9jaXR5LnggPT09IDAgKyB0aGlzLnZlbG9jaXR5LnkgPT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLnNwcml0ZS54ICs9IHRoaXMudmVsb2NpdHkueDtcbiAgICB0aGlzLnNwcml0ZS55ICs9IHRoaXMudmVsb2NpdHkueTtcblxuICAgIGlmICh0aGlzLnNwcml0ZS55IDwgdGhpcy5taW55IHx8IHRoaXMuc3ByaXRlLnkgPiB0aGlzLm1heHkpIHtcbiAgICAgICAgdGhpcy5zcHJpdGUueSA9IFBoYXNlci5NYXRoLmNsYW1wKHRoaXMuc3ByaXRlLnksIHRoaXMubWlueSwgdGhpcy5tYXh5KTtcbiAgICAgICAgdGhpcy5wb25nLnBsYXlTb3VuZCgnd2FsbGhpdCcpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMudmVsb2NpdHkueSA9IC10aGlzLnZlbG9jaXR5Lnk7XG4gICAgICAgIHRoaXMuc3ByaXRlLnkgKz0gdGhpcy52ZWxvY2l0eS55O1xuICAgIH1cbn07XG5cblxuXG5CYWxsLnByb3RvdHlwZS5ib3VuY2UgPSBmdW5jdGlvbihoaXRJbmZvKSB7XG4gICAgdmFyIHN0YXJ0VG9IaXQgPSBQaGFzZXIuUG9pbnQuc3VidHJhY3QoXG4gICAgICAgICAgICBoaXRJbmZvLmJhbGxQYXRoLmVuZCxcbiAgICAgICAgICAgIGhpdEluZm8uaGl0KTtcbiAgICB2YXIgbW92ZUJhY2sgPSBQaGFzZXIuUG9pbnQubm9ybWFsaXplKHRoaXMudmVsb2NpdHkpO1xuICAgIG1vdmVCYWNrID0gUGhhc2VyLlBvaW50Lm5lZ2F0aXZlKG1vdmVCYWNrLCBtb3ZlQmFjayk7XG4gICAgbW92ZUJhY2suc2V0TWFnbml0dWRlKHN0YXJ0VG9IaXQuZ2V0TWFnbml0dWRlKCkpO1xuICAgIHRoaXMuc3ByaXRlLnggPSBoaXRJbmZvLmJhbGxQYXRoLnN0YXJ0LnggKyBtb3ZlQmFjay54O1xuICAgIHRoaXMuc3ByaXRlLnkgPSBoaXRJbmZvLmJhbGxQYXRoLnN0YXJ0LnkgKyBtb3ZlQmFjay55O1xuICAgIGlmIChoaXRJbmZvLnNpZGUgIT09ICdmcm9udCcpIHtcbiAgICAgICAgdGhpcy52ZWxvY2l0eS55ID0gLXRoaXMudmVsb2NpdHkueTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgc3BlZWQgPSB0aGlzLnZlbG9jaXR5LmdldE1hZ25pdHVkZSgpO1xuICAgICAgICB2YXIgZGVncmVlcyA9IGhpdEluZm8ucGxheWVyLnBhZGRsZS5nZXRSZWZsZWN0aW9uKGhpdEluZm8uaGl0KTtcbiAgICAgICAgdmFyIHNwZWVkRmFjdG9yID0gZGVncmVlcz8gMS4wNSA6IDAuOTU7XG4gICAgICAgIHZhciB2ZWMgPSBmcm9tQW5nbGUoZGVncmVlcykuc2V0TWFnbml0dWRlKHNwZWVkICogc3BlZWRGYWN0b3IpO1xuICAgICAgICAgICAgaWYgKHRoaXMudmVsb2NpdHkueCA+IDApIHZlYy54ICo9IC0xO1xuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gdmVjO1xuICAgIH1cbn07XG5cbi8vMX19fVxuIiwiLy8ge3t7MSBEb21pbmlrJ3MgYXdlc29tZSBQb25nIGNsb25lXG4vL1xuLy8gcmVwb3NpdG9yeTogIGh0dHBzOi8vZ2l0aHViLmNvbS9saW5jb3JlODEvUGhhc2VyUG9uZ1xuLy8gcGxheTogICAgICAgIGh0dHBzOi8vbGluY29yZTgxLmdpdGh1Yi5pby9QaGFzZXJQb25nXG4vLyBcbi8vIENvcHlyaWdodCAoYykgMjAxNiBEb21pbmlrIFJvc2VobmFsXG4vLyBcbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2Zcbi8vIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbi8vIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG9cbi8vIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4vLyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbi8vIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vIFxuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4vLyBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy8gXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuLy8gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkdcbi8vIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVJcbi8vIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbi8vIDF9fX1cblwidXNlIHN0cmljdFwiO1xuXG52YXIgZW50aXRpZXMgPSByZXF1aXJlKCcuL2VudGl0aWVzLmpzJyk7XG52YXIgcGxheWVycyA9IHJlcXVpcmUoJy4vcGxheWVycy5qcycpO1xuXG52YXIgcG9uZyA9IG1haW4oKTtcbnZhciBnYW1lID0gcG9uZy5nYW1lO1xuXG4vL3t7ezEgbWFpbigpXG5mdW5jdGlvbiBtYWluKCkge1xuICAgIHZhciBwb25nID0ge307XG4gICAgcG9uZy5wYXVzZSA9IGZhbHNlO1xuICAgIHZhciBzdGF0ZSA9IHtwcmVsb2FkOiBwcmVsb2FkLCBjcmVhdGU6IGNyZWF0ZSwgdXBkYXRlOiB1cGRhdGV9O1xuICAgIHBvbmcuc3RhdGUgPSBzdGF0ZTtcbiAgICBwb25nLmdhbWUgPSBuZXcgUGhhc2VyLkdhbWUoODAwLCA0ODAsIFBoYXNlci5DQU5WQVMsICdwb25nJywgc3RhdGUpO1xuICAgIHBvbmcuY29udHJvbGxlcnMgPSBbXTtcbiAgICBwb25nLmRlYnVnID0gZmFsc2U7XG4gICAgd2luZG93LnBvbmcgPSBwb25nO1xuICAgIHdpbmRvdy5nYW1lID0gcG9uZy5nYW1lO1xuICAgIHJldHVybiBwb25nO1xufVxuLy8xfX19XG5cbi8ve3t7MSBwcmVsb2FkKClcbmZ1bmN0aW9uIHByZWxvYWQoKSB7XG4gICAgLy9nYW1lLmxvYWQuc3ByaXRlc2hlZXQoJ2RpZ2l0cycsICdpbWcvZGlnaXRzLnBuZycsIDY0LCA2NCk7XG4gICAgZ2FtZS5sb2FkLmF1ZGlvKCd3YWxsaGl0JywgJ3NvdW5kL3dhbGxoaXQubXAzJyk7XG4gICAgZ2FtZS5sb2FkLmF1ZGlvKCdwYWRkbGVoaXQnLCAnc291bmQvcGFkZGxlaGl0Lm1wMycpO1xuICAgIGdhbWUubG9hZC5hdWRpbygnb3V0JywgJ3NvdW5kL291dC5tcDMnKTtcbn1cbi8vMX19fVxuXG4vLyB7e3sxIGNyZWF0ZSgpXG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gICAgcG9uZy5waXhlbCA9IDg7XG4gICAgY3JlYXRlVGV4dHVyZXMoZ2FtZSwgcG9uZy5waXhlbCwgNCwgNCk7XG4gICAgcG9uZy5zZnggPSB7XG4gICAgICAgIHdhbGxoaXQ6IGdhbWUuYWRkLmF1ZGlvKCd3YWxsaGl0JyksXG4gICAgICAgIHBhZGRsZWhpdDogZ2FtZS5hZGQuYXVkaW8oJ3BhZGRsZWhpdCcpLFxuICAgICAgICBvdXQ6IGdhbWUuYWRkLmF1ZGlvKCdvdXQnKVxuICAgIH07XG4gICAgcG9uZy5tdXRlID0gZmFsc2U7XG4gICAgcG9uZy52b2x1bWUgPSAwLjA1O1xuICAgIHBvbmcucGF1c2VkID0gdHJ1ZTtcbiAgICBwb25nLnNwZWVkID0gODtcblxuICAgIHZhciB0b3AgPSAyICogcG9uZy5waXhlbFxuICAgICAgLCBib3R0b20gPSBnYW1lLmhlaWdodCAtIDIqcG9uZy5waXhlbFxuICAgICAgLCBsZWZ0ID0gMTAwXG4gICAgICAsIHJpZ2h0ID0gZ2FtZS53aWR0aCAtIDEwMFxuXG4gICAgICAsIHNjb3JlYm9hcmQxID0gbmV3IGVudGl0aWVzLlNjb3JlYm9hcmQoXG4gICAgICAgICAgICAgICAgICAgIGdhbWUud2lkdGggLyA0LCBcbiAgICAgICAgICAgICAgICAgICAgdG9wLCBcbiAgICAgICAgICAgICAgICAgICAgJ2RpZ2l0cycsXG4gICAgICAgICAgICAgICAgICAgIGdhbWUpXG4gICAgICAsIHNjb3JlYm9hcmQyID0gbmV3IGVudGl0aWVzLlNjb3JlYm9hcmQoXG4gICAgICAgICAgICAgICAgICAgIGdhbWUud2lkdGggLyA0ICogMyAtIDEyOCwgXG4gICAgICAgICAgICAgICAgICAgIHRvcCwgXG4gICAgICAgICAgICAgICAgICAgICdkaWdpdHMnLFxuICAgICAgICAgICAgICAgICAgICBnYW1lKVxuICAgICAgLCBwYWRkbGUxID0gbmV3IGVudGl0aWVzLlBhZGRsZShcbiAgICAgICAgICAgICAgICAgICAgbGVmdCwgdG9wLCBib3R0b20sIFxuICAgICAgICAgICAgICAgICAgICBnYW1lLmNhY2hlLmdldEltYWdlKCdwYWRkbGUxJyksIFxuICAgICAgICAgICAgICAgICAgICBnYW1lKVxuICAgICAgLCBwYWRkbGUyID0gbmV3IGVudGl0aWVzLlBhZGRsZShcbiAgICAgICAgICAgICAgICAgICAgcmlnaHQsIHRvcCwgYm90dG9tLCBcbiAgICAgICAgICAgICAgICAgICAgZ2FtZS5jYWNoZS5nZXRJbWFnZSgncGFkZGxlMicpLCBcbiAgICAgICAgICAgICAgICAgICAgZ2FtZSlcbiAgICAgICwgYzEgPSBuZXcgcGxheWVycy5LZXlib2FyZFBsYXllcihwYWRkbGUxLCBwb25nKVxuICAgICAgLCBjMiA9IG5ldyBwbGF5ZXJzLkdvZFBsYXllcihwYWRkbGUyLCBwb25nKTtcblxuICAgIHBvbmcuYmFsbCA9IG5ldyBlbnRpdGllcy5CYWxsKFxuICAgICAgICAgICAgZ2FtZS53aWR0aCAvIDIsIFxuICAgICAgICAgICAgZ2FtZS5oZWlnaHQgLyAyLFxuICAgICAgICAgICAgZ2FtZS5jYWNoZS5nZXRJbWFnZSgnYmFsbCcpLCBcbiAgICAgICAgICAgIHBvbmcpO1xuXG4gICAgcG9uZy5wbGF5ZXIxID0ge1xuICAgICAgICBzY29yZWJvYXJkOiBzY29yZWJvYXJkMSxcbiAgICAgICAgcGFkZGxlOiBwYWRkbGUxLFxuICAgICAgICBjb250cm9sbGVyOiBjMSxcbiAgICAgICAgc2lkZTogLTFcbiAgICB9O1xuICAgIHBvbmcucGxheWVyMiA9IHtcbiAgICAgICAgc2NvcmVib2FyZDogc2NvcmVib2FyZDIsXG4gICAgICAgIHBhZGRsZTogcGFkZGxlMixcbiAgICAgICAgY29udHJvbGxlcjogYzIsXG4gICAgICAgIHNpZGU6ICsxLFxuICAgIH07XG4gICAgcG9uZy5wbGF5ZXIxLm90aGVyID0gcG9uZy5wbGF5ZXIyO1xuICAgIHBvbmcucGxheWVyMi5vdGhlciA9IHBvbmcucGxheWVyMTtcblxuICAgIHBvbmcuY29udHJvbGxlcnMgPSBbcG9uZy5iYWxsLCBjMSwgYzJdO1xuICAgICBcblxuICAgIHBvbmcucGxheVNvdW5kID0gZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIGlmIChwb25nLm11dGUpIHJldHVybjtcbiAgICAgICAgdmFyIHNvdW5kID0gcG9uZy5zZnhba2V5XTtcbiAgICAgICAgaWYgKCFzb3VuZCkge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3NvdW5kIG5vdCBmb3VuZDogJywga2V5KTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHNvdW5kLnBsYXkoJycsIDAsIHBvbmcudm9sdW1lKTtcbiAgICAgICAgfVxuICAgIH07XG5cbiAgICBnYW1lLmlucHV0Lm9uRG93bi5hZGQoZnVuY3Rpb24oKSB7XG4gICAgICAgIGdhbWUucGF1c2VkID0gIWdhbWUucGF1c2VkO1xuICAgIH0pO1xuICAgIHZhciBtdXRlS2V5ID0gZ2FtZS5pbnB1dC5rZXlib2FyZC5hZGRLZXkoUGhhc2VyLktleWJvYXJkLk0pO1xuICAgIG11dGVLZXkub25Eb3duLmFkZChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgcG9uZy5tdXRlID0gIXBvbmcubXV0ZTtcbiAgICB9KTtcblxuICAgIC8vIGZpbmFsbHkuLi5cbiAgICBzZXJ2ZSgpO1xuICAgIGMxLmVuYWJsZSgpO1xuICAgIGMyLmVuYWJsZSgpO1xuICAgIHBvbmcucGF1c2VkID0gZmFsc2U7XG59XG4vLzF9fX1cblxuXG52YXIgY29sbGlzaW9uO1xuLy97e3sxIHVwZGF0ZSgpXG5mdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgaWYgKHBvbmcucGF1c2VkKSByZXR1cm47XG4gICAgcG9uZy5jb250cm9sbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGMpIHtcbiAgICAgICBjLnVwZGF0ZSgpO1xuICAgIH0pOyBcbiAgICB2YXIgaGl0SW5mbyA9IGhpdFRlc3QoKTtcbiAgICBpZiAoaGl0SW5mbykge1xuICAgICAgICBjb2xsaXNpb24gPSBoaXRJbmZvO1xuICAgICAgICAvL2NvbnNvbGUubG9nKGhpdEluZm8pO1xuICAgICAgICBwb25nLmJhbGwuYm91bmNlKGhpdEluZm8pO1xuICAgICAgICAvL2dhbWUucGF1c2VkID0gdHJ1ZTtcbiAgICAgICAgcG9uZy5wbGF5U291bmQoJ3BhZGRsZWhpdCcpO1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBzY29yZWRQbGF5ZXIgPSBjaGVja01pc3MoKTtcbiAgICAgICAgaWYgKHNjb3JlZFBsYXllcikgc2NvcmUoc2NvcmVkUGxheWVyKTtcbiAgICB9XG5cbn1cbi8vMX19fVxuXG4vLyB7e3sxIGdhbWVwbGF5IGZsb3cgXG4vLyBpZiB0aGUgYmFsbCBsZWZ0IHRoZSBmaWVsZCwgcmV0dXJuIHRoZSBwbGF5ZXIgd2hvIHNjb3Jlc1xuZnVuY3Rpb24gY2hlY2tNaXNzKCkge1xuICAgIGlmIChwb25nLmJhbGwuc3ByaXRlLnJpZ2h0IDwgMCkgcmV0dXJuIHBvbmcucGxheWVyMjtcbiAgICBpZiAocG9uZy5iYWxsLnNwcml0ZS5sZWZ0ID49IHBvbmcuZ2FtZS53aWR0aCkgcmV0dXJuIHBvbmcucGxheWVyMTtcbn1cblxuZnVuY3Rpb24gc2NvcmUocGxheWVyKSB7XG4gICAgcG9uZy5wbGF5U291bmQoJ291dCcpO1xuICAgIHBsYXllci5zY29yZWJvYXJkLmFkZFNjb3JlKCk7XG4gICAgc2VydmUocGxheWVyLm90aGVyKTtcbn1cblxuZnVuY3Rpb24gc2VydmUocGxheWVyKSB7XG4gICAgcG9uZy5iYWxsLnJlc2V0KCk7XG4gICAgc2V0VGltZW91dChmdW5jdGlvbigpIHtcbiAgICAgICAgcG9uZy5iYWxsLnNlcnZlKHBsYXllcj8gcGxheWVyLnNpZGUgOiB1bmRlZmluZWQpO1xuICAgIH0sIDEwMDApO1xufVxuLy8gMX19fVxuXG4vL3t7ezEgaGl0VGVzdCgpXG5mdW5jdGlvbiBoaXRUZXN0KCkge1xuICAgIGlmIChwb25nLmJhbGwudmVsb2NpdHkueCA9PT0gMCkgcmV0dXJuIGZhbHNlO1xuICAgIC8vIG9ubHkgY2hlY2sgdGhlIHBhZGRsZSBvbiB0aGUgc2lkZSB0aGUgYmFsbCBpcyB0cmF2ZWxsaW5nIHRvXG4gICAgdmFyIGRpciA9IHBvbmcuYmFsbC52ZWxvY2l0eS54IDwgMD8gLTEgOiArMSxcbiAgICAgICAgcGxheWVyID0gcG9uZy5wbGF5ZXIxLnNpZGUgPT09IGRpcj8gcG9uZy5wbGF5ZXIxIDogcG9uZy5wbGF5ZXIyLFxuICAgICAgICBiYWxsU3ByaXRlID0gcG9uZy5iYWxsLnNwcml0ZSxcbiAgICAgICAgcGFkZGxlU3ByaXRlID0gcGxheWVyLnBhZGRsZS5zcHJpdGU7XG4gICAgdmFyIGJhbGxQYXRocyA9IFtcbiAgICAgICAgICAgIG5ldyBQaGFzZXIuTGluZShcbiAgICAgICAgICAgICAgICBiYWxsU3ByaXRlLmxlZnQgLSBwb25nLmJhbGwudmVsb2NpdHkueCxcbiAgICAgICAgICAgICAgICBiYWxsU3ByaXRlLnRvcCAtIHBvbmcuYmFsbC52ZWxvY2l0eS55LFxuICAgICAgICAgICAgICAgIGJhbGxTcHJpdGUubGVmdCwgYmFsbFNwcml0ZS50b3ApLFxuICAgICAgICAgICAgbmV3IFBoYXNlci5MaW5lKFxuICAgICAgICAgICAgICAgIGJhbGxTcHJpdGUucmlnaHQgLSBwb25nLmJhbGwudmVsb2NpdHkueCxcbiAgICAgICAgICAgICAgICBiYWxsU3ByaXRlLnRvcCAtIHBvbmcuYmFsbC52ZWxvY2l0eS55LFxuICAgICAgICAgICAgICAgIGJhbGxTcHJpdGUucmlnaHQsIGJhbGxTcHJpdGUudG9wKSxcbiAgICAgICAgICAgIG5ldyBQaGFzZXIuTGluZShcbiAgICAgICAgICAgICAgICBiYWxsU3ByaXRlLnJpZ2h0IC0gcG9uZy5iYWxsLnZlbG9jaXR5LngsXG4gICAgICAgICAgICAgICAgYmFsbFNwcml0ZS5ib3R0b20gLSBwb25nLmJhbGwudmVsb2NpdHkueSxcbiAgICAgICAgICAgICAgICBiYWxsU3ByaXRlLnJpZ2h0LCBiYWxsU3ByaXRlLmJvdHRvbSksXG4gICAgICAgICAgICBuZXcgUGhhc2VyLkxpbmUoXG4gICAgICAgICAgICAgICAgYmFsbFNwcml0ZS5sZWZ0IC0gcG9uZy5iYWxsLnZlbG9jaXR5LngsXG4gICAgICAgICAgICAgICAgYmFsbFNwcml0ZS5ib3R0b20gLSBwb25nLmJhbGwudmVsb2NpdHkueSxcbiAgICAgICAgICAgICAgICBiYWxsU3ByaXRlLmxlZnQsIGJhbGxTcHJpdGUuYm90dG9tKV07XG5cblxuICAgIHZhciBmcm9udFggPSBkaXI8MD8gcGFkZGxlU3ByaXRlLnJpZ2h0IDogcGFkZGxlU3ByaXRlLmxlZnQ7XG4gICAgdmFyIGVkZ2UgPSBuZXcgUGhhc2VyLkxpbmUoXG4gICAgICAgICAgICBmcm9udFgsIHBhZGRsZVNwcml0ZS50b3AsXG4gICAgICAgICAgICBmcm9udFgsIHBhZGRsZVNwcml0ZS5ib3R0b20pO1xuICAgIFxuICAgIHZhciByZXN1bHQ7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBiYWxsUGF0aHMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcmVzdWx0ID0gdGVzdEludGVyc2VjdGlvbihiYWxsUGF0aHNbaV0pO1xuICAgICAgICBpZiAocmVzdWx0KSByZXR1cm4gcmVzdWx0OyBcbiAgICB9XG5cbiAgICBmdW5jdGlvbiB0ZXN0SW50ZXJzZWN0aW9uKHBhdGgpIHtcbiAgICAgICAgdmFyIGhpdCA9IHBhdGguaW50ZXJzZWN0cyhlZGdlLCB0cnVlKTtcbiAgICAgICAgY29sbGlzaW9uID0ge1xuICAgICAgICAgICAgc2lkZTogJ2Zyb250JywgXG4gICAgICAgICAgICBkaXI6IGRpcixcbiAgICAgICAgICAgIGJhbGxQYXRoOiBwYXRoLCBcbiAgICAgICAgICAgIGVkZ2U6IGVkZ2UsXG4gICAgICAgICAgICBoaXQ6IGhpdCxcbiAgICAgICAgICAgIHBsYXllcjogcGxheWVyXG4gICAgICAgIH07XG4gICAgICAgIHJldHVybiBoaXQ/IGNvbGxpc2lvbiA6IG51bGw7XG4gICAgfVxufVxuLy8xfX19XG5cbi8vIHt7ezEgZGVidWcgcmVuZGVyaW5nXG4vLyByZW5kZXIgdGhlIGZyb250YWwgY29sbGlzaW9uIGVkZ2Ugb2YgYm90aCBwYWRkbGVzXG52YXIgZWRnZTEgPSBuZXcgUGhhc2VyLkxpbmUoMCwgMCwgMCwgMCksIFxuICAgIGVkZ2UyID0gbmV3IFBoYXNlci5MaW5lKDAsIDAsIDAsIDApO1xuXG5mdW5jdGlvbiByZW5kZXIoKSB7XG4gICAgaWYgKCFwb25nLmRlYnVnKSByZXR1cm47XG4gICAgZnVuY3Rpb24gZ2V0RWRnZShwYWRkbGVTcHJpdGUsIGRpciwgb3V0KSB7XG4gICAgICAgIHZhciBmcm9udFggPSBkaXI8MD8gcGFkZGxlU3ByaXRlLnJpZ2h0IDogcGFkZGxlU3ByaXRlLmxlZnQ7XG4gICAgICAgIG91dC5zdGFydC5zZXQoZnJvbnRYLCBwYWRkbGVTcHJpdGUudG9wKTtcbiAgICAgICAgb3V0LmVuZC5zZXQoZnJvbnRYLCBwYWRkbGVTcHJpdGUuYm90dG9tKTtcbiAgICB9XG4gICAgZ2V0RWRnZShwb25nLnBsYXllcjEucGFkZGxlLnNwcml0ZSwgcG9uZy5wbGF5ZXIxLnNpZGUsIGVkZ2UxKTtcbiAgICBnZXRFZGdlKHBvbmcucGxheWVyMi5wYWRkbGUuc3ByaXRlLCBwb25nLnBsYXllcjIuc2lkZSwgZWRnZTIpO1xuICAgIGdhbWUuZGVidWcuZ2VvbShlZGdlMSwgJyNmZjAwZmYnKTtcbiAgICBnYW1lLmRlYnVnLmdlb20oZWRnZTIsICcjZmYwMGZmJyk7XG4gICAgdmFyIG1pZDEgPSBuZXcgUGhhc2VyLkxpbmUoXG4gICAgICAgICAgICBwb25nLnBsYXllcjEucGFkZGxlLnNwcml0ZS5sZWZ0LCBwb25nLnBsYXllcjEucGFkZGxlLnNwcml0ZS5jZW50ZXJZLFxuICAgICAgICAgICAgcG9uZy5wbGF5ZXIxLnBhZGRsZS5zcHJpdGUucmlnaHQsIHBvbmcucGxheWVyMS5wYWRkbGUuc3ByaXRlLmNlbnRlclkpO1xuICAgIHZhciBtaWQyID0gbmV3IFBoYXNlci5MaW5lKFxuICAgICAgICAgICAgcG9uZy5wbGF5ZXIyLnBhZGRsZS5zcHJpdGUubGVmdCwgcG9uZy5wbGF5ZXIyLnBhZGRsZS5zcHJpdGUuY2VudGVyWSxcbiAgICAgICAgICAgIHBvbmcucGxheWVyMi5wYWRkbGUuc3ByaXRlLnJpZ2h0LCBwb25nLnBsYXllcjIucGFkZGxlLnNwcml0ZS5jZW50ZXJZKTtcblxuICAgIGdhbWUuZGVidWcuZ2VvbShtaWQxLCAnIzMzMzMzMycpO1xuICAgIGdhbWUuZGVidWcuZ2VvbShtaWQyLCAnIzMzMzMzMycpO1xuXG4gICAgdmFyIHRvcCA9IDIqcG9uZy5waXhlbCxcbiAgICAgICAgYm90dG9tID0gZ2FtZS5oZWlnaHQgLSAyKnBvbmcucGl4ZWwsXG4gICAgICAgIGxlZnQgPSAwLFxuICAgICAgICByaWdodCA9IGdhbWUud2lkdGg7XG4gICAgZ2FtZS5kZWJ1Zy5nZW9tKG5ldyBQaGFzZXIuTGluZShsZWZ0LCB0b3AsIHJpZ2h0LCB0b3ApLCAnMHhmZmYnKTtcbiAgICBnYW1lLmRlYnVnLmdlb20obmV3IFBoYXNlci5MaW5lKGxlZnQsIGJvdHRvbSwgcmlnaHQsIGJvdHRvbSksICcweGZmZicpO1xuXG4gICAgZ2FtZS5kZWJ1Zy5nZW9tKHBvbmcuYmFsbC5zcHJpdGUuZ2V0Qm91bmRzKCksICcjZmYwJyk7XG5cbiAgICBpZiAoIWNvbGxpc2lvbikgcmV0dXJuO1xuICAgIGdhbWUuZGVidWcuZ2VvbShjb2xsaXNpb24uZWRnZSwgJyMwMGZmMDAnKTtcbiAgICBnYW1lLmRlYnVnLmdlb20oY29sbGlzaW9uLmJhbGxQYXRoLCAnIzAwMDBmZicpO1xuICAgIGdhbWUuZGVidWcuZ2VvbShjb2xsaXNpb24uaGl0LCAnI2ZmMDAwMCcpO1xufVxuLy8xfX19XG5cbi8ve3t7MSBncmFwaGljcyBnZW5lcmF0aW9uXG5mdW5jdGlvbiBjcmVhdGVUZXh0dXJlcyhnYW1lLCBwaXhlbFNpemUsIHBhZGRsZTFIZWlnaHRQeCwgcGFkZGxlMkhlaWdodFB4KSB7XG4gICAgdmFyIGRpZ2l0c0RhdGEgPSBbXG4gICAgICAgLy8tLS0tfC0tLS18LS0tLXwtLS0tLy8gNHg2XG4gICAgICAgICcwMDAwICAgIDEgMjIyMiAzMzMzJywgLy8gfFxuICAgICAgICAnMCAgMCAgICAxICAgIDIgICAgMycsIC8vIHxcbiAgICAgICAgJzAgIDAgICAgMSAyMjIyIDMzMzMnLCAvLyB8XG4gICAgICAgICcwICAwICAgIDEgMiAgICAgICAzJywgLy8gfFxuICAgICAgICAnMCAgMCAgICAxIDIgICAgICAgMycsIC8vIHxcbiAgICAgICAgJzAwMDAgICAgMSAyMjIyIDMzMzMnLCAvLyB8XG4gICAgICAgICcgICAgICAgICAgICAgICAgICAgJywgLy8gLVxuICAgICAgICAnNCAgNCA1NTU1IDY2NjYgNzc3NycsIC8vIHxcbiAgICAgICAgJzQgIDQgNSAgICA2ICAgICAgIDcnLCAvLyB8XG4gICAgICAgICc0NDQ0IDU1NTUgNjY2NiAgICA3JywgLy8gfFxuICAgICAgICAnICAgNCAgICA1IDYgIDYgICAgNycsIC8vIHxcbiAgICAgICAgJyAgIDQgICAgNSA2ICA2ICAgIDcnLCAvLyB8XG4gICAgICAgICcgICA0IDU1NTUgNjY2NiAgICA3JywgLy8gfFxuICAgICAgICAnICAgICAgICAgICAgICAgICAgICcsIC8vIC1cbiAgICAgICAgJzg4ODggOTk5OSAgICAgICAgICAnLCAvLyB8XG4gICAgICAgICc4ICA4IDkgIDkgICAqICAgKiAgJywgLy8gfFxuICAgICAgICAnODg4OCA5OTk5ICAgICAgICAgICcsIC8vIHxcbiAgICAgICAgJzggIDggICAgOSAgKiAgICAgKiAnLCAvLyB8XG4gICAgICAgICc4ICA4ICAgIDkgICAqKioqKiAgJywgLy8gfFxuICAgICAgICAnODg4OCA5OTk5ICAgICAgICAgICddOy8vIHxcblxuICAgIHZhciBiaXRtYXAgPSBkcmF3Qml0bWFwKGRpZ2l0c0RhdGEsIHBpeGVsU2l6ZSwgJyM2NjYnKVxuICAgICAgLCBmcmFtZVdpZHRoID0gcGl4ZWxTaXplICogNFxuICAgICAgLCBmcmFtZUhlaWdodCA9IHBpeGVsU2l6ZSAqIDZcbiAgICAgICwgc3BhY2luZyA9IHBpeGVsU2l6ZTtcblxuICAgIGdhbWUuY2FjaGUuYWRkU3ByaXRlU2hlZXQoJ2RpZ2l0cycsIG51bGwsIGJpdG1hcC5jYW52YXMsIFxuICAgICAgICAgICAgZnJhbWVXaWR0aCwgZnJhbWVIZWlnaHQsIDEwLCAwLCBzcGFjaW5nKTtcblxuICAgIC8vIHBhZGRsZTE6XG4gICAgdmFyIGcgPSBnYW1lLm1ha2UuZ3JhcGhpY3MoMCwgMCk7XG4gICAgZy5iZWdpbkZpbGwoMHhmZmZmZmYpO1xuICAgIGcuZHJhd1JlY3QoMCwgMCwgcGl4ZWxTaXplLCBwYWRkbGUxSGVpZ2h0UHggKiBwaXhlbFNpemUpO1xuICAgIGcuZW5kRmlsbCgpO1xuICAgIGdhbWUuY2FjaGUuYWRkSW1hZ2UoJ3BhZGRsZTEnLCBudWxsLCBnLmdlbmVyYXRlVGV4dHVyZSgpKTtcbiAgICBnLmRlc3Ryb3koKTtcbiAgICBcbiAgICAvLyBwYWRkbGUyOlxuICAgIGcgPSBnYW1lLm1ha2UuZ3JhcGhpY3MoMCwgMCk7XG4gICAgZy5iZWdpbkZpbGwoMHhmZmZmZmYpO1xuICAgIGcuZHJhd1JlY3QoMCwgMCwgcGl4ZWxTaXplLCBwYWRkbGUySGVpZ2h0UHggKiBwaXhlbFNpemUpO1xuICAgIGcuZW5kRmlsbCgpO1xuICAgIGdhbWUuY2FjaGUuYWRkSW1hZ2UoJ3BhZGRsZTInLCBudWxsLCBnLmdlbmVyYXRlVGV4dHVyZSgpKTtcbiAgICBnLmRlc3Ryb3koKTtcblxuICAgIC8vIGJhbGw6XG4gICAgZyA9IGdhbWUubWFrZS5ncmFwaGljcygwLCAwKTtcbiAgICBnLmJlZ2luRmlsbCgweGZmZmZmZik7XG4gICAgZy5kcmF3UmVjdCgwLCAwLCBwaXhlbFNpemUsIHBpeGVsU2l6ZSk7XG4gICAgZy5lbmRGaWxsKCk7XG4gICAgZ2FtZS5jYWNoZS5hZGRJbWFnZSgnYmFsbCcsIG51bGwsIGcuZ2VuZXJhdGVUZXh0dXJlKCkpO1xuICAgIGcuZGVzdHJveSgpO1xuXG4gICAgLy8gY2VudGVyIGxpbmU6XG4gICAgdmFyIHggPSAoZ2FtZS53aWR0aCAtIHBpeGVsU2l6ZS8yKSAvIDI7XG4gICAgZyA9IGdhbWUuYWRkLmdyYXBoaWNzKHgsIDApO1xuICAgIHZhciBsID0gMipwaXhlbFNpemU7XG4gICAgZy5iZWdpbkZpbGwoMHg2NjY2NjYpO1xuICAgIGZvciAodmFyIHkgPSAwOyB5IDwgZ2FtZS5oZWlnaHQ7IHkgKz0gbCoyKSB7XG4gICAgICAgIGcuZHJhd1JlY3QoMCwgeSwgcGl4ZWxTaXplLzIsIGwpO1xuICAgIH1cbiAgICBnLmVuZEZpbGwoKTtcbiAgICBwb25nLmNlbnRlckxpbmUgPSBnO1xufVxuXG4vKipcbiAqIEFzc3VtZXMgZGF0YSB0byBiZSBhbiBhcnJheSBvZiBzdHJpbmcuIFxuICovXG5mdW5jdGlvbiBkcmF3Qml0bWFwKGRhdGEsIHBpeGVsU2l6ZSwgY29sb3IpIHtcbiAgICB2YXIgaGVpZ2h0ID0gZGF0YS5sZW5ndGggKiBwaXhlbFNpemVcbiAgICAgICwgd2lkdGggID0gZGF0YVswXS5sZW5ndGggKiBwaXhlbFNpemVcbiAgICAgICwgYml0bWFwID0gZ2FtZS5tYWtlLmJpdG1hcERhdGEod2lkdGgsIGhlaWdodClcbiAgICAgICwgcGl4ZWwgID0gZ2FtZS5tYWtlLmJpdG1hcERhdGEocGl4ZWxTaXplLCBwaXhlbFNpemUpO1xuXG4gICAgcGl4ZWwuY3R4LmJlZ2luUGF0aCgpO1xuICAgIHBpeGVsLmN0eC5yZWN0KDAsIDAsIHBpeGVsU2l6ZSwgcGl4ZWxTaXplKTtcbiAgICBwaXhlbC5jdHguZmlsbFN0eWxlID0gY29sb3I7XG4gICAgcGl4ZWwuY3R4LmZpbGwoKTtcblxuICAgIGRhdGEuZm9yRWFjaChmdW5jdGlvbihsaW5lLCB5KSB7XG4gICAgICAgIGxpbmUuc3BsaXQoJycpLmZvckVhY2goZnVuY3Rpb24gKGNoLCB4KSB7XG4gICAgICAgICAgICBpZiAoY2ggPT09ICcgJykgcmV0dXJuO1xuICAgICAgICAgICAgYml0bWFwLmRyYXcocGl4ZWwsIHggKiBwaXhlbFNpemUsIHkgKiBwaXhlbFNpemUpO1xuICAgICAgICB9KTtcbiAgICB9KTtcblxuICAgIHJldHVybiBiaXRtYXA7XG59XG4vLyAxfX19XG4iLCJcInVzZSBzdHJpY3RcIjtcbm1vZHVsZS5leHBvcnRzID0ge1xuICAgIE1vdXNlV2hlZWxQbGF5ZXI6IE1vdXNlV2hlZWxQbGF5ZXIsXG4gICAgR29kUGxheWVyOiBHb2RQbGF5ZXIsXG4gICAgQ29tcHV0ZXJQbGF5ZXI6IENvbXB1dGVyUGxheWVyLFxuICAgIEtleWJvYXJkUGxheWVyOiBLZXlib2FyZFBsYXllclxufTtcblxuLyoqXG4gKiB7e3sxIE1vdXNlV2hlZWxQbGF5ZXJcbiAqXG4gKi9cbmZ1bmN0aW9uIE1vdXNlV2hlZWxQbGF5ZXIocGFkZGxlLCBwb25nKSB7XG4gICAgdGhpcy5wYWRkbGUgPSBwYWRkbGU7XG4gICAgdGhpcy5wb25nID0gcG9uZztcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG4gICAgdGhpcy53aGVlbExpc3RlbmVyID0gKGZ1bmN0aW9uKGV2ZW50KSB7XG4gICAgICAgIGlmICh0aGlzLnBvbmcucGF1c2VkKSByZXR1cm47XG4gICAgICAgIGlmIChwb25nLmdhbWUuaW5wdXQubW91c2Uud2hlZWxEZWx0YSA9PT0gUGhhc2VyLk1vdXNlLldIRUVMX1VQKSB7XG4gICAgICAgICAgICB0aGlzLndoZWVsRGVsdGErKztcbiAgICAgICAgfSBlbHNlIGlmIChwb25nLmdhbWUuaW5wdXQubW91c2Uud2hlZWxEZWx0YSA9PT0gUGhhc2VyLk1vdXNlLldIRUVMX0RPV04pIHtcbiAgICAgICAgICAgIHRoaXMud2hlZWxEZWx0YS0tO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgY29uc29sZS5sb2coJ3doZWVsIGRpZCBuZWl0aGVyIGdvIHVwIG5vciBkb3duPycpO1xuICAgICAgICB9XG4gICAgfSkuYmluZCh0aGlzKTtcbn1cblxuTW91c2VXaGVlbFBsYXllci5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2VuYWJsZWQpIHJldHVybjtcbiAgICB0aGlzLndoZWVsRGVsdGEgPSAwO1xuICAgIGlmICh0aGlzLnBvbmcuZ2FtZS5pbnB1dC5tb3VzZS5tb3VzZVdoZWVsQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coJ21vdXNlV2hlZWxDYWxsYmFjayBhbHJlYWR5IHJlZ2lzdGVyZWQhJyk7XG4gICAgfVxuICAgIHRoaXMucG9uZy5nYW1lLmlucHV0Lm1vdXNlLm1vdXNlV2hlZWxDYWxsYmFjayA9IHRoaXMud2hlZWxMaXN0ZW5lcjtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbn07XG5cbk1vdXNlV2hlZWxQbGF5ZXIucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX2VuYWJsZWQpIHJldHVybjtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG4gICAgdGhpcy5wb25nLmdhbWUuaW5wdXQubW91c2UubW91c2VXaGVlbENhbGxiYWNrID0gbnVsbDtcbn07XG5cbk1vdXNlV2hlZWxQbGF5ZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5fZW5hYmxlZCkgcmV0dXJuO1xuICAgIGlmICh0aGlzLndoZWVsRGVsdGEgPT09IDApIHJldHVybjtcbiAgICB2YXIgc2lnbiA9IHRoaXMud2hlZWxEZWx0YSA8IDA/IC0xIDogKzE7XG4gICAgdmFyIGR5ID0gLSh0aGlzLndoZWVsRGVsdGEpICogMTY7XG4gICAgdGhpcy5wYWRkbGUubW92ZShkeSk7XG4gICAgdGhpcy53aGVlbERlbHRhIC09IHNpZ247XG59O1xuLy8xfX19XG5cblxuLyoqXG4gKiB7e3sxIEtleWJvYXJkUGxheWVyXG4gKlxuICovXG5mdW5jdGlvbiBLZXlib2FyZFBsYXllcihwYWRkbGUsIHBvbmcpIHtcbiAgICB0aGlzLnBhZGRsZSA9IHBhZGRsZTtcbiAgICB0aGlzLnBvbmcgPSBwb25nO1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbn1cblxuS2V5Ym9hcmRQbGF5ZXIucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9lbmFibGVkKSByZXR1cm47XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG59O1xuXG5LZXlib2FyZFBsYXllci5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5fZW5hYmxlZCkgcmV0dXJuO1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbn07XG5cbktleWJvYXJkUGxheWVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX2VuYWJsZWQpIHJldHVybjtcbiAgICB2YXIgZHkgPSAwO1xuICAgIGlmICh0aGlzLnBvbmcuZ2FtZS5pbnB1dC5rZXlib2FyZC5pc0Rvd24oUGhhc2VyLktleWJvYXJkLlVQKSkge1xuICAgICAgICBkeSAtPSAxMDtcbiAgICB9XG4gICAgaWYgKHRoaXMucG9uZy5nYW1lLmlucHV0LmtleWJvYXJkLmlzRG93bihQaGFzZXIuS2V5Ym9hcmQuRE9XTikpIHtcbiAgICAgICAgZHkgKz0gMTA7IFxuICAgIH1cbiAgICB0aGlzLnBhZGRsZS5tb3ZlKGR5KTtcbn07XG4vLzF9fX1cblxuLyoqXG4gKiB7e3sxIEdvZFBsYXllclxuICovXG5mdW5jdGlvbiBHb2RQbGF5ZXIocGFkZGxlLCBwb25nKSB7XG4gICAgdGhpcy5wYWRkbGUgPSBwYWRkbGU7XG4gICAgdGhpcy5wb25nID0gcG9uZztcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG59XG5cbkdvZFBsYXllci5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG59O1xuXG5Hb2RQbGF5ZXIucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG59O1xuXG5cbkdvZFBsYXllci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLl9lbmFibGVkKSByZXR1cm47XG4gICAgdGhpcy5wYWRkbGUuc3ByaXRlLmNlbnRlclkgPSB0aGlzLnBvbmcuYmFsbC5zcHJpdGUuY2VudGVyWTtcbn07XG4vLzF9fX1cblxuLyoqXG4gKiB7e3sxIENvbXB1dGVyUGxheWVyXG4gKiBkb2VzIG5vdCBwbGF5IHBlcmZlY3QuXG4gKi9cbmZ1bmN0aW9uIENvbXB1dGVyUGxheWVyKHBhZGRsZSwgcG9uZykge1xuICAgIHRoaXMucGFkZGxlID0gcGFkZGxlO1xuICAgIHRoaXMucG9uZyA9IHBvbmc7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xuICAgIHRoaXMuX3RpY2sgPSAwO1xuICAgIHRoaXMubWF4U3BlZWQgPSAyMDtcbn1cblxuQ29tcHV0ZXJQbGF5ZXIucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSB0cnVlO1xufTtcblxuQ29tcHV0ZXJQbGF5ZXIucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG59O1xuXG5cbkNvbXB1dGVyUGxheWVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX2VuYWJsZWQpIHJldHVybjtcbiAgICAvLyBza2lwIGV2ZXJ5IGVpZ3RoIGZyYW1lIHRvIGdpdmUgaHVtYW5zIGEgY2hhbmNlXG4gICAgXG4gICAgdmFyIGJhbGxTcHJpdGUgPSB0aGlzLnBvbmcuYmFsbC5zcHJpdGU7XG4gICAgdmFyIHBhZGRsZVNwcml0ZSA9IHRoaXMucGFkZGxlLnNwcml0ZTtcbiAgICB2YXIgZGlzdCA9IE1hdGguYWJzKHBhZGRsZVNwcml0ZS5jZW50ZXJZIC0gYmFsbFNwcml0ZS5jZW50ZXJZKTtcbiAgICBpZiAoYmFsbFNwcml0ZS5ib3R0b20gPD0gcGFkZGxlU3ByaXRlLnRvcCkge1xuICAgICAgICB0aGlzLnBhZGRsZS5tb3ZlKC10aGlzLm1heFNwZWVkKTtcbiAgICB9IGVsc2UgaWYgKGJhbGxTcHJpdGUudG9wID49IHBhZGRsZVNwcml0ZS5ib3R0b20pIHtcbiAgICAgICAgdGhpcy5wYWRkbGUubW92ZSh0aGlzLm1heFNwZWVkKTtcbiAgICB9IGVsc2UgaWYgKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDEwKSA9PT0gMCAmJiArK3RoaXMuX3RpY2sgJSAxMCA9PT0gMCkge1xuICAgICAgICB0aGlzLnBhZGRsZS5tb3ZlKE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIHRoaXMubWF4U3BlZWQgLSB0aGlzLm1heFNwZWVkLzIpKTtcbiAgICB9XG59O1xuIl19
