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
