'use strict';
var tetresse = {
    modules: {},
    listeners: { id: 0 },
    setup() {
        var mod = tetresse.modules; var v;
        var added = [null];
        while (added.length > 0) {
            added = [];
            for (v in mod) {
                try { mod[v].requires.modules.hi; } catch (e) { continue; }
                if (typeof(mod[v].destroy) === "boolean" && mod[v].destroy) continue;
                var missingArr = []; var missing = false;
                for (var i = 0; i < mod[v].requires.modules.length; i++) {
                    var rMod = mod[v].requires.modules[i];
                    if (mod[rMod] === undefined) { missingArr.push(rMod); missing = true; }
                    else if (typeof(mod[rMod].destroy) === "boolean" && mod[rMod].destory) missing = true;
                }
                if (missing) { console.warn("Module [%s] is missing requirements: %s", v, missingArr.toString()); mod[v].destroy = true; added.push(null); }
            }
        }
        for (v in mod) if (typeof(mod[v].destroy) === "boolean" && mod[v].destroy) delete mod[v];
        tetresse.utils.misc.passToModules("setup");
        tetresse.execute("setup");
    },
    cleanup() {
        tetresse.games.cleanup();
        tetresse.utils.misc.passToModules("cleanup");
    },
    create(settings) { // returns created game object
        settings = settings === undefined ? {} : settings;
        var defaults = {rows: 40, cols: 10};
        for (var e in defaults) settings[e] = settings[e] === undefined ? defaults[e] : settings[e];

        var game  = {
            id: null,
            modules: {},
            listeners: { id: 0 },
            board: [],
            cur: {
                hold: null, piece: null, canHold: true,
                locX: null, locY: null, rot: 0,
                next: [], nextBufferSize: 5,
                layout: null
            },
            state: -1,
            settings: {
                shownRows: 20.5
            }
        };
        
        for (var r = 0; r < settings.rows; r++) {
            game.board.push([]);
            for (var c = 0; c < settings.cols; c++)
                game.board[r].push("");
        }
        
        tetresse.games.add(game);
        tetresse.utils.misc.passToModules("create", game, settings);
        
        if (settings.defaultMechanics !== undefined && !settings.useDefaultMechanics) return game;
        
        tetresse.on(game, "next", 50, tetresse.utils.game.initCur, game);
        tetresse.on(game, "harddrop", 50, tetresse.utils.game.place, game);
        tetresse.on(game, "place", 49, tetresse.utils.game.collapse, game);
        tetresse.on(game, "place", 50, tetresse.utils.game.next, game);
        tetresse.on(game, "start", 50, tetresse.utils.game.next, game);

        return game;
    },
    destroy(game) {
        tetresse.execute(game, "destroy");
        tetresse.utils.misc.passToModules("destroy", game);
        tetresse.games.remove(game);
    },
    start(game) {
        if (game.state !== -1 && game.state !== 0) {console.warn("Invalid game.state %d should be -1 (create) or 0 (reset) to start. Game id: %d", game.state, game.id); return;}
        tetresse.utils.misc.passToModules("start", game);
        tetresse.execute(game, "start");
        game.state = 1;
    },
    reset(game) {
        if (game.state !== 1 && game.state !== 2) {console.warn("Invalid game.state %d should be 1 (start) or 2 (pause) to reset. Game id: %d", game.state, game.id); return;}
        tetresse.execute(game, "reset");
        tetresse.utils.misc.passToModules("reset", game);
        game.state = 0;
    },
    pause(game) {
        if (game.state !== 1) {console.warn("Invalid game.state %d should be 1 (start) to pause. Game id: %d", game.state, game.id); return;}
        tetresse.execute(game, "pause");
        tetresse.utils.misc.passToModules("pause", game);
        game.state = 2;
    },
    resume(game) {
        if (game.state !== 2) {console.warn("Invalid game.state %d should be 2 (pause) to resume. Game id: %d", game.state, game.id); return;}
        tetresse.utils.misc.passToModules("resume", game);
        tetresse.execute(game, "resume");
        game.state = 1;
    },
    /**
     * priority (1-100): lowest numbers execute first. graphics: 80, mechanics: 50, default 70
     */
    on(game, event, priority, func, args) {
        if (typeof(game) === "string") { args = func; func = priority; priority = event; event = game; game = tetresse; }
        if (typeof(priority) === "function") { args = func; func = priority; priority = undefined; }
        priority  = priority === undefined ? 70 : priority;
        if (typeof(event) !== "string" || typeof(priority) !== "number" || typeof(func) !== "function" || typeof(game) !== "object") {
            console.error("Invalid parameters (%s, %s, %s, %s, obj) should be (object, string, number, function, obj)", typeof(game), typeof(event), typeof(priority), typeof(func));
            return -1;
        }
        
        if (tetresse.utils.misc.listenerConsts[event] !== undefined) {
            var createdArr = [];
            for (var cEvent of tetresse.utils.misc.listenerConsts[event]) createdArr.push(tetresse.on(game, cEvent, priority, func, args));
            return createdArr;
        }
        
        var listeners = game.listeners;
        var id = listeners.id++;
        var newElement = {func: func, args: args, id: id, priority: priority};
        if (listeners[event] === undefined) listeners[event] = [];
        listeners[event].splice(tetresse.utils.misc.getLocToInsert(listeners[event], "priority", newElement), 0, newElement);
        return id;
    },
    execute(game, event, value) {
        if (typeof(game) === "string") { value = event; event = game; game = tetresse; }
        if (typeof(event) !== "string") {
            console.error("Invalid parameters (obj, %s, obj) should be (obj, string, obj", typeof(event));
            return;
        }
        var listeners = game.listeners;
        if (listeners[event] === undefined || listeners[event].length === 0) return;
        if (value !== "execute") tetresse.execute(game, "preexecute", {event: event, value: value});
        listeners[event].forEach(function(ele) {
            ele.func(game, ele.args, value, event);
        });
        if (value !== "execute") tetresse.execute(game, "execute", {event: event, value: value});
    },
    // q: {
    //     arr: [],
    //     running: false,
    //     execute() {
    //         if (this.running) return;
    //         this.running = true;
    //         while (this.arr.length !== 0) {
    //             var e = this.arr.splice(0, 1)[0];
    //             e.f(e.a[0], e.a[1], e.a[2], e.a[3], e.a[4], e.a[5], e.a[6], e.a[7], e.a[8], e.a[9], e.a[10]);
    //         }
    //         this.running = false;
    //     },
    //     add(func, args) {
    //         if (typeof(func) !== "function" || "object undefined".includes(typeof(args))) { console.error("Invalid parameters (%s, %s) should be (function, object || undefined)", typeof(func), typeof(args)); return; }
    //         this.arr.push({f: func, a: args});
    //         this.execute();
    //     },
    // },
    games: {
        list: {},
        arr: [],
        id: 0,
        remove(id) {
            var g = tetresse.games;
            var rem = g.arr.splice(g.list[id], 1);
            for (var i = g.list[id]; i < g.arr.length; i++)
                g.list[g.arr[i].id]--;
            delete g.list[id]; return rem[0];
        },
        cleanup() {
            var g = tetresse.games; g.list = {}; g.arr = []; g.id = 0;
        },
        add(game) {
            var g = tetresse.games;
            game.id = g.id++;
            g.list[game.id] = g.arr.push(game) - 1;
        },
        get(id) { var g = tetresse.games; return g.arr[g.list[id]]; }
    },
    utils: {
        misc: {
            passToModules(funcName, game, misc) {
                var mod = tetresse.modules;
                for (var v in mod)
                    if (typeof(mod[v][funcName]) === "function")
                        mod[v][funcName](game, misc);
            },
            getLocToInsert(arr, sortKey, element) { // binary search for location to insert at. arr: [{sortKey: 1}], ele: {sortKey: 2}, inserts before same value
                if (element[sortKey] === null) return arr.length;
                var target = element[sortKey];
                var start = 0;
                var end = arr.length;
                var middle = Math.floor((start + end) / 2);
                while (middle !== arr.length && middle !== 0 && arr[middle][sortKey] !== target && start < end) {
                    if (target < arr[middle][sortKey]) end = middle - 1;
                    else start = middle + 1;
                    middle = Math.floor((start + end) / 2);
                }
                for (var i = middle; i != arr.length && arr[i][sortKey] < target; i++)
                    middle++;
                return middle;
            },
            removeListener(id, event, listeners = tetresse.listeners) { // returns array of elements removed (only removes one)
                if (id === null || event === null) { tetresse.utils.error("id and or element cannot be null"); return; }
                for (var i = 0; i < listeners[event].arr.length; i++)
                    if (listeners[event].arr[i].id == id) return listeners[event].arr.splice(i, 1);
                return [];
            },
            listenerConsts: {
                CURCHANGE: ["move", "rotate", "softdrop", "harddrop"],
            }
        },
        board: {
            getContents(game, between = "|", empty = " ", newLine = "\n", shown = false) {
                var output = "";
                for (var r = shown ? game.board.length - game.settings.shownRows : 0; r < game.board.length; r++) {
                    for (var c = 0; c < game.board[0].length; c++) {
                        output += game.board[r][c] === "" ? empty : game.board[r][c];
                        output += c + 1 === game.board[0].length ? "" : between;
                    }
                    output += r + 1 === game.board.length ? "" : newLine;
                }
                return output;
            }
        },
        game: {
            hold(game) {
                if (!tetresse.utils.game.testHold(game)) {
                    tetresse.execute(game, "failedhold");
                    return false;
                }
                tetresse.execute(game, "prehold");
                game.cur.canHold = false;
                var temp = game.cur.hold;
                game.cur.hold = game.cur.piece;
                game.cur.piece = temp;
                tetresse.utils.game.initCur(game);
                tetresse.execute(game, "hold");
                return true;
            },
            move(game, amount = 1) { // negative amount is left, postitive is right
                if (typeof(amount) !== "number") {console.warn("Invalid amount type %s should be number", typeof(amount)); return false;}
                var amt = tetresse.utils.game.testMove(game, amount);
                if (amt === 0) {tetresse.execute(game, "failedmove"); return false;}
                tetresse.execute(game, "premove", amt);
                game.cur.locX += amt;
                tetresse.execute(game, "move", amt);
                return true;
            },
            moveLeft(game) { return tetresse.utils.game.move(game, -1); },
            rotate(game, amount = 1) { // amount is in 90 degree chunks (between -4 and 4), negative is ccw, positive is cw
                if (typeof(amount) !== "number") { console.warn("Invalid amount type %s should be number", typeof(amount)); return false; }
                var ret = tetresse.utils.game.testRotate(game, amount);
                if (!ret.canRotate) { tetresse.execute(game, "failedrotate"); return false; }
                tetresse.execute(game, "prerotate", {rot: game.cur.rot, amt: amount});
                game.cur.layout = ret.layout;
                game.cur.locX = ret.locX;
                game.cur.locY = ret.locY;
                game.cur.rot = (game.cur.rot + amount % 4 + 4) % 4;
                tetresse.execute(game, "rotate", {rot: game.cur.rot, amt: amount});
                return true;
            },
            rotateCCW(game) { tetresse.utils.game.rotate(game, -1); },
            drop(game, amount) {
                if (typeof(amount) !== "number") { console.warn("Invalid amount type %s should be number", typeof(amount)); return null; }
                var amt = tetresse.utils.game.testDrop(game, amount);
                if (amt === null) { tetresse.execute(game, "invaliddrop"); return null; }
                tetresse.execute(game, "predrop", amt);
                game.cur.locY += amt;
                tetresse.execute(game, "drop", amt);
                return amt;
            },
            softDrop(game) {
                var amt = tetresse.utils.game.testDrop(game, 1);
                if (amt < 0) { console.warn("Could not soft drop (below current placed piece level)"); return false; }
                if (amt === 0) { tetresse.execute(game, "failedsoftdrop"); return false; }
                tetresse.execute(game, "presoftdrop");
                game.cur.locY++;
                tetresse.execute(game, "softdrop");
            },
            hardDrop(game) {
                var amt = tetresse.utils.game.testDrop(game, Number.MAX_SAFE_INTEGER);
                if (amt < 0) { console.warn("Could not hard drop (below current placed piece level)"); return false; }
                tetresse.execute(game, "preharddrop", amt);
                game.cur.locY += amt;
                tetresse.execute(game, "harddrop", amt);
            },
            moveTo(game, locX, locY) {
                var amt = tetresse.utils.game.testMoveTo(game, locX, locY);
                tetresse.execute(game, "premoveto", {locX: locX, locY: locY + amt, amount: amt});
                game.cur.locX = locX;
                game.cur.locY = locY + amt;
                tetresse.execute(game, "moveto", amt);
            },
            testHold(game) { // returns boolean
                return game.cur.canHold;
            },
            testMove(game, amount) { // returns amount successfully moved (-1 if invalid)
                if (typeof(amount) !== "number") { console.error("Invalid amount type %s should be number", typeof(amount)); return -1; }
                var amt;
                for (amt = 0; Math.abs(amt) <= Math.abs(amount); amt += Math.sign(amount))
                    if (!tetresse.utils.game.testValid(game, game.cur.locX + amt)) break;
                amt = Math.abs(amt) - (amt === 0 ? 0 : 1);
                return amt * Math.sign(amount);
            },
            testRotate(game, amount) { // amount to rotate (negative CCW, positive CW), returns {canRotate (boolean), locX, locY, layout}, locs and layout are set if canRotate is true
                if (typeof(amount) !== "number") { console.error("Invalid amount type %s should be number", typeof(amount)); return {canRotate: false}; }
                var utilsP = tetresse.utils.pieces;
                var amt = (amount % 4 + 4) % 4;
                var newLayout = utilsP.copy2dStringMatrix(game.cur.layout);
                utilsP.rotate(newLayout, amt);
                var rotationChart = utilsP.rotationChart[game.cur.piece === "i" ? "i" : "default"];
                var rotNum = amount >= 0 ? (game.cur.rot + amt + 3) % 4 : (amt + game.cur.rot) % 4;
                // eg rot=2, amount=1, want 2>>3 (rot 2 to 3) which is row 2
                // eg rot=1, amount=2, want 2>>3 as well
                // eg rot=0, amount=-2, amt=2, want 3>>2 which is row 2 (negative elements)
                // eg rot=1, amount=3, amt=3, want 1>>2 which is row 0
                var x; var y;
                for (var i = 0; i < rotationChart[rotNum].length; i++) {
                    x = game.cur.locX + rotationChart[rotNum][i][0] * Math.sign(amount);
                    y = game.cur.locY + (-1) * rotationChart[rotNum][i][1] * Math.sign(amount);
                    if (tetresse.utils.game.testValid(game, x, y, newLayout))
                        return {canRotate: true, locX: x, locY: y, layout: newLayout};
                }
                return {canRotate: false};
            },
            testDrop(game, amount = 100) { // Number.MAX_SAFE_INTEGER returns amount piece can drop (negative if currently invalid, null if no available space)
                var utilsG = tetresse.utils.game;
                for (var amt = 0; amt <= amount;) {
                    if (utilsG.testOutOfBounds(game, undefined, game.cur.locY + amt)) { if (amt === 0) return null; amt += (amt > 0 ? -1 : 1); break;
                    } else if (utilsG.testOverlap(game, undefined, game.cur.locY + amt)) { amt--; if (amt >= 0) break;
                    } else { if (amt < 0) break; amt++; }
                }
                return amt;
            },
            testMoveTo(game, locX, locY) { // returns number, locs are lowest potential new locs (0 if piece is valid after moving, null if no openings)
                if (typeof(locX) + typeof(locY) !== "numbernumber") {
                    console.error("Invalid parameter type (%s, %s) should be (number number)", typeof(locX), typeof(locY));
                    return null;
                }
                if (tetresse.utils.game.testValid(game, locX, locY)) return 0;
                return tetresse.utils.game.testDrop(game, 1);
            },
            testValid(game, locX = game.cur.locX, locY = game.cur.locY, layout = game.cur.layout) {
                if (typeof(locX) + typeof(locY) + typeof(layout) !== "numbernumberobject") {
                    console.error("Invalid parameter type (obj, %s, %s, %s) should be (obj, number, number, object)", typeof(locX), typeof(locY), typeof(layout)); return false;
                }
                var utilsG = tetresse.utils.game;
                return !utilsG.testOutOfBounds(game, locX, locY, layout) && !utilsG.testOverlap(game, locX, locY, layout);
            },
            testOutOfBounds(game, locX = game.cur.locX, locY = game.cur.locY, layout = game.cur.layout) {
                if (typeof(locX) + typeof(locY) + typeof(layout) !== "numbernumberobject") {
                    console.error("Invalid parameter type (obj, %s, %s, %s) should be (obj, number, number, object)", typeof(locX), typeof(locY), typeof(layout)); return true;
                }
                for (var r = 0; r < layout.length; r++)
                    for (var c = 0; c < layout[0].length; c++)
                        if (layout[r][c] === 1)
                            if (r + locY < 0 || r + locY >= game.board.length || c + locX < 0 || c + locX >= game.board[0].length) return true;
                return false;
                
            },
            testOverlap(game, locX = game.cur.locX, locY = game.cur.locY, layout = game.cur.layout) {
                if (typeof(locX) + typeof(locY) + typeof(layout) !== "numbernumberobject") {
                    console.error("Invalid parameter type (obj, %s, %s, %s) should be (obj, number, number, object)", typeof(locX), typeof(locY), typeof(layout)); return true;
                }
                for (var r = 0; r < layout.length; r++)
                    for (var c = 0; c < layout[0].length; c++)
                        if (layout[r][c] === 1)
                            if (!(r + locY < 0 || r + locY >= game.board.length || c + locX < 0 || c + locX >= game.board[0].length) && game.board[r + locY][c + locX] !== "") return true;
                return false;
            },
            place(game) {
                if (game.cur.piece === null) { console.error("Invalid game state: tried to place when game hasn't been initialized (must call tetresse.utils.game.initCur or something similar)"); return; }
                tetresse.execute(game, "preplace");
                var layout = game.cur.layout;
                for (var r = 0; r < layout.length; r++)
                    for (var c = 0; c < layout.length; c++)
                        if (layout[r][c] == 1) {
                            if (r + game.cur.locY >= 0 && r + game.cur.locY < game.board.length && c + game.cur.locX >= 0 && c + game.cur.locX < game.board[0].length) {
                                game.board[r + game.cur.locY][c + game.cur.locX] = game.cur.piece;
                            }
                        }
                game.cur.piece = null;
                tetresse.execute(game, "place");
            },
            next(game, args = {piece: null}) { // gets the next piece and shuffles bag if need, if args.piece isn't null, makes that the next piece
                if (game.cur.piece !== null) console.warn("Weird state: game.cur.piece is [%s] and not null. Live piece might be overwritten", game.cur.piece);
                var tmpPush = function(ele) { game.cur.next.push(ele); };
                while (game.cur.next.length <= game.cur.nextBufferSize)
                    tetresse.utils.pieces.shuffle(["i", "j", "l", "o", "s", "t", "z"]).forEach(tmpPush);
                game.cur.canHold = true;
                tetresse.execute(game, "prenext");
                game.cur.piece = game.cur.next.splice(0, 1)[0];
                tetresse.execute(game, "next");
            },
            initCur(game) {
                tetresse.execute(game, "preinitcur");
                game.cur.rot = 0;
                if (game.cur.piece === null) tetresse.utils.game.next(game);
                game.cur.layout = tetresse.utils.pieces.copy2dStringMatrix(tetresse.utils.pieces.layouts[game.cur.piece]);
                game.cur.locX = Math.floor((game.board[0].length - game.cur.layout.length) / 2);
                game.cur.locY = game.cur.piece === "i" ? 18 : 19;
                if (tetresse.utils.game.testOverlap(game)) {
                    game.cur.locY--;
                    if (tetresse.utils.game.testOverlap(game)) { tetresse.execute(game, "toppedout"); return; }
                }
                tetresse.execute(game, "initcur");
            },
            testFilledRows(game) {
                var filledRows = [];
                for (var r = game.board.length - 1; r >= 0; r--) {
                    var filled = true; var empty = true;
                    for (var c = 0; c < game.board[0].length; c++) {
                        if (game.board[r][c] === "") filled = false;
                        else empty = false;
                    }
                    if (filled) filledRows.push(r); if (empty) break;
                }
                return filledRows;
            },
            collapse(game) {
                var rows = tetresse.utils.game.testFilledRows(game);
                tetresse.execute(game, "precollapse", rows);
                var row = [];
                for (var c = 0; c < game.board[0].length; c++)
                    row.push("");
                for (var i = rows.length - 1; i >= 0; i--) {
                    game.board.splice(rows[i], 1);
                    game.board.splice(0, 0, row.slice());
                }
                tetresse.execute(game, "collapse", rows);
            }
        },
        pieces: {
            layouts: {
                i: [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]],
                j: [[1,0,0],[1,1,1],[0,0,0]],
                l: [[0,0,1],[1,1,1],[0,0,0]],
                o: [[1,1],[1,1]],
                s: [[0,1,1],[1,1,0],[0,0,0]],
                t: [[0,1,0],[1,1,1],[0,0,0]],
                z: [[1,1,0],[0,1,1],[0,0,0]]
            },
            rotationChart: {
                default: [
                    [[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]], // 0>>1
                    [[0,0], [1,0], [1,-1], [0,2], [1,2]], // 1>>2
                    [[0,0], [1,0], [1,1], [0,-2], [1,-2]], // 2>>3
                    [[0,0], [-1,0], [-1,-1], [0,2], [-1,2]] // 3>>0
                ],
                i: [
                    [[0,0], [-2,0], [1,0], [-2,-1], [1,2]], // 0>>1
                    [[0,0], [-1,0], [2,0], [-1,2], [2,-1]], // 1>>2
                    [[0,0], [2,0], [-1,0], [2,1], [-1,-2]], // 2>>3
                    [[0,0], [1,0], [-2,0], [1,-2], [-2,1]] // 3>>0
                ]
            },
            rotate(arr, amount = 0) { // rotates array provided cw
                var i, j, temp;
                for (amount = (amount % 4 + 4) % 4; amount !== 0; amount--) {
                    for (i = 0; i < arr.length / 2; i++) {
                        temp = [];
                        for (j = 0; j < arr[i].length; j++)
                            temp.push(arr[i][j]);
                        arr[i] = arr[arr.length - 1 - i];
                        arr[arr.length - 1 - i] = temp;
                    }
                    for (i = 0; i < arr.length; i++) {
                        for (j = 0; j < i; j++) {
                            temp = arr[i][j];
                            arr[i][j] = arr[j][i];
                            arr[j][i] = temp;
                        }
                    }
                }
            },
            copy2dStringMatrix(arr) {
                var copy = [];
                for (var r = 0; r < arr.length; r++)
                    copy.push(arr[r].slice());
                return copy;
            },
            shuffle(arr) { // Fisher-Yates shuffle
                var m = arr.length, t, i;
                while (m) {
                    i = Math.floor(Math.random() * m--);
                    t = arr[m];
                    arr[m] = arr[i];
                    arr[i] = t;
                }
                return arr;
            },
            colors: {
                i: "hsl(196, 89%, 57%)",
                j: "hsl(231, 69%, 45%)",
                l: "hsl(24, 98%, 44%)",
                o: "hsl(42, 97%, 45%)",
                s: "hsl(92, 91%, 37%)",
                t: "hsl(314, 63%, 41%)",
                z: "hsl(348, 86%, 45%)",
                blank: "black",
                g: "grey",
            }
        }
    }
}