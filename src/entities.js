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
