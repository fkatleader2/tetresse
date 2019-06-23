tetresse.modules.defaultControls = {
    utils: {
        defaultBinds: {
            
        },
        addKey(key, obj, down = true, up = false) {
            key = tetresse.modules.defaultControls.utils.getKeyCode(key);
            var keys = tetresse.modules.defaultControls.data.keys;
            if (keys[key] === undefined) keys[key] = {isDown: false, down: [], up: [] };
            if (down) keys[key].down.push(obj);
            if (up) keys[key].up.push(obj);
        },
        cleanupKeys() {
            var keys = tetresse.modules.defaultControls.data.keys; var i;
            for (var k in keys) {
                for (i = 0; i < k.down; i++) if (d.func === undefined) k.down.splice(i, 1);
                for (i = 0; i < k.up; i++) if (d.func === undefined) k.up.splice(i, 1);
            }
        },
        getKeyCode(str) {
            if (typeof(str) === "number") return str;
            return tetresse.modules.defaultControls.data.keyCodeMap[str];
        },
        uniqueAutoRepeat(time1, time2, func, stopFunc, game) {
            var dc = tetresse.modules.defaultControls;
            var prev = dc.data.listSetTimeout.id++;
            if (stopFunc(game) === 0) return;
            else if (stopFunc(game) === 1) func(game);
            dc.data.listSetTimeout[prev] = setTimeout(dc.utils.autoRepeat, time1, time2, func, stopFunc, game, prev);
        },
        autoRepeat(time, func, stopFunc, game, prev) {
            var dc = tetresse.modules.defaultControls;
            if (prev !== undefined) delete dc.data.listSetTimeout[prev];
            if (stopFunc(game) === 0) return;
            else if (stopFunc(game) === 1) func(game);
            prev = dc.data.listSetTimeout.id++;
            dc.data.listSetTimeout[prev] = setTimeout(dc.utils.autoRepeat, time, time, func, stopFunc, game, prev);
        }
    },
    data: {
        keys: {}, // 64: {isDown: false, down: [{func, args}}, ...], up: [{func, args}, ...]}
        defaultKeys: {
            "ArrowRight": function(game) {
                var isNotDown = function() {
                    var dc = tetresse.modules.defaultControls;
                    var out = dc.data.keys[dc.utils.getKeyCode("ArrowRight")].isDown ? 1 : 0;
                    if (out === 1) out = game.modules.defaultControls.right ? 1 : -1;
                    return out;
                };
                game.modules.defaultControls.left = false;
                game.modules.defaultControls.right = true;
                tetresse.modules.defaultControls.utils.uniqueAutoRepeat(125, 16, tetresse.utils.game.move, isNotDown, game);
            },
            "ArrowLeft": function(game) {
                var isNotDown = function() {
                    var dc = tetresse.modules.defaultControls;
                    var out = dc.data.keys[dc.utils.getKeyCode("ArrowLeft")].isDown ? 1 : 0;
                    if (out === 1) out = game.modules.defaultControls.left ? 1 : -1;
                    return out;
                };
                game.modules.defaultControls.right = false;
                game.modules.defaultControls.left = true;
                tetresse.modules.defaultControls.utils.uniqueAutoRepeat(125, 16, tetresse.utils.game.moveLeft, isNotDown, game);
            },
            "ArrowUp": function(game) { tetresse.utils.game.rotate(game); },
            "z": function(game) { tetresse.utils.game.rotateCCW(game); },
            " ": function(game) { tetresse.utils.game.hardDrop(game); },
            "ArrowDown": function(game) {
                var isNotDown = function() {
                    var dc = tetresse.modules.defaultControls;
                    var out = dc.data.keys[dc.utils.getKeyCode("ArrowDown")].isDown ? 1 : 0;
                    return out;
                };
                tetresse.modules.defaultControls.utils.autoRepeat(60, tetresse.utils.game.softDrop, isNotDown, game);
            },
            "c": function(game) { tetresse.utils.game.hold(game); },
        },
        keyCodeMap: { ArrowLeft: 37, ArrowRight: 39, ArrowUp: 38, ArrowDown: 40, " ": 32, c: 67, z: 90, x: 88 },
        listSetTimeout: {id: 0}
    },
    setup() {
        document.addEventListener("keydown", function(e) {
            var keys = tetresse.modules.defaultControls.data.keys;
            var utils = tetresse.modules.defaultControls.utils;
            var key = utils.getKeyCode(e.key || e.keyCode);
            if (keys[key] === undefined || keys[key].down === undefined || keys[key].isDown) return;
            keys[key].isDown = true;
            for (var obj of keys[key].down)
                if (obj.func !== undefined) obj.func(obj.args);
        });
        document.addEventListener("keyup", function(e) {
            var keys = tetresse.modules.defaultControls.data.keys;
            var utils = tetresse.modules.defaultControls.utils;
            var key = utils.getKeyCode(e.key || e.keyCode);
            if (keys[key] === undefined || keys[key].up === undefined || !keys[key].isDown) return;
            keys[key].isDown = false;
            for (var obj of keys[key].up)
                if (obj.func !== undefined) obj.func(obj.args);
        });
    },
    cleanup() {},
    create(game, settings) {
        var dc = game.modules.defaultControls = { right: false, left: false};
        var utils = tetresse.modules.defaultControls.utils;
        var defaultKeys = tetresse.modules.defaultControls.data.defaultKeys;
        dc.binds = {};
        for (var v in defaultKeys) {
            dc.binds[v] = defaultKeys[v];
            utils.addKey(v, {func: defaultKeys[v], args: game});
        }
    },
    reset(game) {},
    destroy(game) {
        
    },
    pause(game) {},
    resume(game) {},
}