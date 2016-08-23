(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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
function Scoreboard(x, y, game) {
    this._init(x, y, game);
}

Scoreboard.prototype._init = function(x, y, game) {
    this._x = x;
    this._y = y;
    this._digits = game.add.group();
    this._tens = game.add.sprite(x, y, 'digits');
    this._ones = game.add.sprite(x + this._tens.width, y, 'digits');
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
    this.sprite = game.add.sprite(x, y, texture);
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
    var angle = Math.floor(Math.random() * 4) - 2;
    if (angle < 0) angle--;
    angle *= 45;
    this.velocity = fromAngle(angle);
    this.velocity.x = side < 0? -1 : +1;
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



//    return hit? {
//        side: 'front', 
//        ballPath: ballPath, 
//        edge: paddleFront,
//        hit: hit,
//        player: player
//    } : null;
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

var entities = require('./entities.js');
var player = require('./player.js');

var pong = main();
var game = pong.game;
var pixel = 8;

//{{{1 main()
function main() {
    "use strict";
    var pong = {};
    pong.pause = false;
    var state = {preload: preload, create: create, update: update, render: render};
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
    game.load.spritesheet('digits', 'img/digits.png', 64, 64);
    game.load.audio('wallhit', 'sound/wallhit.mp3');
    game.load.audio('paddlehit', 'sound/paddlehit.mp3');
    game.load.audio('out', 'sound/out.mp3');
}
//1}}}

// {{{1 create()
function create() {
    createTextures();
    //DEBUG: prevent pause on focus loss
    //pong.game.stage.disableVisibilityChange = true;
    pong.sfx = {};
    pong.sfx.wallhit = game.add.audio('wallhit');
    pong.sfx.paddlehit = game.add.audio('paddlehit');
    pong.sfx.out = game.add.audio('out');
    pong.mute = false;
    pong.speed = 8;

    var top = 2*pixel,
        bottom = game.height - 2*pixel,
        left = 100,
        right = game.width - 100;

    var scoreboard1 = new entities.Scoreboard(game.width/4, top, game),
        paddle1 = new entities.Paddle(left, top, bottom, pong.textures.paddle, game);
    var scoreboard2 = new entities.Scoreboard(game.width/4*3 - 128, top, game),
        paddle2 = new entities.Paddle(right, top, bottom, pong.textures.paddle, game);
    var c1 = new player.KeyboardPlayer(paddle1, pong),
        c2 = new player.GodPlayer(paddle2, pong);

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
    
    pong.ball = new entities.Ball(game.width/2, game.height/2,
                                  pong.textures.ball, pong);


    pong.controllers = [pong.ball, c1, c2];
    c1.enable();
    c2.enable();
    pong.paused = false;
    pong.ball.serve();

    pong.playSound = function(key) {
        if (pong.mute) return;
        var sound = pong.sfx[key];
        if (!sound) {
            console.log('sound not found: ', key);
        } else {
            sound.play();
        }
    };

    game.input.onDown.add(function() {
        game.paused = !game.paused;
    });
    var muteKey = game.input.keyboard.addKey(Phaser.Keyboard.M);
    muteKey.onDown.add(function(key) {
        pong.mute = !pong.mute;
    });
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

// if the ball left the field, return the player who scores
function checkMiss() {
    if (pong.ball.sprite.right < 0) return pong.player2;
    if (pong.ball.sprite.left >= pong.game.width) return pong.player1;
}

function score(player) {
    pong.playSound('out');
    player.scoreboard.addScore();
    pong.ball.reset();
    setTimeout(function() {
        pong.ball.serve(player.other.side);
    }, 1000);
}

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

    var top = 2*pixel,
        bottom = game.height - 2*pixel,
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


//{{{1 createTextures()
function createTextures() {
    pong.textures = {};

    // paddle:
    var g = game.add.graphics(0, 0);
    g.beginFill(0xffffff);
    g.drawRect(0, 0, pixel, 4*pixel);
    g.endFill();
    pong.textures.paddle = g.generateTexture();
    g.destroy();

    // ball:
    g = game.add.graphics(0, 0);
    g.beginFill(0xffffff);
    g.drawRect(0, 0, pixel, pixel);
    g.endFill();
    pong.textures.ball = g.generateTexture();
    g.destroy();

    // center line:
    var x = (game.width - pixel) / 2;
    g = game.add.graphics(x, 0);
    var l = 2*pixel;
    g.beginFill(0x999999);
    for (var y = 0; y < game.height; y += l*2) {
        g.drawRect(0, y, pixel, l);
    }
    g.endFill();
    
}
// createTextures() 1}}}


},{"./entities.js":1,"./player.js":3}],3:[function(require,module,exports){
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
        if (game.input.mouse.wheelDelta === Phaser.Mouse.WHEEL_UP) {
            this.wheelDelta++;
        } else if (game.input.mouse.wheelDelta === Phaser.Mouse.WHEEL_DOWN) {
            this.wheelDelta--;
        } else {
            console.log('wheel did neither go up nor down?');
        }
    }).bind(this);
}

MouseWheelPlayer.prototype.enable = function() {
    if (this._enabled) return;
    this.wheelDelta = 0;
    if (game.input.mouse.mouseWheelCallback) {
        console.log('mouseWheelCallback already registered!');
    }
    this.pong.game.input.mouse.mouseWheelCallback = this.wheelListener;
    this._enabled = true;
};

MouseWheelPlayer.prototype.disable = function() {
    if (!this._enabled) return;
    game.input.mouse.mouseWheelCallback = null;
    this._enabled = false;
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
    var speedf = this.maxSpeed * (Math.random() / 3 + 0.6667);
    if (ballSprite.bottom <= paddleSprite.top) {
        this.paddle.move(-speedf);
    } else if (ballSprite.top >= paddleSprite.bottom) {
        this.paddle.move(+speedf);
    } else if (Math.floor(Math.random() * 10) === 0) {
        this.paddle.move(Math.floor(Math.random() * this.maxSpeed*2 - this.maxSpeed));
    }
};

},{}]},{},[2])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZW50aXRpZXMuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9wbGF5ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbFNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGFkZGxlOiBQYWRkbGUsXG4gICAgU2NvcmVib2FyZDogU2NvcmVib2FyZCxcbiAgICBCYWxsOiBCYWxsXG59O1xuXG52YXIgWkVSTyA9IG5ldyBQaGFzZXIuUG9pbnQoMCwgMCk7XG5mdW5jdGlvbiBmcm9tQW5nbGUoZGVncmVlcykge1xuICAgIHZhciByYWRzID0gZGVncmVlcyAqIChNYXRoLlBJLzE4MCk7XG4gICAgcmV0dXJuIG5ldyBQaGFzZXIuUG9pbnQoTWF0aC5jb3MocmFkcyksIE1hdGguc2luKHJhZHMpKTtcbn1cblxuLyoqIFxuICoge3t7MSBQYWRkbGVcbiAqIEBwYXJhbSB4IHtudW1iZXJ9IFRoZSB4IHBvc2l0aW9uIHRvIGNyZWF0ZSB0aGUgcGFkZGxlIG9uXG4gKi9cbmZ1bmN0aW9uIFBhZGRsZSh4LCBtaW55LCBtYXh5LCB0ZXh0dXJlLCBnYW1lKSB7XG4gICAgdGhpcy5zcHJpdGUgPSBnYW1lLmFkZC5zcHJpdGUoeCwgKG1heHktbWlueSkgLyAyICsgbWlueSwgdGV4dHVyZSk7XG4gICAgdGhpcy5zcHJpdGUuYW5jaG9yLnNldCgwLjUsIDAuNSk7XG4gICAgdGhpcy5taW55ID0gbWlueSArIHRoaXMuc3ByaXRlLmhlaWdodC8yO1xuICAgIHRoaXMubWF4eSA9IG1heHkgLSB0aGlzLnNwcml0ZS5oZWlnaHQvMjtcbn1cblxuUGFkZGxlLnByb3RvdHlwZS5kZXN0cm95ID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5zcHJpdGUuZGVzdHJveSgpO1xufTtcblxuUGFkZGxlLnByb3RvdHlwZS5tb3ZlID0gZnVuY3Rpb24oZHkpIHtcbiAgICB2YXIgeSA9IFBoYXNlci5NYXRoLmNsYW1wKHRoaXMuc3ByaXRlLnkgKyBkeSwgdGhpcy5taW55LCB0aGlzLm1heHkpO1xuICAgIHRoaXMuc3ByaXRlLnkgPSB5OyBcbn07XG5cblBhZGRsZS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY2VudGVyID0gKHRoaXMubWF4eS10aGlzLm1pbnkpIC8gMiArIHRoaXMubWlueTtcbiAgICB0aGlzLnNwcml0ZS5yZXNldCh0aGlzLnNwcml0ZS54LCBjZW50ZXIpO1xufTtcblxuUGFkZGxlLnByb3RvdHlwZS5nZXRSZWZsZWN0aW9uID0gZnVuY3Rpb24oaGl0KSB7XG4gICAgdmFyIHJlbGF0aXZlWSA9IHRoaXMuc3ByaXRlLmNlbnRlclkgLSBoaXQueTtcbiAgICB2YXIgc2lnbiA9IHJlbGF0aXZlWSA+IDA/IC0xIDogKzE7XG4gICAgdmFyIGxlZnQgPSBNYXRoLmFicyhyZWxhdGl2ZVkpO1xuICAgIHZhciBhbmdsZSA9IDA7XG4gICAgd2hpbGUgKGxlZnQgPiAwLjI1ICogdGhpcy5zcHJpdGUuaGVpZ2h0LzIpIHtcbiAgICAgICAgYW5nbGUgKz0gMTU7XG4gICAgICAgIGxlZnQgLT0gMC4yNSAqIHRoaXMuc3ByaXRlLmhlaWdodC8yO1xuICAgIH1cbiAgICByZXR1cm4gYW5nbGUgKiBzaWduO1xufTtcbi8vMX19fVxuXG4vKipcbiAqIHt7ezEgU2NvcmVib2FyZFxuICogS2VlcHMgdHJhY2sgb2Ygc2NvcmUgYW5kIGRpc3BsYXlzIGl0IHVzaW5nIHNwcml0ZXMuXG4gKi9cbmZ1bmN0aW9uIFNjb3JlYm9hcmQoeCwgeSwgZ2FtZSkge1xuICAgIHRoaXMuX2luaXQoeCwgeSwgZ2FtZSk7XG59XG5cblNjb3JlYm9hcmQucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oeCwgeSwgZ2FtZSkge1xuICAgIHRoaXMuX3ggPSB4O1xuICAgIHRoaXMuX3kgPSB5O1xuICAgIHRoaXMuX2RpZ2l0cyA9IGdhbWUuYWRkLmdyb3VwKCk7XG4gICAgdGhpcy5fdGVucyA9IGdhbWUuYWRkLnNwcml0ZSh4LCB5LCAnZGlnaXRzJyk7XG4gICAgdGhpcy5fb25lcyA9IGdhbWUuYWRkLnNwcml0ZSh4ICsgdGhpcy5fdGVucy53aWR0aCwgeSwgJ2RpZ2l0cycpO1xuICAgIHRoaXMuX2RpZ2l0cy5hZGQodGhpcy5fdGVucyk7XG4gICAgdGhpcy5fZGlnaXRzLmFkZCh0aGlzLl9vbmVzKTtcbiAgICB0aGlzLnNldFNjb3JlKDApO1xufTtcblxuU2NvcmVib2FyZC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3RlbnMgPSBudWxsO1xuICAgIHRoaXMuX29uZXMgPSBudWxsO1xuICAgIHRoaXMuX2RpZ2l0cy5kZXN0cm95KCk7XG4gICAgdGhpcy5fZGlnaXRzID0gbnVsbDtcbn07XG5cblNjb3JlYm9hcmQucHJvdG90eXBlLnNldFZpc2libGUgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy5fZGlnaXRzLnZpc2libGUgPSB2O1xufTtcblxuU2NvcmVib2FyZC5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNldFNjb3JlKDApO1xufTtcblxuU2NvcmVib2FyZC5wcm90b3R5cGUuc2V0U2NvcmUgPSBmdW5jdGlvbihzY29yZSkge1xuICAgIHRoaXMuc2NvcmUgPSBzY29yZTtcbiAgICB0aGlzLl9yZWZyZXNoKCk7XG59O1xuXG5TY29yZWJvYXJkLnByb3RvdHlwZS5hZGRTY29yZSA9IGZ1bmN0aW9uKG4pIHtcbiAgICB0aGlzLnNjb3JlICs9IG4gfHwgMTtcbiAgICB0aGlzLl9yZWZyZXNoKCk7XG59O1xuXG5TY29yZWJvYXJkLnByb3RvdHlwZS5fcmVmcmVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3RlbnMudmlzaWJsZSA9IHRoaXMuc2NvcmUgPj0gMTA7XG4gICAgdmFyIHNjb3JlID0gdGhpcy5zY29yZSAlIDEwMDtcbiAgICB0aGlzLl90ZW5zLmZyYW1lID0gTWF0aC5mbG9vcihzY29yZSAvIDEwKTtcbiAgICB0aGlzLl9vbmVzLmZyYW1lID0gc2NvcmUgJSAxMDtcbn07XG4vLzF9fX1cblxuXG5cbi8qKlxuICoge3t7MSBCYWxsXG4gKi9cbmZ1bmN0aW9uIEJhbGwoeCwgeSwgdGV4dHVyZSwgcG9uZykge1xuICAgIHRoaXMucG9uZyA9IHBvbmc7XG4gICAgdGhpcy5pbml0aWFsWCA9IHg7XG4gICAgdGhpcy5pbml0aWFsWSA9IHk7XG4gICAgdGhpcy5zcHJpdGUgPSBnYW1lLmFkZC5zcHJpdGUoeCwgeSwgdGV4dHVyZSk7XG4gICAgdGhpcy5zcHJpdGUuYW5jaG9yLnNldCgwLjUsIDAuNSk7XG4gICAgdGhpcy5zcGVlZCA9IHBvbmcuc3BlZWQ7XG4gICAgdGhpcy5taW55ID0gdGhpcy5zcHJpdGUuaGVpZ2h0LzI7XG4gICAgdGhpcy5tYXh5ID0gcG9uZy5nYW1lLmhlaWdodCAtIHRoaXMuc3ByaXRlLmhlaWdodC8yIC0gMTtcbiAgICB0aGlzLnJlc2V0KCk7XG59XG5cbkJhbGwucHJvdG90eXBlLnJlc2V0ID0gZnVuY3Rpb24oKSB7XG4gICAgdmFyIHJhbmdlID0gdGhpcy5tYXh5IC0gdGhpcy5taW55O1xuICAgIHZhciBtaW55ID0gdGhpcy5taW55ICsgcmFuZ2UvNTtcbiAgICB2YXIgbWF4eSA9IHRoaXMubWF4eSAtIHJhbmdlLzU7XG4gICAgdmFyIHkgPSBNYXRoLmZsb29yKE1hdGgucmFuZG9tKCkgKiAobWF4eSAtIG1pbnkpKSArIG1pbnk7XG4gICAgdGhpcy5zcHJpdGUueCA9IHRoaXMuaW5pdGlhbFg7XG4gICAgdGhpcy5zcHJpdGUueSA9IHk7XG4gICAgdGhpcy52ZWxvY2l0eSA9IG5ldyBQaGFzZXIuUG9pbnQoMCwgMCk7XG59O1xuXG5CYWxsLnByb3RvdHlwZS5zZXJ2ZSA9IGZ1bmN0aW9uKHNpZGUpIHtcbiAgICBpZiAoIXNpZGUpIHNpZGUgPSBNYXRoLnJvdW5kKE1hdGgucmFuZG9tKCkpPyArMSA6IC0xO1xuICAgIHZhciBhbmdsZSA9IE1hdGguZmxvb3IoTWF0aC5yYW5kb20oKSAqIDQpIC0gMjtcbiAgICBpZiAoYW5nbGUgPCAwKSBhbmdsZS0tO1xuICAgIGFuZ2xlICo9IDQ1O1xuICAgIHRoaXMudmVsb2NpdHkgPSBmcm9tQW5nbGUoYW5nbGUpO1xuICAgIHRoaXMudmVsb2NpdHkueCA9IHNpZGUgPCAwPyAtMSA6ICsxO1xuICAgIHRoaXMudmVsb2NpdHkubm9ybWFsaXplKCkubXVsdGlwbHkodGhpcy5zcGVlZCwgdGhpcy5zcGVlZCk7XG59O1xuXG5CYWxsLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zcGVlZCA9PT0gMCB8fCB0aGlzLnZlbG9jaXR5LnggPT09IDAgKyB0aGlzLnZlbG9jaXR5LnkgPT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLnNwcml0ZS54ICs9IHRoaXMudmVsb2NpdHkueDtcbiAgICB0aGlzLnNwcml0ZS55ICs9IHRoaXMudmVsb2NpdHkueTtcblxuICAgIGlmICh0aGlzLnNwcml0ZS55IDwgdGhpcy5taW55IHx8IHRoaXMuc3ByaXRlLnkgPiB0aGlzLm1heHkpIHtcbiAgICAgICAgdGhpcy5zcHJpdGUueSA9IFBoYXNlci5NYXRoLmNsYW1wKHRoaXMuc3ByaXRlLnksIHRoaXMubWlueSwgdGhpcy5tYXh5KTtcbiAgICAgICAgdGhpcy5wb25nLnBsYXlTb3VuZCgnd2FsbGhpdCcpO1xuICAgICAgICAgICAgXG4gICAgICAgIHRoaXMudmVsb2NpdHkueSA9IC10aGlzLnZlbG9jaXR5Lnk7XG4gICAgICAgIHRoaXMuc3ByaXRlLnkgKz0gdGhpcy52ZWxvY2l0eS55O1xuICAgIH1cbn07XG5cblxuXG4vLyAgICByZXR1cm4gaGl0PyB7XG4vLyAgICAgICAgc2lkZTogJ2Zyb250JywgXG4vLyAgICAgICAgYmFsbFBhdGg6IGJhbGxQYXRoLCBcbi8vICAgICAgICBlZGdlOiBwYWRkbGVGcm9udCxcbi8vICAgICAgICBoaXQ6IGhpdCxcbi8vICAgICAgICBwbGF5ZXI6IHBsYXllclxuLy8gICAgfSA6IG51bGw7XG5CYWxsLnByb3RvdHlwZS5ib3VuY2UgPSBmdW5jdGlvbihoaXRJbmZvKSB7XG4gICAgdmFyIHN0YXJ0VG9IaXQgPSBQaGFzZXIuUG9pbnQuc3VidHJhY3QoXG4gICAgICAgICAgICBoaXRJbmZvLmJhbGxQYXRoLmVuZCxcbiAgICAgICAgICAgIGhpdEluZm8uaGl0KTtcbiAgICB2YXIgbW92ZUJhY2sgPSBQaGFzZXIuUG9pbnQubm9ybWFsaXplKHRoaXMudmVsb2NpdHkpO1xuICAgIG1vdmVCYWNrID0gUGhhc2VyLlBvaW50Lm5lZ2F0aXZlKG1vdmVCYWNrLCBtb3ZlQmFjayk7XG4gICAgbW92ZUJhY2suc2V0TWFnbml0dWRlKHN0YXJ0VG9IaXQuZ2V0TWFnbml0dWRlKCkpO1xuICAgIHRoaXMuc3ByaXRlLnggPSBoaXRJbmZvLmJhbGxQYXRoLnN0YXJ0LnggKyBtb3ZlQmFjay54O1xuICAgIHRoaXMuc3ByaXRlLnkgPSBoaXRJbmZvLmJhbGxQYXRoLnN0YXJ0LnkgKyBtb3ZlQmFjay55O1xuICAgIGlmIChoaXRJbmZvLnNpZGUgIT09ICdmcm9udCcpIHtcbiAgICAgICAgdGhpcy52ZWxvY2l0eS55ID0gLXRoaXMudmVsb2NpdHkueTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgc3BlZWQgPSB0aGlzLnZlbG9jaXR5LmdldE1hZ25pdHVkZSgpO1xuICAgICAgICB2YXIgZGVncmVlcyA9IGhpdEluZm8ucGxheWVyLnBhZGRsZS5nZXRSZWZsZWN0aW9uKGhpdEluZm8uaGl0KTtcbiAgICAgICAgdmFyIHNwZWVkRmFjdG9yID0gZGVncmVlcz8gMS4wNSA6IDAuOTU7XG4gICAgICAgIHZhciB2ZWMgPSBmcm9tQW5nbGUoZGVncmVlcykuc2V0TWFnbml0dWRlKHNwZWVkICogc3BlZWRGYWN0b3IpO1xuICAgICAgICAgICAgaWYgKHRoaXMudmVsb2NpdHkueCA+IDApIHZlYy54ICo9IC0xO1xuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gdmVjO1xuICAgIH1cbn07XG5cbi8vMX19fVxuIiwiLy8ge3t7MSBEb21pbmlrJ3MgYXdlc29tZSBQb25nIGNsb25lXG4vLyBcbi8vIENvcHlyaWdodCAoYykgMjAxNiBEb21pbmlrIFJvc2VobmFsXG4vLyBcbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2Zcbi8vIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbi8vIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG9cbi8vIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4vLyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbi8vIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vIFxuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4vLyBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy8gXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuLy8gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkdcbi8vIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVJcbi8vIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbi8vIDF9fX1cblxudmFyIGVudGl0aWVzID0gcmVxdWlyZSgnLi9lbnRpdGllcy5qcycpO1xudmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyLmpzJyk7XG5cbnZhciBwb25nID0gbWFpbigpO1xudmFyIGdhbWUgPSBwb25nLmdhbWU7XG52YXIgcGl4ZWwgPSA4O1xuXG4vL3t7ezEgbWFpbigpXG5mdW5jdGlvbiBtYWluKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBwb25nID0ge307XG4gICAgcG9uZy5wYXVzZSA9IGZhbHNlO1xuICAgIHZhciBzdGF0ZSA9IHtwcmVsb2FkOiBwcmVsb2FkLCBjcmVhdGU6IGNyZWF0ZSwgdXBkYXRlOiB1cGRhdGUsIHJlbmRlcjogcmVuZGVyfTtcbiAgICBwb25nLnN0YXRlID0gc3RhdGU7XG4gICAgcG9uZy5nYW1lID0gbmV3IFBoYXNlci5HYW1lKDgwMCwgNDgwLCBQaGFzZXIuQ0FOVkFTLCAncG9uZycsIHN0YXRlKTtcbiAgICBwb25nLmNvbnRyb2xsZXJzID0gW107XG4gICAgcG9uZy5kZWJ1ZyA9IGZhbHNlO1xuICAgIHdpbmRvdy5wb25nID0gcG9uZztcbiAgICB3aW5kb3cuZ2FtZSA9IHBvbmcuZ2FtZTtcbiAgICByZXR1cm4gcG9uZztcbn1cbi8vMX19fVxuXG4vL3t7ezEgcHJlbG9hZCgpXG5mdW5jdGlvbiBwcmVsb2FkKCkge1xuICAgIGdhbWUubG9hZC5zcHJpdGVzaGVldCgnZGlnaXRzJywgJ2ltZy9kaWdpdHMucG5nJywgNjQsIDY0KTtcbiAgICBnYW1lLmxvYWQuYXVkaW8oJ3dhbGxoaXQnLCAnc291bmQvd2FsbGhpdC5tcDMnKTtcbiAgICBnYW1lLmxvYWQuYXVkaW8oJ3BhZGRsZWhpdCcsICdzb3VuZC9wYWRkbGVoaXQubXAzJyk7XG4gICAgZ2FtZS5sb2FkLmF1ZGlvKCdvdXQnLCAnc291bmQvb3V0Lm1wMycpO1xufVxuLy8xfX19XG5cbi8vIHt7ezEgY3JlYXRlKClcbmZ1bmN0aW9uIGNyZWF0ZSgpIHtcbiAgICBjcmVhdGVUZXh0dXJlcygpO1xuICAgIC8vREVCVUc6IHByZXZlbnQgcGF1c2Ugb24gZm9jdXMgbG9zc1xuICAgIC8vcG9uZy5nYW1lLnN0YWdlLmRpc2FibGVWaXNpYmlsaXR5Q2hhbmdlID0gdHJ1ZTtcbiAgICBwb25nLnNmeCA9IHt9O1xuICAgIHBvbmcuc2Z4LndhbGxoaXQgPSBnYW1lLmFkZC5hdWRpbygnd2FsbGhpdCcpO1xuICAgIHBvbmcuc2Z4LnBhZGRsZWhpdCA9IGdhbWUuYWRkLmF1ZGlvKCdwYWRkbGVoaXQnKTtcbiAgICBwb25nLnNmeC5vdXQgPSBnYW1lLmFkZC5hdWRpbygnb3V0Jyk7XG4gICAgcG9uZy5tdXRlID0gZmFsc2U7XG4gICAgcG9uZy5zcGVlZCA9IDg7XG5cbiAgICB2YXIgdG9wID0gMipwaXhlbCxcbiAgICAgICAgYm90dG9tID0gZ2FtZS5oZWlnaHQgLSAyKnBpeGVsLFxuICAgICAgICBsZWZ0ID0gMTAwLFxuICAgICAgICByaWdodCA9IGdhbWUud2lkdGggLSAxMDA7XG5cbiAgICB2YXIgc2NvcmVib2FyZDEgPSBuZXcgZW50aXRpZXMuU2NvcmVib2FyZChnYW1lLndpZHRoLzQsIHRvcCwgZ2FtZSksXG4gICAgICAgIHBhZGRsZTEgPSBuZXcgZW50aXRpZXMuUGFkZGxlKGxlZnQsIHRvcCwgYm90dG9tLCBwb25nLnRleHR1cmVzLnBhZGRsZSwgZ2FtZSk7XG4gICAgdmFyIHNjb3JlYm9hcmQyID0gbmV3IGVudGl0aWVzLlNjb3JlYm9hcmQoZ2FtZS53aWR0aC80KjMgLSAxMjgsIHRvcCwgZ2FtZSksXG4gICAgICAgIHBhZGRsZTIgPSBuZXcgZW50aXRpZXMuUGFkZGxlKHJpZ2h0LCB0b3AsIGJvdHRvbSwgcG9uZy50ZXh0dXJlcy5wYWRkbGUsIGdhbWUpO1xuICAgIHZhciBjMSA9IG5ldyBwbGF5ZXIuS2V5Ym9hcmRQbGF5ZXIocGFkZGxlMSwgcG9uZyksXG4gICAgICAgIGMyID0gbmV3IHBsYXllci5Hb2RQbGF5ZXIocGFkZGxlMiwgcG9uZyk7XG5cbiAgICBwb25nLnBsYXllcjEgPSB7XG4gICAgICAgIHNjb3JlYm9hcmQ6IHNjb3JlYm9hcmQxLFxuICAgICAgICBwYWRkbGU6IHBhZGRsZTEsXG4gICAgICAgIGNvbnRyb2xsZXI6IGMxLFxuICAgICAgICBzaWRlOiAtMVxuICAgIH07XG4gICAgcG9uZy5wbGF5ZXIyID0ge1xuICAgICAgICBzY29yZWJvYXJkOiBzY29yZWJvYXJkMixcbiAgICAgICAgcGFkZGxlOiBwYWRkbGUyLFxuICAgICAgICBjb250cm9sbGVyOiBjMixcbiAgICAgICAgc2lkZTogKzEsXG4gICAgfTtcbiAgICBwb25nLnBsYXllcjEub3RoZXIgPSBwb25nLnBsYXllcjI7XG4gICAgcG9uZy5wbGF5ZXIyLm90aGVyID0gcG9uZy5wbGF5ZXIxO1xuICAgIFxuICAgIHBvbmcuYmFsbCA9IG5ldyBlbnRpdGllcy5CYWxsKGdhbWUud2lkdGgvMiwgZ2FtZS5oZWlnaHQvMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb25nLnRleHR1cmVzLmJhbGwsIHBvbmcpO1xuXG5cbiAgICBwb25nLmNvbnRyb2xsZXJzID0gW3BvbmcuYmFsbCwgYzEsIGMyXTtcbiAgICBjMS5lbmFibGUoKTtcbiAgICBjMi5lbmFibGUoKTtcbiAgICBwb25nLnBhdXNlZCA9IGZhbHNlO1xuICAgIHBvbmcuYmFsbC5zZXJ2ZSgpO1xuXG4gICAgcG9uZy5wbGF5U291bmQgPSBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHBvbmcubXV0ZSkgcmV0dXJuO1xuICAgICAgICB2YXIgc291bmQgPSBwb25nLnNmeFtrZXldO1xuICAgICAgICBpZiAoIXNvdW5kKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc291bmQgbm90IGZvdW5kOiAnLCBrZXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc291bmQucGxheSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGdhbWUuaW5wdXQub25Eb3duLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgZ2FtZS5wYXVzZWQgPSAhZ2FtZS5wYXVzZWQ7XG4gICAgfSk7XG4gICAgdmFyIG11dGVLZXkgPSBnYW1lLmlucHV0LmtleWJvYXJkLmFkZEtleShQaGFzZXIuS2V5Ym9hcmQuTSk7XG4gICAgbXV0ZUtleS5vbkRvd24uYWRkKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICBwb25nLm11dGUgPSAhcG9uZy5tdXRlO1xuICAgIH0pO1xufVxuLy8xfX19XG5cblxudmFyIGNvbGxpc2lvbjtcbi8ve3t7MSB1cGRhdGUoKVxuZnVuY3Rpb24gdXBkYXRlKCkge1xuICAgIGlmIChwb25nLnBhdXNlZCkgcmV0dXJuO1xuICAgIHBvbmcuY29udHJvbGxlcnMuZm9yRWFjaChmdW5jdGlvbihjKSB7XG4gICAgICAgYy51cGRhdGUoKTtcbiAgICB9KTsgXG4gICAgdmFyIGhpdEluZm8gPSBoaXRUZXN0KCk7XG4gICAgaWYgKGhpdEluZm8pIHtcbiAgICAgICAgY29sbGlzaW9uID0gaGl0SW5mbztcbiAgICAgICAgLy9jb25zb2xlLmxvZyhoaXRJbmZvKTtcbiAgICAgICAgcG9uZy5iYWxsLmJvdW5jZShoaXRJbmZvKTtcbiAgICAgICAgLy9nYW1lLnBhdXNlZCA9IHRydWU7XG4gICAgICAgIHBvbmcucGxheVNvdW5kKCdwYWRkbGVoaXQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgc2NvcmVkUGxheWVyID0gY2hlY2tNaXNzKCk7XG4gICAgICAgIGlmIChzY29yZWRQbGF5ZXIpIHNjb3JlKHNjb3JlZFBsYXllcik7XG4gICAgfVxuXG59XG4vLzF9fX1cblxuLy8gaWYgdGhlIGJhbGwgbGVmdCB0aGUgZmllbGQsIHJldHVybiB0aGUgcGxheWVyIHdobyBzY29yZXNcbmZ1bmN0aW9uIGNoZWNrTWlzcygpIHtcbiAgICBpZiAocG9uZy5iYWxsLnNwcml0ZS5yaWdodCA8IDApIHJldHVybiBwb25nLnBsYXllcjI7XG4gICAgaWYgKHBvbmcuYmFsbC5zcHJpdGUubGVmdCA+PSBwb25nLmdhbWUud2lkdGgpIHJldHVybiBwb25nLnBsYXllcjE7XG59XG5cbmZ1bmN0aW9uIHNjb3JlKHBsYXllcikge1xuICAgIHBvbmcucGxheVNvdW5kKCdvdXQnKTtcbiAgICBwbGF5ZXIuc2NvcmVib2FyZC5hZGRTY29yZSgpO1xuICAgIHBvbmcuYmFsbC5yZXNldCgpO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHBvbmcuYmFsbC5zZXJ2ZShwbGF5ZXIub3RoZXIuc2lkZSk7XG4gICAgfSwgMTAwMCk7XG59XG5cbi8ve3t7MSBoaXRUZXN0KClcbmZ1bmN0aW9uIGhpdFRlc3QoKSB7XG4gICAgaWYgKHBvbmcuYmFsbC52ZWxvY2l0eS54ID09PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gb25seSBjaGVjayB0aGUgcGFkZGxlIG9uIHRoZSBzaWRlIHRoZSBiYWxsIGlzIHRyYXZlbGxpbmcgdG9cbiAgICB2YXIgZGlyID0gcG9uZy5iYWxsLnZlbG9jaXR5LnggPCAwPyAtMSA6ICsxLFxuICAgICAgICBwbGF5ZXIgPSBwb25nLnBsYXllcjEuc2lkZSA9PT0gZGlyPyBwb25nLnBsYXllcjEgOiBwb25nLnBsYXllcjIsXG4gICAgICAgIGJhbGxTcHJpdGUgPSBwb25nLmJhbGwuc3ByaXRlLFxuICAgICAgICBwYWRkbGVTcHJpdGUgPSBwbGF5ZXIucGFkZGxlLnNwcml0ZTtcbiAgICB2YXIgYmFsbFBhdGhzID0gW1xuICAgICAgICAgICAgbmV3IFBoYXNlci5MaW5lKFxuICAgICAgICAgICAgICAgIGJhbGxTcHJpdGUubGVmdCAtIHBvbmcuYmFsbC52ZWxvY2l0eS54LFxuICAgICAgICAgICAgICAgIGJhbGxTcHJpdGUudG9wIC0gcG9uZy5iYWxsLnZlbG9jaXR5LnksXG4gICAgICAgICAgICAgICAgYmFsbFNwcml0ZS5sZWZ0LCBiYWxsU3ByaXRlLnRvcCksXG4gICAgICAgICAgICBuZXcgUGhhc2VyLkxpbmUoXG4gICAgICAgICAgICAgICAgYmFsbFNwcml0ZS5yaWdodCAtIHBvbmcuYmFsbC52ZWxvY2l0eS54LFxuICAgICAgICAgICAgICAgIGJhbGxTcHJpdGUudG9wIC0gcG9uZy5iYWxsLnZlbG9jaXR5LnksXG4gICAgICAgICAgICAgICAgYmFsbFNwcml0ZS5yaWdodCwgYmFsbFNwcml0ZS50b3ApLFxuICAgICAgICAgICAgbmV3IFBoYXNlci5MaW5lKFxuICAgICAgICAgICAgICAgIGJhbGxTcHJpdGUucmlnaHQgLSBwb25nLmJhbGwudmVsb2NpdHkueCxcbiAgICAgICAgICAgICAgICBiYWxsU3ByaXRlLmJvdHRvbSAtIHBvbmcuYmFsbC52ZWxvY2l0eS55LFxuICAgICAgICAgICAgICAgIGJhbGxTcHJpdGUucmlnaHQsIGJhbGxTcHJpdGUuYm90dG9tKSxcbiAgICAgICAgICAgIG5ldyBQaGFzZXIuTGluZShcbiAgICAgICAgICAgICAgICBiYWxsU3ByaXRlLmxlZnQgLSBwb25nLmJhbGwudmVsb2NpdHkueCxcbiAgICAgICAgICAgICAgICBiYWxsU3ByaXRlLmJvdHRvbSAtIHBvbmcuYmFsbC52ZWxvY2l0eS55LFxuICAgICAgICAgICAgICAgIGJhbGxTcHJpdGUubGVmdCwgYmFsbFNwcml0ZS5ib3R0b20pXTtcblxuXG4gICAgdmFyIGZyb250WCA9IGRpcjwwPyBwYWRkbGVTcHJpdGUucmlnaHQgOiBwYWRkbGVTcHJpdGUubGVmdDtcbiAgICB2YXIgZWRnZSA9IG5ldyBQaGFzZXIuTGluZShcbiAgICAgICAgICAgIGZyb250WCwgcGFkZGxlU3ByaXRlLnRvcCxcbiAgICAgICAgICAgIGZyb250WCwgcGFkZGxlU3ByaXRlLmJvdHRvbSk7XG4gICAgXG4gICAgdmFyIHJlc3VsdDtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGJhbGxQYXRocy5sZW5ndGg7IGkrKykge1xuICAgICAgICByZXN1bHQgPSB0ZXN0SW50ZXJzZWN0aW9uKGJhbGxQYXRoc1tpXSk7XG4gICAgICAgIGlmIChyZXN1bHQpIHJldHVybiByZXN1bHQ7IFxuICAgIH1cblxuICAgIGZ1bmN0aW9uIHRlc3RJbnRlcnNlY3Rpb24ocGF0aCkge1xuICAgICAgICB2YXIgaGl0ID0gcGF0aC5pbnRlcnNlY3RzKGVkZ2UsIHRydWUpO1xuICAgICAgICBjb2xsaXNpb24gPSB7XG4gICAgICAgICAgICBzaWRlOiAnZnJvbnQnLCBcbiAgICAgICAgICAgIGRpcjogZGlyLFxuICAgICAgICAgICAgYmFsbFBhdGg6IHBhdGgsIFxuICAgICAgICAgICAgZWRnZTogZWRnZSxcbiAgICAgICAgICAgIGhpdDogaGl0LFxuICAgICAgICAgICAgcGxheWVyOiBwbGF5ZXJcbiAgICAgICAgfTtcbiAgICAgICAgcmV0dXJuIGhpdD8gY29sbGlzaW9uIDogbnVsbDtcbiAgICB9XG59XG4vLzF9fX1cblxuXG4vLyByZW5kZXIgdGhlIGZyb250YWwgY29sbGlzaW9uIGVkZ2Ugb2YgYm90aCBwYWRkbGVzXG52YXIgZWRnZTEgPSBuZXcgUGhhc2VyLkxpbmUoMCwgMCwgMCwgMCksIFxuICAgIGVkZ2UyID0gbmV3IFBoYXNlci5MaW5lKDAsIDAsIDAsIDApO1xuZnVuY3Rpb24gcmVuZGVyKCkge1xuICAgIGlmICghcG9uZy5kZWJ1ZykgcmV0dXJuO1xuICAgIGZ1bmN0aW9uIGdldEVkZ2UocGFkZGxlU3ByaXRlLCBkaXIsIG91dCkge1xuICAgICAgICB2YXIgZnJvbnRYID0gZGlyPDA/IHBhZGRsZVNwcml0ZS5yaWdodCA6IHBhZGRsZVNwcml0ZS5sZWZ0O1xuICAgICAgICBvdXQuc3RhcnQuc2V0KGZyb250WCwgcGFkZGxlU3ByaXRlLnRvcCk7XG4gICAgICAgIG91dC5lbmQuc2V0KGZyb250WCwgcGFkZGxlU3ByaXRlLmJvdHRvbSk7XG4gICAgfVxuICAgIGdldEVkZ2UocG9uZy5wbGF5ZXIxLnBhZGRsZS5zcHJpdGUsIHBvbmcucGxheWVyMS5zaWRlLCBlZGdlMSk7XG4gICAgZ2V0RWRnZShwb25nLnBsYXllcjIucGFkZGxlLnNwcml0ZSwgcG9uZy5wbGF5ZXIyLnNpZGUsIGVkZ2UyKTtcbiAgICBnYW1lLmRlYnVnLmdlb20oZWRnZTEsICcjZmYwMGZmJyk7XG4gICAgZ2FtZS5kZWJ1Zy5nZW9tKGVkZ2UyLCAnI2ZmMDBmZicpO1xuICAgIHZhciBtaWQxID0gbmV3IFBoYXNlci5MaW5lKFxuICAgICAgICAgICAgcG9uZy5wbGF5ZXIxLnBhZGRsZS5zcHJpdGUubGVmdCwgcG9uZy5wbGF5ZXIxLnBhZGRsZS5zcHJpdGUuY2VudGVyWSxcbiAgICAgICAgICAgIHBvbmcucGxheWVyMS5wYWRkbGUuc3ByaXRlLnJpZ2h0LCBwb25nLnBsYXllcjEucGFkZGxlLnNwcml0ZS5jZW50ZXJZKTtcbiAgICB2YXIgbWlkMiA9IG5ldyBQaGFzZXIuTGluZShcbiAgICAgICAgICAgIHBvbmcucGxheWVyMi5wYWRkbGUuc3ByaXRlLmxlZnQsIHBvbmcucGxheWVyMi5wYWRkbGUuc3ByaXRlLmNlbnRlclksXG4gICAgICAgICAgICBwb25nLnBsYXllcjIucGFkZGxlLnNwcml0ZS5yaWdodCwgcG9uZy5wbGF5ZXIyLnBhZGRsZS5zcHJpdGUuY2VudGVyWSk7XG5cbiAgICBnYW1lLmRlYnVnLmdlb20obWlkMSwgJyMzMzMzMzMnKTtcbiAgICBnYW1lLmRlYnVnLmdlb20obWlkMiwgJyMzMzMzMzMnKTtcblxuICAgIHZhciB0b3AgPSAyKnBpeGVsLFxuICAgICAgICBib3R0b20gPSBnYW1lLmhlaWdodCAtIDIqcGl4ZWwsXG4gICAgICAgIGxlZnQgPSAwLFxuICAgICAgICByaWdodCA9IGdhbWUud2lkdGg7XG4gICAgZ2FtZS5kZWJ1Zy5nZW9tKG5ldyBQaGFzZXIuTGluZShsZWZ0LCB0b3AsIHJpZ2h0LCB0b3ApLCAnMHhmZmYnKTtcbiAgICBnYW1lLmRlYnVnLmdlb20obmV3IFBoYXNlci5MaW5lKGxlZnQsIGJvdHRvbSwgcmlnaHQsIGJvdHRvbSksICcweGZmZicpO1xuXG4gICAgZ2FtZS5kZWJ1Zy5nZW9tKHBvbmcuYmFsbC5zcHJpdGUuZ2V0Qm91bmRzKCksICcjZmYwJyk7XG5cbiAgICBpZiAoIWNvbGxpc2lvbikgcmV0dXJuO1xuICAgIGdhbWUuZGVidWcuZ2VvbShjb2xsaXNpb24uZWRnZSwgJyMwMGZmMDAnKTtcbiAgICBnYW1lLmRlYnVnLmdlb20oY29sbGlzaW9uLmJhbGxQYXRoLCAnIzAwMDBmZicpO1xuICAgIGdhbWUuZGVidWcuZ2VvbShjb2xsaXNpb24uaGl0LCAnI2ZmMDAwMCcpO1xuXG59XG5cblxuLy97e3sxIGNyZWF0ZVRleHR1cmVzKClcbmZ1bmN0aW9uIGNyZWF0ZVRleHR1cmVzKCkge1xuICAgIHBvbmcudGV4dHVyZXMgPSB7fTtcblxuICAgIC8vIHBhZGRsZTpcbiAgICB2YXIgZyA9IGdhbWUuYWRkLmdyYXBoaWNzKDAsIDApO1xuICAgIGcuYmVnaW5GaWxsKDB4ZmZmZmZmKTtcbiAgICBnLmRyYXdSZWN0KDAsIDAsIHBpeGVsLCA0KnBpeGVsKTtcbiAgICBnLmVuZEZpbGwoKTtcbiAgICBwb25nLnRleHR1cmVzLnBhZGRsZSA9IGcuZ2VuZXJhdGVUZXh0dXJlKCk7XG4gICAgZy5kZXN0cm95KCk7XG5cbiAgICAvLyBiYWxsOlxuICAgIGcgPSBnYW1lLmFkZC5ncmFwaGljcygwLCAwKTtcbiAgICBnLmJlZ2luRmlsbCgweGZmZmZmZik7XG4gICAgZy5kcmF3UmVjdCgwLCAwLCBwaXhlbCwgcGl4ZWwpO1xuICAgIGcuZW5kRmlsbCgpO1xuICAgIHBvbmcudGV4dHVyZXMuYmFsbCA9IGcuZ2VuZXJhdGVUZXh0dXJlKCk7XG4gICAgZy5kZXN0cm95KCk7XG5cbiAgICAvLyBjZW50ZXIgbGluZTpcbiAgICB2YXIgeCA9IChnYW1lLndpZHRoIC0gcGl4ZWwpIC8gMjtcbiAgICBnID0gZ2FtZS5hZGQuZ3JhcGhpY3MoeCwgMCk7XG4gICAgdmFyIGwgPSAyKnBpeGVsO1xuICAgIGcuYmVnaW5GaWxsKDB4OTk5OTk5KTtcbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IGdhbWUuaGVpZ2h0OyB5ICs9IGwqMikge1xuICAgICAgICBnLmRyYXdSZWN0KDAsIHksIHBpeGVsLCBsKTtcbiAgICB9XG4gICAgZy5lbmRGaWxsKCk7XG4gICAgXG59XG4vLyBjcmVhdGVUZXh0dXJlcygpIDF9fX1cblxuIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgTW91c2VXaGVlbFBsYXllcjogTW91c2VXaGVlbFBsYXllcixcbiAgICBHb2RQbGF5ZXI6IEdvZFBsYXllcixcbiAgICBDb21wdXRlclBsYXllcjogQ29tcHV0ZXJQbGF5ZXIsXG4gICAgS2V5Ym9hcmRQbGF5ZXI6IEtleWJvYXJkUGxheWVyXG59O1xuXG4vKipcbiAqIHt7ezEgTW91c2VXaGVlbFBsYXllclxuICpcbiAqL1xuZnVuY3Rpb24gTW91c2VXaGVlbFBsYXllcihwYWRkbGUsIHBvbmcpIHtcbiAgICB0aGlzLnBhZGRsZSA9IHBhZGRsZTtcbiAgICB0aGlzLnBvbmcgPSBwb25nO1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLndoZWVsTGlzdGVuZXIgPSAoZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHRoaXMucG9uZy5wYXVzZWQpIHJldHVybjtcbiAgICAgICAgaWYgKGdhbWUuaW5wdXQubW91c2Uud2hlZWxEZWx0YSA9PT0gUGhhc2VyLk1vdXNlLldIRUVMX1VQKSB7XG4gICAgICAgICAgICB0aGlzLndoZWVsRGVsdGErKztcbiAgICAgICAgfSBlbHNlIGlmIChnYW1lLmlucHV0Lm1vdXNlLndoZWVsRGVsdGEgPT09IFBoYXNlci5Nb3VzZS5XSEVFTF9ET1dOKSB7XG4gICAgICAgICAgICB0aGlzLndoZWVsRGVsdGEtLTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3aGVlbCBkaWQgbmVpdGhlciBnbyB1cCBub3IgZG93bj8nKTtcbiAgICAgICAgfVxuICAgIH0pLmJpbmQodGhpcyk7XG59XG5cbk1vdXNlV2hlZWxQbGF5ZXIucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9lbmFibGVkKSByZXR1cm47XG4gICAgdGhpcy53aGVlbERlbHRhID0gMDtcbiAgICBpZiAoZ2FtZS5pbnB1dC5tb3VzZS5tb3VzZVdoZWVsQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coJ21vdXNlV2hlZWxDYWxsYmFjayBhbHJlYWR5IHJlZ2lzdGVyZWQhJyk7XG4gICAgfVxuICAgIHRoaXMucG9uZy5nYW1lLmlucHV0Lm1vdXNlLm1vdXNlV2hlZWxDYWxsYmFjayA9IHRoaXMud2hlZWxMaXN0ZW5lcjtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbn07XG5cbk1vdXNlV2hlZWxQbGF5ZXIucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX2VuYWJsZWQpIHJldHVybjtcbiAgICBnYW1lLmlucHV0Lm1vdXNlLm1vdXNlV2hlZWxDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xufTtcblxuTW91c2VXaGVlbFBsYXllci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLl9lbmFibGVkKSByZXR1cm47XG4gICAgaWYgKHRoaXMud2hlZWxEZWx0YSA9PT0gMCkgcmV0dXJuO1xuICAgIHZhciBzaWduID0gdGhpcy53aGVlbERlbHRhIDwgMD8gLTEgOiArMTtcbiAgICB2YXIgZHkgPSAtKHRoaXMud2hlZWxEZWx0YSkgKiAxNjtcbiAgICB0aGlzLnBhZGRsZS5tb3ZlKGR5KTtcbiAgICB0aGlzLndoZWVsRGVsdGEgLT0gc2lnbjtcbn07XG4vLzF9fX1cblxuXG4vKipcbiAqIHt7ezEgS2V5Ym9hcmRQbGF5ZXJcbiAqXG4gKi9cbmZ1bmN0aW9uIEtleWJvYXJkUGxheWVyKHBhZGRsZSwgcG9uZykge1xuICAgIHRoaXMucGFkZGxlID0gcGFkZGxlO1xuICAgIHRoaXMucG9uZyA9IHBvbmc7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xufVxuXG5LZXlib2FyZFBsYXllci5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKHRoaXMuX2VuYWJsZWQpIHJldHVybjtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbn07XG5cbktleWJvYXJkUGxheWVyLnByb3RvdHlwZS5kaXNhYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLl9lbmFibGVkKSByZXR1cm47XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xufTtcblxuS2V5Ym9hcmRQbGF5ZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5fZW5hYmxlZCkgcmV0dXJuO1xuICAgIHZhciBkeSA9IDA7XG4gICAgaWYgKHRoaXMucG9uZy5nYW1lLmlucHV0LmtleWJvYXJkLmlzRG93bihQaGFzZXIuS2V5Ym9hcmQuVVApKSB7XG4gICAgICAgIGR5IC09IDEwO1xuICAgIH1cbiAgICBpZiAodGhpcy5wb25nLmdhbWUuaW5wdXQua2V5Ym9hcmQuaXNEb3duKFBoYXNlci5LZXlib2FyZC5ET1dOKSkge1xuICAgICAgICBkeSArPSAxMDsgXG4gICAgfVxuICAgIHRoaXMucGFkZGxlLm1vdmUoZHkpO1xufTtcbi8vMX19fVxuXG4vKipcbiAqIHt7ezEgR29kUGxheWVyXG4gKi9cbmZ1bmN0aW9uIEdvZFBsYXllcihwYWRkbGUsIHBvbmcpIHtcbiAgICB0aGlzLnBhZGRsZSA9IHBhZGRsZTtcbiAgICB0aGlzLnBvbmcgPSBwb25nO1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbn1cblxuR29kUGxheWVyLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbn07XG5cbkdvZFBsYXllci5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbn07XG5cblxuR29kUGxheWVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX2VuYWJsZWQpIHJldHVybjtcbiAgICB0aGlzLnBhZGRsZS5zcHJpdGUuY2VudGVyWSA9IHRoaXMucG9uZy5iYWxsLnNwcml0ZS5jZW50ZXJZO1xufTtcbi8vMX19fVxuXG4vKipcbiAqIHt7ezEgQ29tcHV0ZXJQbGF5ZXJcbiAqIGRvZXMgbm90IHBsYXkgcGVyZmVjdC5cbiAqL1xuZnVuY3Rpb24gQ29tcHV0ZXJQbGF5ZXIocGFkZGxlLCBwb25nKSB7XG4gICAgdGhpcy5wYWRkbGUgPSBwYWRkbGU7XG4gICAgdGhpcy5wb25nID0gcG9uZztcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG4gICAgdGhpcy5fdGljayA9IDA7XG4gICAgdGhpcy5tYXhTcGVlZCA9IDIwO1xufVxuXG5Db21wdXRlclBsYXllci5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG59O1xuXG5Db21wdXRlclBsYXllci5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbn07XG5cblxuQ29tcHV0ZXJQbGF5ZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5fZW5hYmxlZCkgcmV0dXJuO1xuICAgIC8vIHNraXAgZXZlcnkgZWlndGggZnJhbWUgdG8gZ2l2ZSBodW1hbnMgYSBjaGFuY2VcbiAgICBcbiAgICB2YXIgYmFsbFNwcml0ZSA9IHRoaXMucG9uZy5iYWxsLnNwcml0ZTtcbiAgICB2YXIgcGFkZGxlU3ByaXRlID0gdGhpcy5wYWRkbGUuc3ByaXRlO1xuICAgIHZhciBkaXN0ID0gTWF0aC5hYnMocGFkZGxlU3ByaXRlLmNlbnRlclkgLSBiYWxsU3ByaXRlLmNlbnRlclkpO1xuICAgIHZhciBzcGVlZGYgPSB0aGlzLm1heFNwZWVkICogKE1hdGgucmFuZG9tKCkgLyAzICsgMC42NjY3KTtcbiAgICBpZiAoYmFsbFNwcml0ZS5ib3R0b20gPD0gcGFkZGxlU3ByaXRlLnRvcCkge1xuICAgICAgICB0aGlzLnBhZGRsZS5tb3ZlKC1zcGVlZGYpO1xuICAgIH0gZWxzZSBpZiAoYmFsbFNwcml0ZS50b3AgPj0gcGFkZGxlU3ByaXRlLmJvdHRvbSkge1xuICAgICAgICB0aGlzLnBhZGRsZS5tb3ZlKCtzcGVlZGYpO1xuICAgIH0gZWxzZSBpZiAoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTApID09PSAwKSB7XG4gICAgICAgIHRoaXMucGFkZGxlLm1vdmUoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhpcy5tYXhTcGVlZCoyIC0gdGhpcy5tYXhTcGVlZCkpO1xuICAgIH1cbn07XG4iXX0=
