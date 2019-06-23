tetresse.modules.tetriaGravity = {
    setup() {

    },
    create(game, settings) {
        var tg = tetresse.modules.tetriaGravity;
        try {
            if (settings.m.tetriaGravity.enabled == true) {
                game.modules.tetriaGravity = {enabled: true, loop: null, count: 0, maxCount: 15, 
                    interval: 1000, ignoreNextAction: false};
                tetresse.on(game, "softdrop", 50, tg.utils.gameAction, game);
                tetresse.on(game, "move", 50, tg.utils.gameActionNSoftDrop, game);
                tetresse.on(game, "premove", 50, tg.utils.gameActionNSoftDrop, game);
                tetresse.on(game, "rotate", 50, tg.utils.gameActionNSoftDrop, game);
                tetresse.on(game, "prerotate", 50, tg.utils.gameActionNSoftDrop, game);
                tetresse.on(game, "place", 50, function(game) {
                    game.modules.tetriaGravity.count = 0;
                }, game);                
            }   
        } catch (e) {}
    },
    start(game) {
        if (game.modules.tetriaGravity == undefined) return;
        var tg = tetresse.modules.tetriaGravity;
        var gg = game.modules.tetriaGravity;
        tg.utils.resetGravityTimer(game);
    },
    reset(game) {
        if (game.modules.tetriaGravity == undefined) return;
        tetresse.modules.tetriaGravity.utils.resetGravityTimer(game, false);
    },
    destroy(game) {
        if (game.modules.tetriaGravity == undefined) return;
        tetresse.modules.tetriaGravity.utils.resetGravityTimer(game, false);
    },
    pause(game) {
        if (game.modules.tetriaGravity == undefined) return;
        tetresse.modules.tetriaGravity.utils.resetGravityTimer(game, false);
    },
    resume(game) {
        if (game.modules.tetriaGravity == undefined) return;
        tetresse.modules.tetriaGravity.utils.resetGravityTimer(game);
    },
    utils: {
        gravityTimer(game) {
            var tg = tetresse.modules.tetriaGravity;
            var gg = game.modules.tetriaGravity;
            if (gg.loop != null) {
                gg.ignoreNextAction = true;
                if (!tetresse.utils.game.softDrop(game, 1)) {
                    tetresse.utils.game.hardDrop(game);
                }
            }
            gg.loop = setTimeout(tg.utils.gravityTimer, gg.interval, game);
        },
        resetGravityTimer(game, andStart = true) {
            var tg = tetresse.modules.tetriaGravity;
            var gg = game.modules.tetriaGravity;
            if (gg.loop != null) clearTimeout(gg.loop);
            gg.loop = null;
            if (andStart) tg.utils.gravityTimer(game);
        },
        gameAction(game) {
            var tg = tetresse.modules.tetriaGravity;
            var gg = game.modules.tetriaGravity;
            if (gg.ignoreNextAction) { gg.ignoreNextAction = false; return; }
            tg.utils.resetGravityTimer(game);
        },
        gameActionNSoftDrop(game) {
            var tg = tetresse.modules.tetriaGravity;
            var gg = game.modules.tetriaGravity;
            var droppable = tetresse.utils.game.testDrop(tetresse.games.arr[0]) > 0;
            if (!droppable) {
                gg.count++;
                if (gg.count <= gg.maxCount) tg.utils.gameAction(game);
            }
        }
    }
}