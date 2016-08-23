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
