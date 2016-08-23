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
    this.miny = miny;
    this.maxy = maxy;
    this.sprite = game.add.sprite(x, (maxy-miny) / 2 + miny, texture);
    this.sprite.anchor.set(0.5, 0.5);
}

Paddle.prototype.destroy = function() {
    this.sprite.destroy();
};

Paddle.prototype.move = function(dy) {
    var maxy = this.maxy - this.sprite.height;
    var y = Phaser.Math.clamp(this.sprite.y + dy, this.miny, maxy);
    this.sprite.y = y; 
};

Paddle.prototype.reset = function() {
    var center = (this.maxy-this.miny) / 2 + this.miny;
    this.sprite.reset(this.sprite.x, center);
};

Paddle.prototype.getReflection = function(hit) {
    var relativeY = this.sprite.centerY - hit.y;
    var sign = relativeY > 0? +1 : -1;
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
    this.reset();
}

Ball.prototype.reset = function() {
    this.sprite.x = this.initialX;
    this.sprite.y = this.initialY;
    this.velocity = new Phaser.Point(0, 0);
};

Ball.prototype.serve = function(side) {
    if (!side) side = Math.round(Math.random())? +1 : -1;
    this.sprite.reset(this.initialX, this.initialY);
    this.velocity.x = side < 0? -1 : +1;
    this.velocity.y = Math.random()*2 - 1;
    this.velocity.normalize().multiply(this.speed, this.speed);
};

Ball.prototype.update = function() {
    if (this.speed === 0 || this.velocity.x === 0 + this.velocity.y === 0) {
        return;
    }
    
    this.sprite.x += this.velocity.x;
    this.sprite.y += this.velocity.y;

    if (this.sprite.y < 0 || this.sprite.y >= this.sprite.game.height) {
        this.pong.playSound('wallhit');
        if (this.sprite.y < 0) 
            this.sprite.y = 0.1;
        else if (this.sprite.y >= this.sprite.game.height)
            this.sprite.y = this.sprite.game.height - 1.1;
            
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
        var vec = fromAngle(degrees).setMagnitude(speed * 1.05);
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
    pong.game = new Phaser.Game(800, 480, Phaser.CANVAS, 'pong', state);
    pong.controllers = [];
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
    pong.speed = 6;

    var top = 2*pixel,
        bottom = game.height - 2*pixel,
        left = 100,
        right = game.width - 100;

    var scoreboard1 = new entities.Scoreboard(game.width/4, top, game),
        paddle1 = new entities.Paddle(left, top, bottom, pong.textures.paddle, game);
    var scoreboard2 = new entities.Scoreboard(game.width/4*3 - 128, top, game),
        paddle2 = new entities.Paddle(right, top, bottom, pong.textures.paddle, game);
    var c1 = new player.MouseWheelPlayer(paddle1, pong),
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
        console.log(hitInfo);
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
    var ballPath = new Phaser.Line(
            ballSprite.x - pong.ball.velocity.x,
            ballSprite.y - pong.ball.velocity.y,
            ballSprite.x, ballSprite.y);
    var frontX = dir<0? paddleSprite.right : paddleSprite.left;
    var edge = new Phaser.Line(
            frontX, paddleSprite.top,
            frontX, paddleSprite.bottom);
    
    var hit = ballPath.intersects(edge, true);
    if (!hit) {
        edge.start.set(paddleSprite.left, paddleSprite.top);
        edge.end.set(paddleSprite.right, paddleSprite.top);
        hit = ballPath.intersects(edge, true);
        if (!hit) {
            edge.start.set(paddleSprite.left, paddleSprite.bottom);
            edge.end.set(paddleSprite.right, paddleSprite.bottom);
            hit = ballPath.intersects(edge, true);
        }
    }
    return hit? {
        side: 'front', 
        dir: dir,
        ballPath: ballPath, 
        edge: edge,
        hit: hit,
        player: player
    } : null;
}
//1}}}


//{{{1 createTextures()
function createTextures() {
    var g = game.add.graphics(0, 0);
    pong.textures = {};

    // paddle:
    g.beginFill(0xffffff);
    g.drawRect(0, 0, pixel, 4*pixel);
    g.endFill();
    pong.textures.paddle = g.generateTexture();
    g.clear();

    // ball:
    g.beginFill(0xffffff);
    g.drawRect(0, 0, pixel, pixel);
    g.endFill();
    pong.textures.ball = g.generateTexture();
    g.beginFill(0xffffff);
    g.drawRect(pixel, pixel, pixel, pixel);
    g.endFill();
    pong.textures.ball_nwse = g.generateTexture();
    g.clear();
    g.beginFill(0xffffff);
    g.drawRect(pixel, 0, pixel, pixel);
    g.drawRect(0, pixel, pixel, pixel);
    g.endFill();
    pong.textures.ball_nesw = g.generateTexture();
    g.clear();

    // center line:
    var l = 2*pixel;
    var x = (game.width - pixel) / 2;
    g.beginFill(0x999999);
    for (var y = 0; y < game.height; y += l*2) {
        g.drawRect(x, y, pixel, l);
    }
    g.endFill();
    
}
// createTextures() 1}}}

// render the frontal collision edge of both paddles
var edge1 = new Phaser.Line(0, 0, 0, 0), 
    edge2 = new Phaser.Line(0, 0, 0, 0);
function render() {
    function getEdge(paddleSprite, dir, out) {
        var frontX = dir<0? paddleSprite.right : paddleSprite.left;
        out.start.set(frontX, paddleSprite.top);
        out.end.set(frontX, paddleSprite.bottom);
    }
    getEdge(pong.player1.paddle.sprite, pong.player1.side, edge1);
    getEdge(pong.player2.paddle.sprite, pong.player2.side, edge2);
    game.debug.geom(edge1, '#ff00ff');
    game.debug.geom(edge2, '#ff00ff');

    if (!collision) return;
    game.debug.geom(collision.edge, '#00ff00');
    game.debug.geom(collision.ballPath, '#0000ff');
    game.debug.geom(collision.hit, '#ff0000');

}

},{"./entities.js":1,"./player.js":3}],3:[function(require,module,exports){
module.exports = {
    MouseWheelPlayer: MouseWheelPlayer,
    GodPlayer: GodPlayer,
    ComputerPlayer: ComputerPlayer
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
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvZW50aXRpZXMuanMiLCJzcmMvbWFpbi5qcyIsInNyYy9wbGF5ZXIuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdExBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqUUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSB7XG4gICAgUGFkZGxlOiBQYWRkbGUsXG4gICAgU2NvcmVib2FyZDogU2NvcmVib2FyZCxcbiAgICBCYWxsOiBCYWxsXG59O1xuXG52YXIgWkVSTyA9IG5ldyBQaGFzZXIuUG9pbnQoMCwgMCk7XG5mdW5jdGlvbiBmcm9tQW5nbGUoZGVncmVlcykge1xuICAgIHZhciByYWRzID0gZGVncmVlcyAqIChNYXRoLlBJLzE4MCk7XG4gICAgcmV0dXJuIG5ldyBQaGFzZXIuUG9pbnQoTWF0aC5jb3MocmFkcyksIE1hdGguc2luKHJhZHMpKTtcbn1cblxuLyoqIFxuICoge3t7MSBQYWRkbGVcbiAqIEBwYXJhbSB4IHtudW1iZXJ9IFRoZSB4IHBvc2l0aW9uIHRvIGNyZWF0ZSB0aGUgcGFkZGxlIG9uXG4gKi9cbmZ1bmN0aW9uIFBhZGRsZSh4LCBtaW55LCBtYXh5LCB0ZXh0dXJlLCBnYW1lKSB7XG4gICAgdGhpcy5taW55ID0gbWlueTtcbiAgICB0aGlzLm1heHkgPSBtYXh5O1xuICAgIHRoaXMuc3ByaXRlID0gZ2FtZS5hZGQuc3ByaXRlKHgsIChtYXh5LW1pbnkpIC8gMiArIG1pbnksIHRleHR1cmUpO1xuICAgIHRoaXMuc3ByaXRlLmFuY2hvci5zZXQoMC41LCAwLjUpO1xufVxuXG5QYWRkbGUucHJvdG90eXBlLmRlc3Ryb3kgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNwcml0ZS5kZXN0cm95KCk7XG59O1xuXG5QYWRkbGUucHJvdG90eXBlLm1vdmUgPSBmdW5jdGlvbihkeSkge1xuICAgIHZhciBtYXh5ID0gdGhpcy5tYXh5IC0gdGhpcy5zcHJpdGUuaGVpZ2h0O1xuICAgIHZhciB5ID0gUGhhc2VyLk1hdGguY2xhbXAodGhpcy5zcHJpdGUueSArIGR5LCB0aGlzLm1pbnksIG1heHkpO1xuICAgIHRoaXMuc3ByaXRlLnkgPSB5OyBcbn07XG5cblBhZGRsZS5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgY2VudGVyID0gKHRoaXMubWF4eS10aGlzLm1pbnkpIC8gMiArIHRoaXMubWlueTtcbiAgICB0aGlzLnNwcml0ZS5yZXNldCh0aGlzLnNwcml0ZS54LCBjZW50ZXIpO1xufTtcblxuUGFkZGxlLnByb3RvdHlwZS5nZXRSZWZsZWN0aW9uID0gZnVuY3Rpb24oaGl0KSB7XG4gICAgdmFyIHJlbGF0aXZlWSA9IHRoaXMuc3ByaXRlLmNlbnRlclkgLSBoaXQueTtcbiAgICB2YXIgc2lnbiA9IHJlbGF0aXZlWSA+IDA/ICsxIDogLTE7XG4gICAgdmFyIGxlZnQgPSBNYXRoLmFicyhyZWxhdGl2ZVkpO1xuICAgIHZhciBhbmdsZSA9IDA7XG4gICAgd2hpbGUgKGxlZnQgPiAwLjI1ICogdGhpcy5zcHJpdGUuaGVpZ2h0LzIpIHtcbiAgICAgICAgYW5nbGUgKz0gMTU7XG4gICAgICAgIGxlZnQgLT0gMC4yNSAqIHRoaXMuc3ByaXRlLmhlaWdodC8yO1xuICAgIH1cbiAgICByZXR1cm4gYW5nbGUgKiBzaWduO1xufTtcbi8vMX19fVxuXG4vKipcbiAqIHt7ezEgU2NvcmVib2FyZFxuICogS2VlcHMgdHJhY2sgb2Ygc2NvcmUgYW5kIGRpc3BsYXlzIGl0IHVzaW5nIHNwcml0ZXMuXG4gKi9cbmZ1bmN0aW9uIFNjb3JlYm9hcmQoeCwgeSwgZ2FtZSkge1xuICAgIHRoaXMuX2luaXQoeCwgeSwgZ2FtZSk7XG59XG5cblNjb3JlYm9hcmQucHJvdG90eXBlLl9pbml0ID0gZnVuY3Rpb24oeCwgeSwgZ2FtZSkge1xuICAgIHRoaXMuX3ggPSB4O1xuICAgIHRoaXMuX3kgPSB5O1xuICAgIHRoaXMuX2RpZ2l0cyA9IGdhbWUuYWRkLmdyb3VwKCk7XG4gICAgdGhpcy5fdGVucyA9IGdhbWUuYWRkLnNwcml0ZSh4LCB5LCAnZGlnaXRzJyk7XG4gICAgdGhpcy5fb25lcyA9IGdhbWUuYWRkLnNwcml0ZSh4ICsgdGhpcy5fdGVucy53aWR0aCwgeSwgJ2RpZ2l0cycpO1xuICAgIHRoaXMuX2RpZ2l0cy5hZGQodGhpcy5fdGVucyk7XG4gICAgdGhpcy5fZGlnaXRzLmFkZCh0aGlzLl9vbmVzKTtcbiAgICB0aGlzLnNldFNjb3JlKDApO1xufTtcblxuU2NvcmVib2FyZC5wcm90b3R5cGUuZGVzdHJveSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3RlbnMgPSBudWxsO1xuICAgIHRoaXMuX29uZXMgPSBudWxsO1xuICAgIHRoaXMuX2RpZ2l0cy5kZXN0cm95KCk7XG4gICAgdGhpcy5fZGlnaXRzID0gbnVsbDtcbn07XG5cblNjb3JlYm9hcmQucHJvdG90eXBlLnNldFZpc2libGUgPSBmdW5jdGlvbih2KSB7XG4gICAgdGhpcy5fZGlnaXRzLnZpc2libGUgPSB2O1xufTtcblxuU2NvcmVib2FyZC5wcm90b3R5cGUucmVzZXQgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLnNldFNjb3JlKDApO1xufTtcblxuU2NvcmVib2FyZC5wcm90b3R5cGUuc2V0U2NvcmUgPSBmdW5jdGlvbihzY29yZSkge1xuICAgIHRoaXMuc2NvcmUgPSBzY29yZTtcbiAgICB0aGlzLl9yZWZyZXNoKCk7XG59O1xuXG5TY29yZWJvYXJkLnByb3RvdHlwZS5hZGRTY29yZSA9IGZ1bmN0aW9uKG4pIHtcbiAgICB0aGlzLnNjb3JlICs9IG4gfHwgMTtcbiAgICB0aGlzLl9yZWZyZXNoKCk7XG59O1xuXG5TY29yZWJvYXJkLnByb3RvdHlwZS5fcmVmcmVzaCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX3RlbnMudmlzaWJsZSA9IHRoaXMuc2NvcmUgPj0gMTA7XG4gICAgdmFyIHNjb3JlID0gdGhpcy5zY29yZSAlIDEwMDtcbiAgICB0aGlzLl90ZW5zLmZyYW1lID0gTWF0aC5mbG9vcihzY29yZSAvIDEwKTtcbiAgICB0aGlzLl9vbmVzLmZyYW1lID0gc2NvcmUgJSAxMDtcbn07XG4vLzF9fX1cblxuXG5cbi8qKlxuICoge3t7MSBCYWxsXG4gKi9cbmZ1bmN0aW9uIEJhbGwoeCwgeSwgdGV4dHVyZSwgcG9uZykge1xuICAgIHRoaXMucG9uZyA9IHBvbmc7XG4gICAgdGhpcy5pbml0aWFsWCA9IHg7XG4gICAgdGhpcy5pbml0aWFsWSA9IHk7XG4gICAgdGhpcy5zcHJpdGUgPSBnYW1lLmFkZC5zcHJpdGUoeCwgeSwgdGV4dHVyZSk7XG4gICAgdGhpcy5zcHJpdGUuYW5jaG9yLnNldCgwLjUsIDAuNSk7XG4gICAgdGhpcy5zcGVlZCA9IHBvbmcuc3BlZWQ7XG4gICAgdGhpcy5yZXNldCgpO1xufVxuXG5CYWxsLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuc3ByaXRlLnggPSB0aGlzLmluaXRpYWxYO1xuICAgIHRoaXMuc3ByaXRlLnkgPSB0aGlzLmluaXRpYWxZO1xuICAgIHRoaXMudmVsb2NpdHkgPSBuZXcgUGhhc2VyLlBvaW50KDAsIDApO1xufTtcblxuQmFsbC5wcm90b3R5cGUuc2VydmUgPSBmdW5jdGlvbihzaWRlKSB7XG4gICAgaWYgKCFzaWRlKSBzaWRlID0gTWF0aC5yb3VuZChNYXRoLnJhbmRvbSgpKT8gKzEgOiAtMTtcbiAgICB0aGlzLnNwcml0ZS5yZXNldCh0aGlzLmluaXRpYWxYLCB0aGlzLmluaXRpYWxZKTtcbiAgICB0aGlzLnZlbG9jaXR5LnggPSBzaWRlIDwgMD8gLTEgOiArMTtcbiAgICB0aGlzLnZlbG9jaXR5LnkgPSBNYXRoLnJhbmRvbSgpKjIgLSAxO1xuICAgIHRoaXMudmVsb2NpdHkubm9ybWFsaXplKCkubXVsdGlwbHkodGhpcy5zcGVlZCwgdGhpcy5zcGVlZCk7XG59O1xuXG5CYWxsLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAodGhpcy5zcGVlZCA9PT0gMCB8fCB0aGlzLnZlbG9jaXR5LnggPT09IDAgKyB0aGlzLnZlbG9jaXR5LnkgPT09IDApIHtcbiAgICAgICAgcmV0dXJuO1xuICAgIH1cbiAgICBcbiAgICB0aGlzLnNwcml0ZS54ICs9IHRoaXMudmVsb2NpdHkueDtcbiAgICB0aGlzLnNwcml0ZS55ICs9IHRoaXMudmVsb2NpdHkueTtcblxuICAgIGlmICh0aGlzLnNwcml0ZS55IDwgMCB8fCB0aGlzLnNwcml0ZS55ID49IHRoaXMuc3ByaXRlLmdhbWUuaGVpZ2h0KSB7XG4gICAgICAgIHRoaXMucG9uZy5wbGF5U291bmQoJ3dhbGxoaXQnKTtcbiAgICAgICAgaWYgKHRoaXMuc3ByaXRlLnkgPCAwKSBcbiAgICAgICAgICAgIHRoaXMuc3ByaXRlLnkgPSAwLjE7XG4gICAgICAgIGVsc2UgaWYgKHRoaXMuc3ByaXRlLnkgPj0gdGhpcy5zcHJpdGUuZ2FtZS5oZWlnaHQpXG4gICAgICAgICAgICB0aGlzLnNwcml0ZS55ID0gdGhpcy5zcHJpdGUuZ2FtZS5oZWlnaHQgLSAxLjE7XG4gICAgICAgICAgICBcbiAgICAgICAgdGhpcy52ZWxvY2l0eS55ID0gLXRoaXMudmVsb2NpdHkueTtcbiAgICAgICAgdGhpcy5zcHJpdGUueSArPSB0aGlzLnZlbG9jaXR5Lnk7XG4gICAgfVxufTtcblxuXG5cbi8vICAgIHJldHVybiBoaXQ/IHtcbi8vICAgICAgICBzaWRlOiAnZnJvbnQnLCBcbi8vICAgICAgICBiYWxsUGF0aDogYmFsbFBhdGgsIFxuLy8gICAgICAgIGVkZ2U6IHBhZGRsZUZyb250LFxuLy8gICAgICAgIGhpdDogaGl0LFxuLy8gICAgICAgIHBsYXllcjogcGxheWVyXG4vLyAgICB9IDogbnVsbDtcbkJhbGwucHJvdG90eXBlLmJvdW5jZSA9IGZ1bmN0aW9uKGhpdEluZm8pIHtcbiAgICB2YXIgc3RhcnRUb0hpdCA9IFBoYXNlci5Qb2ludC5zdWJ0cmFjdChcbiAgICAgICAgICAgIGhpdEluZm8uYmFsbFBhdGguZW5kLFxuICAgICAgICAgICAgaGl0SW5mby5oaXQpO1xuICAgIHZhciBtb3ZlQmFjayA9IFBoYXNlci5Qb2ludC5ub3JtYWxpemUodGhpcy52ZWxvY2l0eSk7XG4gICAgbW92ZUJhY2sgPSBQaGFzZXIuUG9pbnQubmVnYXRpdmUobW92ZUJhY2ssIG1vdmVCYWNrKTtcbiAgICBtb3ZlQmFjay5zZXRNYWduaXR1ZGUoc3RhcnRUb0hpdC5nZXRNYWduaXR1ZGUoKSk7XG4gICAgdGhpcy5zcHJpdGUueCA9IGhpdEluZm8uYmFsbFBhdGguc3RhcnQueCArIG1vdmVCYWNrLng7XG4gICAgdGhpcy5zcHJpdGUueSA9IGhpdEluZm8uYmFsbFBhdGguc3RhcnQueSArIG1vdmVCYWNrLnk7XG4gICAgaWYgKGhpdEluZm8uc2lkZSAhPT0gJ2Zyb250Jykge1xuICAgICAgICB0aGlzLnZlbG9jaXR5LnkgPSAtdGhpcy52ZWxvY2l0eS55O1xuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBzcGVlZCA9IHRoaXMudmVsb2NpdHkuZ2V0TWFnbml0dWRlKCk7XG4gICAgICAgIHZhciBkZWdyZWVzID0gaGl0SW5mby5wbGF5ZXIucGFkZGxlLmdldFJlZmxlY3Rpb24oaGl0SW5mby5oaXQpO1xuICAgICAgICB2YXIgdmVjID0gZnJvbUFuZ2xlKGRlZ3JlZXMpLnNldE1hZ25pdHVkZShzcGVlZCAqIDEuMDUpO1xuICAgICAgICAgICAgaWYgKHRoaXMudmVsb2NpdHkueCA+IDApIHZlYy54ICo9IC0xO1xuICAgICAgICB0aGlzLnZlbG9jaXR5ID0gdmVjO1xuICAgIH1cbn07XG5cbi8vMX19fVxuIiwiLy8ge3t7MSBEb21pbmlrJ3MgYXdlc29tZSBQb25nIGNsb25lXG4vLyBcbi8vIENvcHlyaWdodCAoYykgMjAxNiBEb21pbmlrIFJvc2VobmFsXG4vLyBcbi8vIFBlcm1pc3Npb24gaXMgaGVyZWJ5IGdyYW50ZWQsIGZyZWUgb2YgY2hhcmdlLCB0byBhbnkgcGVyc29uIG9idGFpbmluZyBhIGNvcHkgb2Zcbi8vIHRoaXMgc29mdHdhcmUgYW5kIGFzc29jaWF0ZWQgZG9jdW1lbnRhdGlvbiBmaWxlcyAodGhlIFwiU29mdHdhcmVcIiksIHRvIGRlYWwgaW5cbi8vIHRoZSBTb2Z0d2FyZSB3aXRob3V0IHJlc3RyaWN0aW9uLCBpbmNsdWRpbmcgd2l0aG91dCBsaW1pdGF0aW9uIHRoZSByaWdodHMgdG9cbi8vIHVzZSwgY29weSwgbW9kaWZ5LCBtZXJnZSwgcHVibGlzaCwgZGlzdHJpYnV0ZSwgc3VibGljZW5zZSwgYW5kL29yIHNlbGwgY29waWVzXG4vLyBvZiB0aGUgU29mdHdhcmUsIGFuZCB0byBwZXJtaXQgcGVyc29ucyB0byB3aG9tIHRoZSBTb2Z0d2FyZSBpcyBmdXJuaXNoZWQgdG8gZG9cbi8vIHNvLCBzdWJqZWN0IHRvIHRoZSBmb2xsb3dpbmcgY29uZGl0aW9uczpcbi8vIFxuLy8gVGhlIGFib3ZlIGNvcHlyaWdodCBub3RpY2UgYW5kIHRoaXMgcGVybWlzc2lvbiBub3RpY2Ugc2hhbGwgYmUgaW5jbHVkZWQgaW4gYWxsXG4vLyBjb3BpZXMgb3Igc3Vic3RhbnRpYWwgcG9ydGlvbnMgb2YgdGhlIFNvZnR3YXJlLlxuLy8gXG4vLyBUSEUgU09GVFdBUkUgSVMgUFJPVklERUQgXCJBUyBJU1wiLCBXSVRIT1VUIFdBUlJBTlRZIE9GIEFOWSBLSU5ELCBFWFBSRVNTIE9SXG4vLyBJTVBMSUVELCBJTkNMVURJTkcgQlVUIE5PVCBMSU1JVEVEIFRPIFRIRSBXQVJSQU5USUVTIE9GIE1FUkNIQU5UQUJJTElUWSxcbi8vIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFIEFORCBOT05JTkZSSU5HRU1FTlQuIElOIE5PIEVWRU5UIFNIQUxMIFRIRVxuLy8gQVVUSE9SUyBPUiBDT1BZUklHSFQgSE9MREVSUyBCRSBMSUFCTEUgRk9SIEFOWSBDTEFJTSwgREFNQUdFUyBPUiBPVEhFUlxuLy8gTElBQklMSVRZLCBXSEVUSEVSIElOIEFOIEFDVElPTiBPRiBDT05UUkFDVCwgVE9SVCBPUiBPVEhFUldJU0UsIEFSSVNJTkdcbi8vIEZST00sIE9VVCBPRiBPUiBJTiBDT05ORUNUSU9OIFdJVEggVEhFIFNPRlRXQVJFIE9SIFRIRSBVU0UgT1IgT1RIRVJcbi8vIERFQUxJTkdTIElOIFRIRSBTT0ZUV0FSRS5cbi8vIDF9fX1cblxudmFyIGVudGl0aWVzID0gcmVxdWlyZSgnLi9lbnRpdGllcy5qcycpO1xudmFyIHBsYXllciA9IHJlcXVpcmUoJy4vcGxheWVyLmpzJyk7XG5cbnZhciBwb25nID0gbWFpbigpO1xudmFyIGdhbWUgPSBwb25nLmdhbWU7XG52YXIgcGl4ZWwgPSA4O1xuXG4vL3t7ezEgbWFpbigpXG5mdW5jdGlvbiBtYWluKCkge1xuICAgIFwidXNlIHN0cmljdFwiO1xuICAgIHZhciBwb25nID0ge307XG4gICAgcG9uZy5wYXVzZSA9IGZhbHNlO1xuICAgIHZhciBzdGF0ZSA9IHtwcmVsb2FkOiBwcmVsb2FkLCBjcmVhdGU6IGNyZWF0ZSwgdXBkYXRlOiB1cGRhdGUsIHJlbmRlcjogcmVuZGVyfTtcbiAgICBwb25nLmdhbWUgPSBuZXcgUGhhc2VyLkdhbWUoODAwLCA0ODAsIFBoYXNlci5DQU5WQVMsICdwb25nJywgc3RhdGUpO1xuICAgIHBvbmcuY29udHJvbGxlcnMgPSBbXTtcbiAgICB3aW5kb3cucG9uZyA9IHBvbmc7XG4gICAgd2luZG93LmdhbWUgPSBwb25nLmdhbWU7XG4gICAgcmV0dXJuIHBvbmc7XG59XG4vLzF9fX1cblxuLy97e3sxIHByZWxvYWQoKVxuZnVuY3Rpb24gcHJlbG9hZCgpIHtcbiAgICBnYW1lLmxvYWQuc3ByaXRlc2hlZXQoJ2RpZ2l0cycsICdpbWcvZGlnaXRzLnBuZycsIDY0LCA2NCk7XG4gICAgZ2FtZS5sb2FkLmF1ZGlvKCd3YWxsaGl0JywgJ3NvdW5kL3dhbGxoaXQubXAzJyk7XG4gICAgZ2FtZS5sb2FkLmF1ZGlvKCdwYWRkbGVoaXQnLCAnc291bmQvcGFkZGxlaGl0Lm1wMycpO1xuICAgIGdhbWUubG9hZC5hdWRpbygnb3V0JywgJ3NvdW5kL291dC5tcDMnKTtcbn1cbi8vMX19fVxuXG4vLyB7e3sxIGNyZWF0ZSgpXG5mdW5jdGlvbiBjcmVhdGUoKSB7XG4gICAgY3JlYXRlVGV4dHVyZXMoKTtcbiAgICAvL0RFQlVHOiBwcmV2ZW50IHBhdXNlIG9uIGZvY3VzIGxvc3NcbiAgICAvL3BvbmcuZ2FtZS5zdGFnZS5kaXNhYmxlVmlzaWJpbGl0eUNoYW5nZSA9IHRydWU7XG4gICAgcG9uZy5zZnggPSB7fTtcbiAgICBwb25nLnNmeC53YWxsaGl0ID0gZ2FtZS5hZGQuYXVkaW8oJ3dhbGxoaXQnKTtcbiAgICBwb25nLnNmeC5wYWRkbGVoaXQgPSBnYW1lLmFkZC5hdWRpbygncGFkZGxlaGl0Jyk7XG4gICAgcG9uZy5zZngub3V0ID0gZ2FtZS5hZGQuYXVkaW8oJ291dCcpO1xuICAgIHBvbmcubXV0ZSA9IGZhbHNlO1xuICAgIHBvbmcuc3BlZWQgPSA2O1xuXG4gICAgdmFyIHRvcCA9IDIqcGl4ZWwsXG4gICAgICAgIGJvdHRvbSA9IGdhbWUuaGVpZ2h0IC0gMipwaXhlbCxcbiAgICAgICAgbGVmdCA9IDEwMCxcbiAgICAgICAgcmlnaHQgPSBnYW1lLndpZHRoIC0gMTAwO1xuXG4gICAgdmFyIHNjb3JlYm9hcmQxID0gbmV3IGVudGl0aWVzLlNjb3JlYm9hcmQoZ2FtZS53aWR0aC80LCB0b3AsIGdhbWUpLFxuICAgICAgICBwYWRkbGUxID0gbmV3IGVudGl0aWVzLlBhZGRsZShsZWZ0LCB0b3AsIGJvdHRvbSwgcG9uZy50ZXh0dXJlcy5wYWRkbGUsIGdhbWUpO1xuICAgIHZhciBzY29yZWJvYXJkMiA9IG5ldyBlbnRpdGllcy5TY29yZWJvYXJkKGdhbWUud2lkdGgvNCozIC0gMTI4LCB0b3AsIGdhbWUpLFxuICAgICAgICBwYWRkbGUyID0gbmV3IGVudGl0aWVzLlBhZGRsZShyaWdodCwgdG9wLCBib3R0b20sIHBvbmcudGV4dHVyZXMucGFkZGxlLCBnYW1lKTtcbiAgICB2YXIgYzEgPSBuZXcgcGxheWVyLk1vdXNlV2hlZWxQbGF5ZXIocGFkZGxlMSwgcG9uZyksXG4gICAgICAgIGMyID0gbmV3IHBsYXllci5Hb2RQbGF5ZXIocGFkZGxlMiwgcG9uZyk7XG5cbiAgICBwb25nLnBsYXllcjEgPSB7XG4gICAgICAgIHNjb3JlYm9hcmQ6IHNjb3JlYm9hcmQxLFxuICAgICAgICBwYWRkbGU6IHBhZGRsZTEsXG4gICAgICAgIGNvbnRyb2xsZXI6IGMxLFxuICAgICAgICBzaWRlOiAtMVxuICAgIH07XG4gICAgcG9uZy5wbGF5ZXIyID0ge1xuICAgICAgICBzY29yZWJvYXJkOiBzY29yZWJvYXJkMixcbiAgICAgICAgcGFkZGxlOiBwYWRkbGUyLFxuICAgICAgICBjb250cm9sbGVyOiBjMixcbiAgICAgICAgc2lkZTogKzEsXG4gICAgfTtcbiAgICBwb25nLnBsYXllcjEub3RoZXIgPSBwb25nLnBsYXllcjI7XG4gICAgcG9uZy5wbGF5ZXIyLm90aGVyID0gcG9uZy5wbGF5ZXIxO1xuICAgIFxuICAgIHBvbmcuYmFsbCA9IG5ldyBlbnRpdGllcy5CYWxsKGdhbWUud2lkdGgvMiwgZ2FtZS5oZWlnaHQvMixcbiAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICBwb25nLnRleHR1cmVzLmJhbGwsIHBvbmcpO1xuXG5cbiAgICBwb25nLmNvbnRyb2xsZXJzID0gW3BvbmcuYmFsbCwgYzEsIGMyXTtcbiAgICBjMS5lbmFibGUoKTtcbiAgICBjMi5lbmFibGUoKTtcbiAgICBwb25nLnBhdXNlZCA9IGZhbHNlO1xuICAgIHBvbmcuYmFsbC5zZXJ2ZSgpO1xuXG4gICAgcG9uZy5wbGF5U291bmQgPSBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgaWYgKHBvbmcubXV0ZSkgcmV0dXJuO1xuICAgICAgICB2YXIgc291bmQgPSBwb25nLnNmeFtrZXldO1xuICAgICAgICBpZiAoIXNvdW5kKSB7XG4gICAgICAgICAgICBjb25zb2xlLmxvZygnc291bmQgbm90IGZvdW5kOiAnLCBrZXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgc291bmQucGxheSgpO1xuICAgICAgICB9XG4gICAgfTtcblxuICAgIGdhbWUuaW5wdXQub25Eb3duLmFkZChmdW5jdGlvbigpIHtcbiAgICAgICAgZ2FtZS5wYXVzZWQgPSAhZ2FtZS5wYXVzZWQ7XG4gICAgfSk7XG59XG4vLzF9fX1cblxuXG52YXIgY29sbGlzaW9uO1xuLy97e3sxIHVwZGF0ZSgpXG5mdW5jdGlvbiB1cGRhdGUoKSB7XG4gICAgaWYgKHBvbmcucGF1c2VkKSByZXR1cm47XG4gICAgcG9uZy5jb250cm9sbGVycy5mb3JFYWNoKGZ1bmN0aW9uKGMpIHtcbiAgICAgICBjLnVwZGF0ZSgpO1xuICAgIH0pOyBcbiAgICB2YXIgaGl0SW5mbyA9IGhpdFRlc3QoKTtcbiAgICBpZiAoaGl0SW5mbykge1xuICAgICAgICBjb2xsaXNpb24gPSBoaXRJbmZvO1xuICAgICAgICBjb25zb2xlLmxvZyhoaXRJbmZvKTtcbiAgICAgICAgcG9uZy5iYWxsLmJvdW5jZShoaXRJbmZvKTtcbiAgICAgICAgLy9nYW1lLnBhdXNlZCA9IHRydWU7XG4gICAgICAgIHBvbmcucGxheVNvdW5kKCdwYWRkbGVoaXQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIgc2NvcmVkUGxheWVyID0gY2hlY2tNaXNzKCk7XG4gICAgICAgIGlmIChzY29yZWRQbGF5ZXIpIHNjb3JlKHNjb3JlZFBsYXllcik7XG4gICAgfVxuXG59XG4vLzF9fX1cblxuLy8gaWYgdGhlIGJhbGwgbGVmdCB0aGUgZmllbGQsIHJldHVybiB0aGUgcGxheWVyIHdobyBzY29yZXNcbmZ1bmN0aW9uIGNoZWNrTWlzcygpIHtcbiAgICBpZiAocG9uZy5iYWxsLnNwcml0ZS5yaWdodCA8IDApIHJldHVybiBwb25nLnBsYXllcjI7XG4gICAgaWYgKHBvbmcuYmFsbC5zcHJpdGUubGVmdCA+PSBwb25nLmdhbWUud2lkdGgpIHJldHVybiBwb25nLnBsYXllcjE7XG59XG5cbmZ1bmN0aW9uIHNjb3JlKHBsYXllcikge1xuICAgIHBvbmcucGxheVNvdW5kKCdvdXQnKTtcbiAgICBwbGF5ZXIuc2NvcmVib2FyZC5hZGRTY29yZSgpO1xuICAgIHBvbmcuYmFsbC5yZXNldCgpO1xuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24oKSB7XG4gICAgICAgIHBvbmcuYmFsbC5zZXJ2ZShwbGF5ZXIub3RoZXIuc2lkZSk7XG4gICAgfSwgMTAwMCk7XG59XG5cbi8ve3t7MSBoaXRUZXN0KClcbmZ1bmN0aW9uIGhpdFRlc3QoKSB7XG4gICAgaWYgKHBvbmcuYmFsbC52ZWxvY2l0eS54ID09PSAwKSByZXR1cm4gZmFsc2U7XG4gICAgLy8gb25seSBjaGVjayB0aGUgcGFkZGxlIG9uIHRoZSBzaWRlIHRoZSBiYWxsIGlzIHRyYXZlbGxpbmcgdG9cbiAgICB2YXIgZGlyID0gcG9uZy5iYWxsLnZlbG9jaXR5LnggPCAwPyAtMSA6ICsxLFxuICAgICAgICBwbGF5ZXIgPSBwb25nLnBsYXllcjEuc2lkZSA9PT0gZGlyPyBwb25nLnBsYXllcjEgOiBwb25nLnBsYXllcjIsXG4gICAgICAgIGJhbGxTcHJpdGUgPSBwb25nLmJhbGwuc3ByaXRlLFxuICAgICAgICBwYWRkbGVTcHJpdGUgPSBwbGF5ZXIucGFkZGxlLnNwcml0ZTtcbiAgICB2YXIgYmFsbFBhdGggPSBuZXcgUGhhc2VyLkxpbmUoXG4gICAgICAgICAgICBiYWxsU3ByaXRlLnggLSBwb25nLmJhbGwudmVsb2NpdHkueCxcbiAgICAgICAgICAgIGJhbGxTcHJpdGUueSAtIHBvbmcuYmFsbC52ZWxvY2l0eS55LFxuICAgICAgICAgICAgYmFsbFNwcml0ZS54LCBiYWxsU3ByaXRlLnkpO1xuICAgIHZhciBmcm9udFggPSBkaXI8MD8gcGFkZGxlU3ByaXRlLnJpZ2h0IDogcGFkZGxlU3ByaXRlLmxlZnQ7XG4gICAgdmFyIGVkZ2UgPSBuZXcgUGhhc2VyLkxpbmUoXG4gICAgICAgICAgICBmcm9udFgsIHBhZGRsZVNwcml0ZS50b3AsXG4gICAgICAgICAgICBmcm9udFgsIHBhZGRsZVNwcml0ZS5ib3R0b20pO1xuICAgIFxuICAgIHZhciBoaXQgPSBiYWxsUGF0aC5pbnRlcnNlY3RzKGVkZ2UsIHRydWUpO1xuICAgIGlmICghaGl0KSB7XG4gICAgICAgIGVkZ2Uuc3RhcnQuc2V0KHBhZGRsZVNwcml0ZS5sZWZ0LCBwYWRkbGVTcHJpdGUudG9wKTtcbiAgICAgICAgZWRnZS5lbmQuc2V0KHBhZGRsZVNwcml0ZS5yaWdodCwgcGFkZGxlU3ByaXRlLnRvcCk7XG4gICAgICAgIGhpdCA9IGJhbGxQYXRoLmludGVyc2VjdHMoZWRnZSwgdHJ1ZSk7XG4gICAgICAgIGlmICghaGl0KSB7XG4gICAgICAgICAgICBlZGdlLnN0YXJ0LnNldChwYWRkbGVTcHJpdGUubGVmdCwgcGFkZGxlU3ByaXRlLmJvdHRvbSk7XG4gICAgICAgICAgICBlZGdlLmVuZC5zZXQocGFkZGxlU3ByaXRlLnJpZ2h0LCBwYWRkbGVTcHJpdGUuYm90dG9tKTtcbiAgICAgICAgICAgIGhpdCA9IGJhbGxQYXRoLmludGVyc2VjdHMoZWRnZSwgdHJ1ZSk7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIGhpdD8ge1xuICAgICAgICBzaWRlOiAnZnJvbnQnLCBcbiAgICAgICAgZGlyOiBkaXIsXG4gICAgICAgIGJhbGxQYXRoOiBiYWxsUGF0aCwgXG4gICAgICAgIGVkZ2U6IGVkZ2UsXG4gICAgICAgIGhpdDogaGl0LFxuICAgICAgICBwbGF5ZXI6IHBsYXllclxuICAgIH0gOiBudWxsO1xufVxuLy8xfX19XG5cblxuLy97e3sxIGNyZWF0ZVRleHR1cmVzKClcbmZ1bmN0aW9uIGNyZWF0ZVRleHR1cmVzKCkge1xuICAgIHZhciBnID0gZ2FtZS5hZGQuZ3JhcGhpY3MoMCwgMCk7XG4gICAgcG9uZy50ZXh0dXJlcyA9IHt9O1xuXG4gICAgLy8gcGFkZGxlOlxuICAgIGcuYmVnaW5GaWxsKDB4ZmZmZmZmKTtcbiAgICBnLmRyYXdSZWN0KDAsIDAsIHBpeGVsLCA0KnBpeGVsKTtcbiAgICBnLmVuZEZpbGwoKTtcbiAgICBwb25nLnRleHR1cmVzLnBhZGRsZSA9IGcuZ2VuZXJhdGVUZXh0dXJlKCk7XG4gICAgZy5jbGVhcigpO1xuXG4gICAgLy8gYmFsbDpcbiAgICBnLmJlZ2luRmlsbCgweGZmZmZmZik7XG4gICAgZy5kcmF3UmVjdCgwLCAwLCBwaXhlbCwgcGl4ZWwpO1xuICAgIGcuZW5kRmlsbCgpO1xuICAgIHBvbmcudGV4dHVyZXMuYmFsbCA9IGcuZ2VuZXJhdGVUZXh0dXJlKCk7XG4gICAgZy5iZWdpbkZpbGwoMHhmZmZmZmYpO1xuICAgIGcuZHJhd1JlY3QocGl4ZWwsIHBpeGVsLCBwaXhlbCwgcGl4ZWwpO1xuICAgIGcuZW5kRmlsbCgpO1xuICAgIHBvbmcudGV4dHVyZXMuYmFsbF9ud3NlID0gZy5nZW5lcmF0ZVRleHR1cmUoKTtcbiAgICBnLmNsZWFyKCk7XG4gICAgZy5iZWdpbkZpbGwoMHhmZmZmZmYpO1xuICAgIGcuZHJhd1JlY3QocGl4ZWwsIDAsIHBpeGVsLCBwaXhlbCk7XG4gICAgZy5kcmF3UmVjdCgwLCBwaXhlbCwgcGl4ZWwsIHBpeGVsKTtcbiAgICBnLmVuZEZpbGwoKTtcbiAgICBwb25nLnRleHR1cmVzLmJhbGxfbmVzdyA9IGcuZ2VuZXJhdGVUZXh0dXJlKCk7XG4gICAgZy5jbGVhcigpO1xuXG4gICAgLy8gY2VudGVyIGxpbmU6XG4gICAgdmFyIGwgPSAyKnBpeGVsO1xuICAgIHZhciB4ID0gKGdhbWUud2lkdGggLSBwaXhlbCkgLyAyO1xuICAgIGcuYmVnaW5GaWxsKDB4OTk5OTk5KTtcbiAgICBmb3IgKHZhciB5ID0gMDsgeSA8IGdhbWUuaGVpZ2h0OyB5ICs9IGwqMikge1xuICAgICAgICBnLmRyYXdSZWN0KHgsIHksIHBpeGVsLCBsKTtcbiAgICB9XG4gICAgZy5lbmRGaWxsKCk7XG4gICAgXG59XG4vLyBjcmVhdGVUZXh0dXJlcygpIDF9fX1cblxuLy8gcmVuZGVyIHRoZSBmcm9udGFsIGNvbGxpc2lvbiBlZGdlIG9mIGJvdGggcGFkZGxlc1xudmFyIGVkZ2UxID0gbmV3IFBoYXNlci5MaW5lKDAsIDAsIDAsIDApLCBcbiAgICBlZGdlMiA9IG5ldyBQaGFzZXIuTGluZSgwLCAwLCAwLCAwKTtcbmZ1bmN0aW9uIHJlbmRlcigpIHtcbiAgICBmdW5jdGlvbiBnZXRFZGdlKHBhZGRsZVNwcml0ZSwgZGlyLCBvdXQpIHtcbiAgICAgICAgdmFyIGZyb250WCA9IGRpcjwwPyBwYWRkbGVTcHJpdGUucmlnaHQgOiBwYWRkbGVTcHJpdGUubGVmdDtcbiAgICAgICAgb3V0LnN0YXJ0LnNldChmcm9udFgsIHBhZGRsZVNwcml0ZS50b3ApO1xuICAgICAgICBvdXQuZW5kLnNldChmcm9udFgsIHBhZGRsZVNwcml0ZS5ib3R0b20pO1xuICAgIH1cbiAgICBnZXRFZGdlKHBvbmcucGxheWVyMS5wYWRkbGUuc3ByaXRlLCBwb25nLnBsYXllcjEuc2lkZSwgZWRnZTEpO1xuICAgIGdldEVkZ2UocG9uZy5wbGF5ZXIyLnBhZGRsZS5zcHJpdGUsIHBvbmcucGxheWVyMi5zaWRlLCBlZGdlMik7XG4gICAgZ2FtZS5kZWJ1Zy5nZW9tKGVkZ2UxLCAnI2ZmMDBmZicpO1xuICAgIGdhbWUuZGVidWcuZ2VvbShlZGdlMiwgJyNmZjAwZmYnKTtcblxuICAgIGlmICghY29sbGlzaW9uKSByZXR1cm47XG4gICAgZ2FtZS5kZWJ1Zy5nZW9tKGNvbGxpc2lvbi5lZGdlLCAnIzAwZmYwMCcpO1xuICAgIGdhbWUuZGVidWcuZ2VvbShjb2xsaXNpb24uYmFsbFBhdGgsICcjMDAwMGZmJyk7XG4gICAgZ2FtZS5kZWJ1Zy5nZW9tKGNvbGxpc2lvbi5oaXQsICcjZmYwMDAwJyk7XG5cbn1cbiIsIm1vZHVsZS5leHBvcnRzID0ge1xuICAgIE1vdXNlV2hlZWxQbGF5ZXI6IE1vdXNlV2hlZWxQbGF5ZXIsXG4gICAgR29kUGxheWVyOiBHb2RQbGF5ZXIsXG4gICAgQ29tcHV0ZXJQbGF5ZXI6IENvbXB1dGVyUGxheWVyXG59O1xuXG4vKipcbiAqIHt7ezEgTW91c2VXaGVlbFBsYXllclxuICpcbiAqL1xuZnVuY3Rpb24gTW91c2VXaGVlbFBsYXllcihwYWRkbGUsIHBvbmcpIHtcbiAgICB0aGlzLnBhZGRsZSA9IHBhZGRsZTtcbiAgICB0aGlzLnBvbmcgPSBwb25nO1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbiAgICB0aGlzLndoZWVsTGlzdGVuZXIgPSAoZnVuY3Rpb24oZXZlbnQpIHtcbiAgICAgICAgaWYgKHRoaXMucG9uZy5wYXVzZWQpIHJldHVybjtcbiAgICAgICAgaWYgKGdhbWUuaW5wdXQubW91c2Uud2hlZWxEZWx0YSA9PT0gUGhhc2VyLk1vdXNlLldIRUVMX1VQKSB7XG4gICAgICAgICAgICB0aGlzLndoZWVsRGVsdGErKztcbiAgICAgICAgfSBlbHNlIGlmIChnYW1lLmlucHV0Lm1vdXNlLndoZWVsRGVsdGEgPT09IFBoYXNlci5Nb3VzZS5XSEVFTF9ET1dOKSB7XG4gICAgICAgICAgICB0aGlzLndoZWVsRGVsdGEtLTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGNvbnNvbGUubG9nKCd3aGVlbCBkaWQgbmVpdGhlciBnbyB1cCBub3IgZG93bj8nKTtcbiAgICAgICAgfVxuICAgIH0pLmJpbmQodGhpcyk7XG59XG5cbk1vdXNlV2hlZWxQbGF5ZXIucHJvdG90eXBlLmVuYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICh0aGlzLl9lbmFibGVkKSByZXR1cm47XG4gICAgdGhpcy53aGVlbERlbHRhID0gMDtcbiAgICBpZiAoZ2FtZS5pbnB1dC5tb3VzZS5tb3VzZVdoZWVsQ2FsbGJhY2spIHtcbiAgICAgICAgY29uc29sZS5sb2coJ21vdXNlV2hlZWxDYWxsYmFjayBhbHJlYWR5IHJlZ2lzdGVyZWQhJyk7XG4gICAgfVxuICAgIHRoaXMucG9uZy5nYW1lLmlucHV0Lm1vdXNlLm1vdXNlV2hlZWxDYWxsYmFjayA9IHRoaXMud2hlZWxMaXN0ZW5lcjtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbn07XG5cbk1vdXNlV2hlZWxQbGF5ZXIucHJvdG90eXBlLmRpc2FibGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX2VuYWJsZWQpIHJldHVybjtcbiAgICBnYW1lLmlucHV0Lm1vdXNlLm1vdXNlV2hlZWxDYWxsYmFjayA9IG51bGw7XG4gICAgdGhpcy5fZW5hYmxlZCA9IGZhbHNlO1xufTtcblxuTW91c2VXaGVlbFBsYXllci5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgaWYgKCF0aGlzLl9lbmFibGVkKSByZXR1cm47XG4gICAgaWYgKHRoaXMud2hlZWxEZWx0YSA9PT0gMCkgcmV0dXJuO1xuICAgIHZhciBzaWduID0gdGhpcy53aGVlbERlbHRhIDwgMD8gLTEgOiArMTtcbiAgICB2YXIgZHkgPSAtKHRoaXMud2hlZWxEZWx0YSkgKiAxNjtcbiAgICB0aGlzLnBhZGRsZS5tb3ZlKGR5KTtcbiAgICB0aGlzLndoZWVsRGVsdGEgLT0gc2lnbjtcbn07XG4vLzF9fX1cblxuXG4vKipcbiAqIHt7ezEgR29kUGxheWVyXG4gKi9cbmZ1bmN0aW9uIEdvZFBsYXllcihwYWRkbGUsIHBvbmcpIHtcbiAgICB0aGlzLnBhZGRsZSA9IHBhZGRsZTtcbiAgICB0aGlzLnBvbmcgPSBwb25nO1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbn1cblxuR29kUGxheWVyLnByb3RvdHlwZS5lbmFibGUgPSBmdW5jdGlvbigpIHtcbiAgICB0aGlzLl9lbmFibGVkID0gdHJ1ZTtcbn07XG5cbkdvZFBsYXllci5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbn07XG5cblxuR29kUGxheWVyLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAoIXRoaXMuX2VuYWJsZWQpIHJldHVybjtcbiAgICB0aGlzLnBhZGRsZS5zcHJpdGUuY2VudGVyWSA9IHRoaXMucG9uZy5iYWxsLnNwcml0ZS5jZW50ZXJZO1xufTtcbi8vMX19fVxuXG4vKipcbiAqIHt7ezEgQ29tcHV0ZXJQbGF5ZXJcbiAqIGRvZXMgbm90IHBsYXkgcGVyZmVjdC5cbiAqL1xuZnVuY3Rpb24gQ29tcHV0ZXJQbGF5ZXIocGFkZGxlLCBwb25nKSB7XG4gICAgdGhpcy5wYWRkbGUgPSBwYWRkbGU7XG4gICAgdGhpcy5wb25nID0gcG9uZztcbiAgICB0aGlzLl9lbmFibGVkID0gZmFsc2U7XG4gICAgdGhpcy5fdGljayA9IDA7XG4gICAgdGhpcy5tYXhTcGVlZCA9IDIwO1xufVxuXG5Db21wdXRlclBsYXllci5wcm90b3R5cGUuZW5hYmxlID0gZnVuY3Rpb24oKSB7XG4gICAgdGhpcy5fZW5hYmxlZCA9IHRydWU7XG59O1xuXG5Db21wdXRlclBsYXllci5wcm90b3R5cGUuZGlzYWJsZSA9IGZ1bmN0aW9uKCkge1xuICAgIHRoaXMuX2VuYWJsZWQgPSBmYWxzZTtcbn07XG5cblxuQ29tcHV0ZXJQbGF5ZXIucHJvdG90eXBlLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgIGlmICghdGhpcy5fZW5hYmxlZCkgcmV0dXJuO1xuICAgIC8vIHNraXAgZXZlcnkgZWlndGggZnJhbWUgdG8gZ2l2ZSBodW1hbnMgYSBjaGFuY2VcbiAgICBcbiAgICB2YXIgYmFsbFNwcml0ZSA9IHRoaXMucG9uZy5iYWxsLnNwcml0ZTtcbiAgICB2YXIgcGFkZGxlU3ByaXRlID0gdGhpcy5wYWRkbGUuc3ByaXRlO1xuICAgIHZhciBkaXN0ID0gTWF0aC5hYnMocGFkZGxlU3ByaXRlLmNlbnRlclkgLSBiYWxsU3ByaXRlLmNlbnRlclkpO1xuICAgIHZhciBzcGVlZGYgPSB0aGlzLm1heFNwZWVkICogKE1hdGgucmFuZG9tKCkgLyAzICsgMC42NjY3KTtcbiAgICBpZiAoYmFsbFNwcml0ZS5ib3R0b20gPD0gcGFkZGxlU3ByaXRlLnRvcCkge1xuICAgICAgICB0aGlzLnBhZGRsZS5tb3ZlKC1zcGVlZGYpO1xuICAgIH0gZWxzZSBpZiAoYmFsbFNwcml0ZS50b3AgPj0gcGFkZGxlU3ByaXRlLmJvdHRvbSkge1xuICAgICAgICB0aGlzLnBhZGRsZS5tb3ZlKCtzcGVlZGYpO1xuICAgIH0gZWxzZSBpZiAoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogMTApID09PSAwKSB7XG4gICAgICAgIHRoaXMucGFkZGxlLm1vdmUoTWF0aC5mbG9vcihNYXRoLnJhbmRvbSgpICogdGhpcy5tYXhTcGVlZCoyIC0gdGhpcy5tYXhTcGVlZCkpO1xuICAgIH1cbn07XG4iXX0=
