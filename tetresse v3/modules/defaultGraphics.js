'use strict';
var tetresse;
tetresse.modules.defaultGraphics = {
    layouts: {
        board: {row: {weight: 50, label: "board", n: 42}, col: {weight: 50, label: "board", n: 21}},
        hold: {row: "board", col: {weight: 30, label: "hold", n: 5.5}},
        next: {row: "board", col: {weight: 70, label: "next", n: 6}},
        incoming: {row: "board", col: {weight: 60, label: "incoming", n: 1}},
        abilities: {row: "board", col: "hold"},
        mana: {row: "board", col: {weight: 40, label: "mana", n: 1}},
    },
    sources: {
        imgs: {}, // added in sources.imgs[pathToImage] = {loaded: false, ele: element}
        i: "#30bff3", // color, img, keyframes: [{t, x, y, w, h, r, tr, c, img}], generate, (data), (imgs), (src), (srcAfter)
        j: "#243bc2",
        l: "#de5a02",
        o: "#e29f03",
        s: "#59b408",
        t: "#aa278c",
        z: "#d51038",
        g: "#808080",
        blank: "#000000",
        border: "#808080",
        incoming: "#ff0000",
        mana: "#4b26a5",
        background: "black"
    },
    setup() {
        // import css
        var cssId = "tetresseModule-defaultGraphics";
        if (!document.getElementById(cssId)) {
            var head = document.getElementsByTagName("head")[0];
            var link = document.createElement("link");
            link.id = cssId;
            link.rel = "stylesheet";
            link.type = "text/css";
            link.href = "css/defaultGraphics.css";
            link.media = "all";
            head.appendChild(link);
        }
        // load sources (load images, fill out keyframes)
    },
    cleanup() {
        var ele; var data = tetresse.modules.defaultGraphics.data;
        for (ele of data.generatedElements) ele.parentElement.removeChild(ele);
        for (ele of data.disabledElements) ele.parent.appendChild(ele.ele);
    },
    create(game, settings) { // initialize game.modules.defaultGraphics and call specific create (eg utils.pixel)
        var ele, type = "text";
        var initClass = "tetresse-defaultGraphics-init";
        // get element to use
        try {
            settings.m.defaultGraphics = settings.m.defaultGraphics === undefined ? {} : settings.m.defaultGraphics;
            type = settings.m.defaultGraphics.type === undefined ? type : settings.m.defaultGraphics.type;
            if (typeof(type) !== "string") { console.warn("[defaultGraphics] Invalid type %s should be string for 'settings.m.defaultGraphics.type'. Changing type to 'text'", typeof(type)); type = "text"; }
            var id = settings.m.defaultGraphics.id;
            if (typeof(id) === "undefined") throw "[defaultGraphics] id undefined";
            if (typeof(id) !== "string") { console.error("[defaultGraphics] Invalid type %s should be string for settings.m.defaultGraphics.id"); return; }
            ele = document.getElementsById(id);
            if (ele === null) { console.error("[defaultGraphics] Element with id (%s) could not be found.", id); return; }
            if (ele.classList.contains(initClass)) {
                console.error("[defaultGraphics] Element specified by settings.m.defaultGraphics.id (%s) is already in use. Call tetresse.destroy(game) before calling create on the id again.", id); return;
            }
        } catch (e) {
            ele = undefined;
            for (var tmpEle of document.getElementsByTagName("tetresse"))
                if (!tmpEle.classList.contains(initClass)) { ele = tmpEle; break; }
        }
        if (typeof("ele") === "undefined") { console.error("[defaultGraphics] No free tetresse tag to create game in. To fix, either tetresse.destroy(game) some games or create more <tetresse></tetresse> in the HTML."); return; }
        ele.classList.add("tetresse-defaultGraphics-init");
        ele.style["font-family"] = "monospace";
        game.modules.defaultGraphics = {element: ele};

        var utils = tetresse.modules.defaultGraphics.utils;
        if (type === "text") utils.text.setup(game);
        else if (type === "textRaw") utils.text.setup(game, true);
        else if (type === "pixel") utils.pixel.create(game, settings);
        else if (type === "percent") utils.percent.setup(game, settings);
        else console.warn("[defaultGraphics] Unrecognized type '%s'", type);
    },
    reset(game) {},
    destroy(game) {
        game.modules.defaultGraphics.element.classList.remove("tetresse-defaultGraphics-init");
    },
    pause(game) {},
    resume(game) {},
    utils: {
        /**
         * data: what to draw where (mutated)
         * (src): sourcesKey - gets the obj specified at defaultGraphics.sources[sourcesKey]
         */
        draw(game, canvas, sData, src) {
            sData = sData === null || sData === undefined ? {} : sData; var data = {}; var v;
            for (v in sData) data[v] = sData[v];
            var defaults = {x: 0, y: 0, w: 100, h: 100, t: 0, r: 0, transparency: 1, type: "rect", animate: false, n: 2}; // type: rect or circle, requires color specified
            var utils = tetresse.modules.defaultGraphics.utils;
            var sources = tetresse.modules.defaultGraphics.sources;
            if (typeof(src) === "string") src = sources[src];
            if (src === undefined) return;
            if (typeof(src) === "string" && defaults.color === undefined) defaults.color = src;
            for (v in defaults) if (data[v] === undefined) data[v] = defaults[v];
            var srcCopyArr = ["color"]; for (v of srcCopyArr) if (data[v] === undefined) data[v] = src[v];

            if (typeof(src.src) === "function") utils.draw(game, canvas, data, src.src);
            var ctx = canvas.getContext("2d");
            ctx.beginPath();
            if (data.type === "rect" && data.color !== undefined) {
                if (data.color === "clear") {
                    ctx.clearRect(data.x * data.n, data.y * data.n, data.w * data.n, data.h * data.n);
                } else {
                    ctx.rect(data.x * data.n, data.y * data.n, data.w * data.n, data.h * data.n);
                    ctx.fillStyle = data.color;
                    ctx.fill();
                }
            }
            if (src.img !== undefined) {
                var img;
                if ((img = sources.imgs[src.img]) !== undefined && img.loaded) {
                    var w = 1; var h = 1;
                    if (img.ele.width / img.ele.height > data.w / data.h) w = h * (data.w / data.h); // crop width
                    else h = w * (data.h / data.w); // crop height
                    ctx.drawImage(img.ele, 0, 0, w * img.ele.height, h * img.ele.height, data.x, data.y, data.w, data.h);
                } else { console.warn("[defaultGraphics utils.draw] src.img not loaded: %s", src.img); }
            }
            if (src.generate !== undefined) src.generate(canvas, src, data);
            if (data.animate) {
                utils.animate(game, canvas, data, src);
                var animations = game.modules.defaultGraphics.animations;
                data.animate = false; data.t = window.performance.now() ? window.performance.now() : (new Date()).getTime();
                animations.active.push({canvas: canvas, src: src, data: data});
                if (animations.loop === null)
                    animations.loop = window.requestAnimationFrame((function(time) {
                        for (var v of this.modules.defaultGraphics.animations.active)
                            tetresse.modules.defaultGraphics.utils.animate(this, v.canvas, v.data, v.src);
                    }).bind(this, game));
            }
            if (typeof(src.srcAfter) === "function") src.srcAfter(game, canvas, data, src);
        },
        animate(game, canvas, data, src) { // loops through the src to be animated, calls draw every frame
            console.log("starting animation (not implemented yet)!");
        },
        pixel: {
            create(game, settings) {
                var dg = tetresse.modules.defaultGraphics; var v;
                ["colors", "layouts", "animations"].forEach(function(label) { if (!settings.m.defaultGraphics[label]) settings.m.defaultGraphics[label] = {}; });
                var gs = {
                    width: 0, height: 0, n: 0, componentWidthN: 0, componentHeightN: 0,
                    canvases: {}, components: {}, animations: { loop: null, active: [] },
                    grid: dg.utils.grid.create(),
                    settings: settings.m.defaultGraphics,
                };
                for (v in game.modules.defaultGraphics) gs[v] = game.modules.defaultGraphics[v];
                game.modules.defaultGraphics = gs;
                ["background", "play", "animation"].forEach(function(label) {
                    var canvas = document.createElement("canvas");
                    canvas.id = "tetresse-" + game.id + "-" + label;
                    canvas.classList.add("tetresse-pixel");
                    gs.element.appendChild(canvas);
                    gs.canvases[label] = canvas;
                });
                for (v in dg.utils.pixel.p) {
                    var component = dg.layouts[gs.settings.layouts[v] ? gs.settings.layouts[v] : v];
                    if (component !== undefined) dg.utils.grid.add(gs.grid, component);
                }
                
                for (v of [
                    {o: "hold", e: "hold"}, {o: "hold", e: "piece"}, {o: "move", e: "piece"}, {o: "rotate", e: "piece"}, {o: "softdrop", e: "piece"},
                    {o: "initcur", e: "board"}, {o: "next", e: "piece"}, {o: "next", e: "next"}
                ])
                    tetresse.on(game, v.o, 80, dg.utils.pixel.p[v.e]);
                
                dg.utils.pixel.resize(game);
            },
            destroy(game) {
                
            },
            resize(game, n) {
                var dg = tetresse.modules.defaultGraphics;
                var pixel = dg.utils.pixel;
                var gs = game.modules.defaultGraphics;
                
                var gridDimensions = dg.utils.grid.getTotals(gs.grid);
                if (!n) {
                    gs.width = gs.element.parentNode.clientWidth;
                    gs.height = gs.element.parentNode.clientHeight;
                    if (gs.width === 0 || gs.height === 0) {
                        if (typeof window.getComputedStyle !== "undefined") {
                            gs.width = parseInt(window.getComputedStyle(gs.element.parentNode, null).getPropertyValue('width'));
                            gs.height = parseInt(window.getComputedStyle(gs.element.parentNode, null).getPropertyValue('height'));
                        } else {
                            console.warn("[defaultGraphics] browser does not support element.clientWidth or window.getComputedStyle");
                            // TODO add other method for offset if these two fail
                        }
                    }
                    for (var canvas in gs.canvases) {
                        gs.canvases[canvas].width = gs.width;
                        gs.canvases[canvas].height = gs.height;
                    }
                    if (gridDimensions.w / gridDimensions.h > gs.width / gs.height) { // width is the deciding factor
                        gs.n = Math.floor(gs.width / gridDimensions.w);
                        if (gs.n / 2 !== Math.floor(gs.n / 2) && gs.n !== 1) gs.n--;
                    } else { // height is deciding factor
                        gs.n = Math.floor(gs.height / gridDimensions.h);
                        if (gs.n / 2 !== Math.floor(gs.n / 2) && gs.n !== 1) gs.n--;
                    }
                    if (gs.n === 0) gs.n = 1;
                } else { gs.n = n; }
    
                // shrink canvas and game div to fit board
                gs.width = gs.n * gridDimensions.w;
                gs.height = gs.n * gridDimensions.h;
                gs.element.style.width = gs.width;
                gs.element.style.height = gs.height;
                for (canvas in gs.canvases) {
                    gs.canvases[canvas].width = gs.width;
                    gs.canvases[canvas].height = gs.height;
                }
                
                for (var v in pixel.p) {
                    var newLoc = dg.utils.grid.get(gs.grid, dg.layouts[v]);
                    if (newLoc === undefined) continue;
                    if (gs.components[v] === undefined) gs.components[v] = {};
                    if (newLoc) gs.components[v].layout = newLoc;
                }
                
                tetresse.modules.defaultGraphics.utils.pixel.refresh(game);
            },
            refresh(game) {
                var p = tetresse.modules.defaultGraphics.utils.pixel.p;
                for (var v in p) p[v](game);
            },
            p: {
                board(game, toUpdate) {
                    var dg = tetresse.modules.defaultGraphics;
                    var gs = game.modules.defaultGraphics;
                    var layout = game.modules.defaultGraphics.components.board.layout;
                    var drawTile = function(r, c, src) {
                        if (r < 0 || c < 0 || r < Math.floor(game.board.length - game.settings.shownRows) || c > game.board[0].length) return;
                        var data = {x: layout.x + c * 2 + .5, y: layout.y + (r - Math.floor(game.board.length - game.settings.shownRows)) * 2 + .5, w: 2, h: 2, n: gs.n};
                        if (r < game.board.length - game.settings.shownRows) data.h = 1;
                        else if (Math.floor(game.settings.shownRows) != game.settings.shownRows) data.y -= 1;
                        dg.utils.draw(game, gs.canvases.play, data, "tile");
                        dg.utils.draw(game, gs.canvases.play, data, src === "" ? "blank" : src);
                    };
                    
                    if (toUpdate === undefined) {
                        dg.utils.draw(game, gs.canvases.play, {x: layout.x, y: layout.y, w: layout.w, h: layout.h, n: gs.n}, "border");
                        for (var r = Math.floor(game.board.length - game.settings.shownRows); r < game.board.length; r++)
                            for (var c = 0; c < game.board[0].length; c++)
                                drawTile(r, c, game.board[r][c]);
                    } else if (toUpdate.length !== undefined)
                        for (var t of toUpdate)
                            drawTile(t.r, t.c, t.s === undefined ? game.board[t.r][t.c] : t.s);
                },
                piece(game) {
                    if (game.cur.piece === null) return;
                    var curPiece = []; var v;
                    var ghostPiece = [];
                    for (var r = 0; r < game.cur.layout.length; r++)
                        for (var c = 0; c < game.cur.layout[0].length; c++)
                            if (game.cur.layout[r][c] === 1) curPiece.push({r: r + game.cur.locY, c: c + game.cur.locX});
                    var toUpdate = [];
                    var board = game.modules.defaultGraphics.components.board;
                    board.prevPiece = board.prevPiece === undefined ? [] : board.prevPiece;
                    if (game.modules.defaultGraphics.settings.ghost !== false) {
                        var amt = tetresse.utils.game.testDrop(game);
                        for (v of curPiece) ghostPiece.push({r: v.r + amt, c: v.c});
                    }
                    
                    for (v of ghostPiece) board.prevPiece.push({r: v.r, c: v.c, s: "g"});
                    for (v of curPiece) board.prevPiece.push({r: v.r, c: v.c, s: game.cur.piece});
                    tetresse.modules.defaultGraphics.utils.pixel.p.board(game, board.prevPiece);
                    board.prevPiece = curPiece;
                    for (v of ghostPiece) board.prevPiece.push(v);
                },
                hold(game) {
                    var dg = tetresse.modules.defaultGraphics;
                    var gs = game.modules.defaultGraphics;
                    var layout = game.modules.defaultGraphics.components.hold.layout;
                    dg.utils.draw(game, gs.canvases.play, {x: layout.x, y: layout.y + 5, w: layout.w + .5, h: layout.w + .5, n: gs.n}, "border");
                    dg.utils.pixel.p.next(game, [{x: layout.x + .5, y: layout.y + 5.5, p: game.cur.hold}]);
                },
                next(game, toUpdate) {
                    var dg = tetresse.modules.defaultGraphics;
                    var gs = game.modules.defaultGraphics;
                    var layout = game.modules.defaultGraphics.components.next.layout;
                    
                    var drawSmallPiece = function(x, y, p, w, h) {
                        var data = {x: x, y: y, w: w === undefined ? 5 : w, h: h === undefined ? 5 : h, n: gs.n};
                        dg.utils.draw(game, gs.canvases.play, data, "background");
                        if (p === null || p === undefined) return;
                        var pLayout = tetresse.utils.pieces.layouts[p];
                        if (pLayout === undefined) return;
                        x += (data.w - 4) / 2 + (4 - pLayout.length) / 2;
                        y += (data.h - 4) / 2 + .5 + (4 - pLayout.length) / 2 + (p === "o" ? -.5 : 0);
                        for (var r = 0; r < pLayout.length; r++)
                            for (var c = 0; c < pLayout[0].length; c++)
                                if (pLayout[r][c] === 1) {
                                    dg.utils.draw(game, gs.canvases.play, {x: x + c, y: y + r, w: 1, h: 1, n: gs.n}, p);
                                }
                    }
                    if (toUpdate === undefined) {
                        var height = game.cur.nextBufferSize * (4) + 2.5;
                        tetresse.modules.defaultGraphics.utils.draw(game, gs.canvases.play, {x: layout.x - .5, y: layout.y + 5, w: layout.w, h: height, n: gs.n}, "border");
                        drawSmallPiece(layout.x, layout.y + 5.5, game.cur.next[0]);
                        for (var i = 0; i < game.cur.nextBufferSize - 1; i++)
                            drawSmallPiece(layout.x, layout.y + 5 + layout.w + i * 4, game.cur.next[i + 1], undefined, 4);
                    } else if (toUpdate.length !== undefined)
                        for (var v of toUpdate) drawSmallPiece(v.x, v.y, v.p, v.w, v.h);
                },
                incoming(game, toUpdate) {
                    var dg = tetresse.modules.defaultGraphics;
                    var gs = game.modules.defaultGraphics;
                    var layout = game.modules.defaultGraphics.components.incoming.layout;
                    
                    var drawBar = function(x, y, h1, h2, s) {
                        dg.utils.draw(game, gs.canvases.play, {x: x - .5, y: y, w: 1.5, h: h1, n: gs.n}, "border");
                        dg.utils.draw(game, gs.canvases.play, {x: x, y: y + .5, h: h1 - 1, w: .5, n: gs.n}, "background");
                        dg.utils.draw(game, gs.canvases.play, {x: x, y: y + h1 - h2 - .5, h: h2, w: .5, n: gs.n}, s);
                    }
                    
                    if (toUpdate === undefined) {
                        drawBar(layout.x, layout.y, layout.h, 1, "incoming");
                    } else if (toUpdate.length !== undefined)
                        for (var v of toUpdate) drawBar(v.x, v.y, v.h1, v.h2, v.s);
                },
                mana(game) {
                    var dg = tetresse.modules.defaultGraphics;
                    var gs = game.modules.defaultGraphics;
                    var layout = game.modules.defaultGraphics.components.mana.layout;
                    dg.utils.pixel.p.incoming(game, [{x: layout.x + .5, y: layout.y, h1: layout.h, h2: 3, s: "mana"}])
                },
                abilities(game) {
                    
                },
            }
        },
        text: {
            setup(game, showLetters = false) {
                var callback = tetresse.modules.defaultGraphics.utils.text[!showLetters ? "generate" : "generateRaw"];
                tetresse.on(game, "initcur", 80, callback);
                tetresse.on(game, "CURCHANGE", 80, callback);
            },
            generate(game) { tetresse.modules.defaultGraphics.utils.text.gen(game); },
            generateRaw(game) { tetresse.modules.defaultGraphics.utils.text.gen(game, true); },
            gen(game, showLetters = false) {
                var ele = game.modules.defaultGraphics.element;
                var dashRow = "+--------------------+"; var blankCell = !showLetters ? "&nbsp&nbsp" : "&nbsp";
                var output = dashRow + "<br>|";
                var ghostAmt = tetresse.utils.game.testDrop(game);
                for (var r = game.settings.shownRows - 1; r < game.board.length; r++) {
                    for (var c = 0; c < game.board[0].length; c++) {
                        output += '<span style="background-color:';
                        if (game.cur.layout.length > r - game.cur.locY && r - game.cur.locY >= 0 && game.cur.layout[0].length > c - game.cur.locX && c - game.cur.locX >= 0 && game.cur.layout[r - game.cur.locY][c - game.cur.locX] !== 0) {
                            output += tetresse.utils.pieces.colors[game.cur.piece] + '">';
                            output += showLetters ? game.cur.piece : blankCell;
                        } else if (game.cur.layout.length > r - (game.cur.locY + ghostAmt) && r - (game.cur.locY + ghostAmt) >= 0 && game.cur.layout[0].length > c - game.cur.locX && c - game.cur.locX >= 0 && game.cur.layout[r - game.cur.locY - ghostAmt][c - game.cur.locX] !== 0) {
                            output += tetresse.utils.pieces.colors.g + '">';
                            output += showLetters ? "g" : blankCell; // game.cur.piece;
                            
                        } else {
                            output += tetresse.utils.pieces.colors[game.board[r][c] === "" ? "blank" : game.board[r][c]] + '">';
                            output += showLetters && game.board[r][c] === "" ? game.board[r][c] : blankCell;
                            //output += game.board[r][c] === "" ? "&nbsp" : game.board[r][c];
                        }
                        output += '</span>';
                    }
                    output += r + 1 === game.board.length ? "|<br>" : "|<br>|";
                }
                output += "+--------------------+";
                ele.innerHTML = output;
            }
        },
        percent: {
            setup() {console.warn("[defaultGraphics] percent not implemented yet");}
        },
        grid: {
            create(arr) {
                var grid = {
                    rowLabels: {}, // {board: 12}, board ele is in 12th index of rows array
                    colLabels: {},
                    rows: [], // {label, weight, n} sorted array of components
                    cols: [],
                    rowsChange: false,
                    colsChange: false,
                    rowsTotal: 0,
                    colsTotal: 0,
                };
                if (arr) arr.forEach(function(ele) {tetresse.modules.defaultGraphics.utils.grid.add(ele);});
                tetresse.modules.defaultGraphics.utils.grid.generateLocs(grid);
                return grid;
            },
            /**
             * ele: {row: {label: "hi", weight: 50, n: 10}, col: "hi"} creates new row / puts in column labeled hi
             */
            add(grid, ele) {
                if (typeof(ele) !== "object") { console.error("[defaultGraphics grid] invalid ele type %s should be object", typeof(ele)); return; }
                ["row", "col"].forEach(function(rc) {
                    if (typeof(ele[rc]) === "object") { // trying to add to row / col
                        if (typeof(ele[rc].label) !== "string") { console.error("[defaultGraphics grid] element.%s.label invalid type %s should be string", rc, typeof(ele[rc].label)); return; }
                        if (typeof(ele[rc].weight) !== "number") { console.warn("[defaultGraphics grid] (label: %s) element.%s.weight was invalid type %s should be number", ele[rc].label, rc, typeof(ele[rc].weight)); return; }
                        if (typeof(ele[rc].n) !== "number") { console.warn("[defaultGraphics grid] (label: %s) element.%s.n was invalid type %s should be number", ele[rc].label, rc, typeof(ele[rc].n)); return; }
                        if (grid[rc + "Labels"][ele[rc].label] !== undefined) { console.error("[defaultGraphics grid] %sLabel %s already exists", rc, ele[rc].label); return; }
                        var loc = tetresse.utils.misc.getLocToInsert(grid[rc + "s"], "weight", ele[rc]);
                        grid[rc + "s"].splice(loc, 0, ele[rc]);
                        grid[rc + "sChange"] = true;
                    }
                });
            },
            generateLocs(grid) {
                ["row", "col"].forEach(function(rc) {
                    if (!grid[rc + "sChange"]) return;
                    var amount = 0; var i = 0;
                    grid[rc + "s"].forEach(function(ele) {
                        grid[rc + "Labels"][ele.label] = i;
                        ele.nOffset = amount;
                        amount += ele.n;
                        i++;
                    });
                    grid[rc + "sTotal"] = amount;
                });
            },
            get(grid, ele) { // returns x and y offset as well as w and h
                if (ele === undefined) return;
                if (typeof(grid) !== "object" || (typeof(ele) !== "object" && typeof(ele) !== "string")) { console.error("[defaultGraphics grid] Invalid parameters (%s, %s) should be type (object, object/string)", typeof(grid), typeof(ele)); return; }
                tetresse.modules.defaultGraphics.utils.grid.generateLocs(grid);
                var row, col;
                if (typeof(ele) !== "string") {
                    row = typeof(ele.row) === "string" ? ele.row : ele.row.label;
                    col = typeof(ele.col) === "string" ? ele.col : ele.col.label;
                } else {
                    row = col = ele;
                }
                if (grid.colLabels[col] === undefined || grid.rowLabels[row] === undefined) return;
                col = grid.cols[grid.colLabels[col]];
                row = grid.rows[grid.rowLabels[row]];
                return {x: col.nOffset, y: row.nOffset, w: col.n, h: row.n};
            },
            getTotals(grid) { // returns {w, h} of totals
                if (typeof(grid) !== "object") { console.error("[defaultGraphics grid] Invalid grid type %s should be object", typeof(grid)); return; }
                tetresse.modules.defaultGraphics.utils.grid.generateLocs(grid);
                return {w: grid.colsTotal, h: grid.rowsTotal};
            }
        },
    }
};