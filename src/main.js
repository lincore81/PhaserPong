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

