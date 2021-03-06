//(function() {
    
    goog.provide('wvsz.Wizard');

    goog.require('lime');
    goog.require('lime.animation.KeyframeAnimation');
    goog.require('lime.animation.MoveBy');
    goog.require("lime.ASSETS.wizard.plist");
    goog.require('lime.Sprite');
    goog.require('lime.SpriteSheet');
    goog.require('goog.math.Coordinate');
    goog.require('wvsz.Magic');
    goog.require('lime.parser.ZWOPTEX');

    var CONST_WIZARD = {
        ACTION_MOVE: "move",
        ACTION_SHOOT: "shoot",
        ACTION_SHOOTING: "shooting",
        ACTION_STAND: "stand"
    };

    /**
     * @constructor
     */
    wvsz.Wizard = function(game) {
        lime.Sprite.call(this);

        this.game = game;
        this.spriteSheet = new lime.SpriteSheet('assets/wizard.png',lime.ASSETS.wizard.plist, lime.parser.ZWOPTEX);
        this.status = CONST_WIZARD.ACTION_STAND;
        this.viewDistance = 120;
        this.maxDelayFrame = 120;
        this.currentDelayTime = 0;

        this.setSize(32,32)

            // set current sprite
            .setFill(this.spriteSheet.getFrame('wizard01.png'));
            
        lime.scheduleManager.schedule(this.step, this);
    }
    goog.inherits(wvsz.Wizard, lime.Sprite);

    wvsz.Wizard.prototype.moteToPosition = function (pos) {

        this.changeStatus(CONST_WIZARD.ACTION_MOVE);

        var delta = goog.math.Coordinate.difference(pos,this.getPosition()),
            angle = Math.atan2(-delta.y,delta.x),
            degAngle = angle * 180 / Math.PI,
            move = new lime.animation.MoveBy(delta).setEasing(lime.animation.Easing.LINEAR).setSpeed(1),
            anim = new lime.animation.KeyframeAnimation(),
            self = this;

        // Rotate object to right direction
        this.setRotation(degAngle);

        // Move sprite
        this.runAction(move);

        // Change sprite
        anim.delay = 1 / 6;
        for (var i = 1 ; i <= 2 ;i++) {
           anim.addFrame(this.spriteSheet.getFrame('wizard' + '0' + i + '.png'));
        }
        this.runAction(anim);

        // on stop show front facing
        goog.events.listen(move, lime.animation.Event.STOP,function(){
            anim.stop();
            self.changeStatus(CONST_WIZARD.ACTION_STAND);
        });
        
        this.enemy = null;
    }

    wvsz.Wizard.prototype.lockTarget = function (enemy) {
        this.enemy = enemy;
        if (this.status !== CONST_WIZARD.ACTION_SHOOTING) {
        	this.changeStatus(CONST_WIZARD.ACTION_SHOOT);
        }
    }

    wvsz.Wizard.prototype.unlockTarget = function (zombie) {
    	if (zombie === this.enemy) {
        	this.enemy = null;
        	this.changeStatus(CONST_WIZARD.ACTION_STAND);
        }
    }

    wvsz.Wizard.prototype.step = function (dt) {
    
    	// Checking collision and locking enemies
    	var zombies = this.game.zombies,
    		lenZombies = zombies.length,
    		zombie = null;
    	
    	// Check collision with zombies
    	if (lenZombies > 0) {
			for (var i = lenZombies - 1; i >= 0; i--) {
				zombie = zombies[i];
				if (goog.math.Box.intersects(this.getBoundingBox(), zombie.getBoundingBox())) {
					console.log("Wizard die!");
				} else if (!this.isLocking() && this.isTarget(zombie)) {
					this.lockTarget(zombie);
				} else if (zombie === this.enemy && !this.isTarget(zombie)) {
					this.unlockTarget(zombie);
				}
			}
    	}
    	
        if (this.status === CONST_WIZARD.ACTION_SHOOT && this.enemy) {
            var delta = goog.math.Coordinate.difference(this.enemy.getPosition(),this.getPosition()),
                angle = Math.atan2(-delta.y,delta.x),
                degAngle = angle * 180 / Math.PI,
                self = this;

            // Rotate object to right direction
            this.setRotation(degAngle);
            
            // Unschedule old method
            this.unScheduleShootMethods();
            
            // Shoot enemy
            this.shoot();
            
            lime.scheduleManager.callAfter(this.startShoot, self, 1000);
        }
    }
    
    wvsz.Wizard.prototype.shoot = function () {
        if (this.enemy && this.enemy.status !== "die") {
            var self = this;

            this.status = CONST_WIZARD.ACTION_SHOOTING;
            this.setFill(this.spriteSheet.getFrame('wizard03.png'));

            lime.scheduleManager.callAfter(this.stopShoot, self, 500);

            // Create new magic
            this.game.addMagic(new wvsz.Magic(this.game, this.getPosition(), this.enemy.getPosition()));
        }
    }
    
    wvsz.Wizard.prototype.startShoot = function (dt) {
    	if (this.isLocking()) 
    		this.status = CONST_WIZARD.ACTION_SHOOT;
    	else
    		this.status = CONST_WIZARD.ACTION_STAND;
    }
    
    wvsz.Wizard.prototype.stopShoot = function (dt) {
    	this.setFill(this.spriteSheet.getFrame('wizard01.png'));
    }
    
    wvsz.Wizard.prototype.unScheduleShootMethods = function () {
    	lime.scheduleManager.unschedule(this.startShoot, this);
    	lime.scheduleManager.unschedule(this.stopShoot, this);
    }

    wvsz.Wizard.prototype.changeStatus = function (status) {
        this.status = status;
    }

    wvsz.Wizard.prototype.isTarget = function (enemy) {
    	if (!enemy)
    		return false;
    	
        var pos = this.getPosition(),
            size = this.getSize(),
            enemyPos = enemy.getPosition(),
            enemySize = enemy.getSize(),
            centerOfWizard = new goog.math.Coordinate(pos.x + size.width, pos.y + size.height),
            centerOfEnemy = new goog.math.Coordinate(enemyPos.x + enemySize.width, enemyPos.y + enemySize.height);
		
        return (this.viewDistance + enemy.getSize().width / 2) > Math.abs(goog.math.Coordinate.distance(centerOfWizard, centerOfEnemy));
    }

    wvsz.Wizard.prototype.isLocking = function () {
        return this.enemy != null;
    }
    
//})();