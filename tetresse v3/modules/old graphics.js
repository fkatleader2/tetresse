tetresse.modules.graphics = {
    setup() {
        for (var v in tetresse.modules)
            if (v != "graphics" && tetresse.modules[v].graphics != null && tetresse.modules[v].graphics.sources != null)
                for (var lbl in tetresse.modules[v].graphics.sources) {
                    this.sources[lbl] = {};
                    for (var label in tetresse.modules[v].graphics.sources[lbl]) {
                        var objRef = label.split(".")
                        objRef = objRef[objRef.length - 1];
                        var obj = tetresse.get(label, lbl, this.sources, true)[objRef] = tetresse.modules[v].graphics.sources[lbl][label];
                    }
                }

        var loadSources = function(func, obj, depth, path = "") {
            if (depth == 0 || obj == null) return;
            // console.log("called1: " + depth);
            // console.log("called2: " + depth);
            if (obj.animate != null) { // fill in missing keyframe data
                var ani = obj.animate;
                var defaultKeys = {transparency: 1, translationX: 0, translationY: 0, rotation: 0, scaleX: 1, scaleY: 1, source: null};
                if (ani.keyFrames != null) {
                    var startKeys = {};
                    var endKeys = {};
                    ani.keyFrames.forEach(function(ele) {
                        for (var v in ele)
                            startKeys[v] = startKeys[v] === undefined ? ele[v] : startKeys[v];
                        endKeys[v] = ele[v];
                    });
                    var prevValue = null;
                    if (ani.keyFrames[0].time > 0) ani.keyFrames.splice(0, 0, {time: 0});
                    for (var lbl in defaultKeys) {
                        var ele;
                        for (var i = 0; (ele = ani.keyFrames[i]) !== undefined; i++) {
                            if (ele.time == null) { tetresse.utils.error("time for one of the animations was null"); return; }
                            if (i == 0) { ele[lbl] = ele[lbl] === undefined ? (startKeys[lbl] === undefined ? defaultKeys[lbl] : startKeys[lbl]) : ele[lbl]; }
                            else { // average with prevValue
                                if (ele[lbl] === undefined) { // find next value and average
                                    var next = {v: undefined, t: 0};
                                    for (var j = i + 1; j < ani.keyFrames.length; j++) {
                                        next.v = ani.keyFrames[j][lbl];
                                        next.t = ani.keyFrames[j].time;
                                        if (next.v !== undefined) break;
                                    }
                                    if (next.v === undefined) { // no next value, fills in rest of this label
                                        for (var j = i; j < ani.keyFrames.length; j++) {
                                            ele = ani.keyFrames[j];
                                            ele[lbl] = endKeys[lbl] === undefined ? defaultKeys[lbl] : endKeys[lbl];
                                        }
                                        break;
                                    } else if (typeof prevValue == "number" && typeof next.v == "number") { // average numbers
                                        var prevTime = ani.keyFrames[i - 1];
                                        var nextEle;
                                        for (i = i; (nextEle = ani.keyFrames[i])[lbl] === undefined; j++)
                                            nextEle[lbl] = ((nextEle.time - prevTime) / (next.t - prevTime)) * (next.v - prevValue) + prevValue;
                                    } else { // set value the same as previous keyframe
                                        ele[lbl] = prevValue;
                                    }
                                }
                            }
                            prevValue = ele[lbl];
                        }
                    }
                } else {
                    ani.keyFrames = [defaultKeys];
                }
            }
            if (obj.src != null) { // imgs
                tetresse.modules.graphics.loadImage(obj.src);
                return;
            }
            depth--;
            for (var v in obj) {
                if (v == "imgs") continue;
                func(func, obj[v], depth, path + (path == "" ? "" : "-") + v);
            }
        };
        loadSources(loadSources, this.sources, 4);
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
            if (arr != null)
                arr.forEach(function(ele) {
                    this.add(ele);
                });
            this.generateLocs(grid);
            return grid;
        },
        /**
         * ele: {row: {label: "hi", weight: 50, n: 10}, col: "hi"} creates new row / puts in column labeled hi
         */
        add(grid, ele) {
            if (ele == null) { tetresse.utils.error("ele cannot be null (grid.add)"); return; }
            ["row", "col"].forEach(function(rc) {
                if (typeof ele[rc] != "string") { // trying to add to row / col
                    if (grid[rc + "Labels"][ele[rc].label] != null) { tetresse.utils.error("label [" + ele[rc].label + "] already exists in " + rc + "s"); return; }
                    if (ele[rc].label != null && (ele[rc].weight == null || ele[rc].n == null)) return;
                    if (ele[rc].weight == null || ele[rc].n == null || ele[rc].label == null) {tetresse.utils.error("element needs valid weight (" + ele[rc].weight + "), label (" + ele[rc].label + "), and n (" + ele[rc].n + ") in " + rc); return; }
                    var loc = tetresse.utils.getLocToInsert(grid[rc + "s"], "weight", ele[rc]);
                    grid[rc + "s"].splice(loc, 0, ele[rc]);
                    grid[rc + "sChange"] = true;
                }
            });
        },
        generateLocs(grid) {
            ["row", "col"].forEach(function(rc) {
                if (!grid[rc + "sChange"]) return;
                var amount = 0;
                var i = 0;
                grid[rc + "s"].forEach(function(ele) {
                    grid[rc + "Labels"][ele.label] = i;
                    ele.nOffset = amount;
                    amount += ele.n;
                    i++;
                });
                grid[rc + "sTotal"] = amount;
            });
        },
        edit(grid, ele, newEle) {
            
        },
        get(grid, ele) { // returns x and y offset as well as w and h
            if (grid == null) { tetresse.utils.error("grid cannot be null"); return; }
            this.generateLocs(grid);
            var row = typeof ele.row == "string" ? ele.row : ele.row.label;
            var col = typeof ele.col == "string" ? ele.col : ele.col.label;
            col = grid.cols[grid.colLabels[col]];
            row = grid.rows[grid.rowLabels[row]];
            return {x: col.nOffset, y: row.nOffset, w: col.n, h: row.n};
        },
        getTotals(grid) { // returns {w, h} of totals
            if (grid == null) { tetresse.utils.error("grid cannot be null"); return; }
            this.generateLocs(grid);
            return {w: grid.colsTotal, h: grid.rowsTotal};
        }
    },
    sources: { // TODO preload src images
        imgs: {},
        default: {
            tiles: {
                all: {},
                i: {color: "hsl(196, 89%, 57%)"},
                j: {color: "hsl(231, 69%, 45%)"},
                l: {color: "hsl(24, 98%, 44%)"},
                o: {color: "hsl(42, 97%, 45%)"},
                s: {color: "hsl(92, 91%, 37%)"},
                t: {color: "hsl(314, 63%, 41%)"},
                z: {color: "hsl(348, 86%, 45%)"},
                g: {color: "grey"},
                p: {color: "#525252c0",
                    generate(game, canvas, source, loc) { // loc: {x, y, w, h}, source: background
                        if (game == null) { tetresse.utils.error("game cannot be null"); return; }
                        var graphics = game.modules.graphics;
                        var ctx = canvas.getContext("2d");
                        if (loc.w - 6 <= 0 || loc.h - 6 <= 0) return;
                        ctx.beginPath();
                        ctx.clearRect(loc.x + 3, loc.y + (loc.w == loc.h ? 3 : 0), loc.w - 6, loc.h - (loc.w == loc.h ? 6 : 3));
                        ctx.rect(loc.x + 3, loc.y + (loc.w == loc.h ? 3 : 0), loc.w - 6, loc.h - (loc.w == loc.h ? 6 : 3));
                        ctx.fillStyle = source.color;
                        ctx.fill();
                    }
                },
                lineclear: {
                    animate: {
                        keyFrames: [
                            {time: 0, transparency: 0, source: {color: "rgba(255, 255, 255)"}},
                            // {time: 100, transparency: 1},
                            // {time: 199, transparency: 1},
                            // {time: 200, transparency: 0},
                            {time: 490, transparency: 1, source: {color: "#000000"}},
                            {time: 500}
                        ]
                    }
                },
                "": {color: "clear",
                    generate(game, canvas, source, loc) { // loc: {x, y, w, h}, source: background
                        var graphics = game.modules.graphics;
                        var ctx = canvas.getContext("2d");

                        if (loc.w - 4 <= 0 || loc.h - 4 <= 0) return;
                        ctx.beginPath();
                        ctx.rect(loc.x + 2, loc.y + (loc.w == loc.h ? 2 : 0), loc.w - 4, loc.h - (loc.w == loc.h ? 4 : 2));
                        ctx.fillStyle = "#ffffff30";
                        ctx.fill();
                        if (loc.w - 6 <= 0 || loc.h - 6 <= 0) return;
                        ctx.clearRect(loc.x + 3, loc.y + (loc.w == loc.h ? 3 : 0), loc.w - 6, loc.h - (loc.w == loc.h ? 6 : 3));
                    }
                },
            },
            incomming: {color: "red"},
            mana: {color: "#4b26a5"},
            border: {color: "grey"},
            clear: {color: "clear"},
            background: {color: "black"}, // src: "imgs/space.jpg"
            lineclear: { // TODO animate entire row
            },
        }
    },
    getSource(game, label) { // returns source specified by game in this order: game.modules.graphics.sources[label], game.mode, default
        var override = game.modules.graphics.sources[label];
        return tetresse.get(label, override == null ? game : override, this.sources);
    },
    loadImage(src, callback, args = null) { // loads source and calls callback(args, img) where img is the img created, returns true if loading
        var imgs = tetresse.modules.graphics.sources.imgs;
        if (imgs[src] == null) {
            var img = document.createElement("img");
            imgs[src] = {img: img, onload: [], loaded: false};
            var func = function(src) {
                var imgs = tetresse.modules.graphics.sources.imgs;
                imgs[src].loaded = true;
                imgs[src].onload.forEach(function(ele) {
                    ele.f(ele.a, imgs[src].img);
                });
                imgs[src].onload = [];
            }
            img.onload = func.bind(this, src);
            img.src = src;
        }
        if (callback != null && !imgs[src].loaded) {
            imgs[src].onload.push({f: callback, a: args});
            return true;
        }
        return false;
            // callback(args, imgs[src].img);
    },
    draw(game, canvas, loc = {x: 0, y: 0, w: 100, h: 100, t: 1, r: 0}, source = {}, animate = true) {
        [{x: 0}, {y: 0}, {w: 100}, {h: 100}, {t: 1}, {r: 0}].forEach(function(ele) {
            for (var v in ele) loc[v] = loc[v] == null ? loc[v] = ele[v] : loc[v];
        });
        if (canvas == null) { tetresse.utils.error("canvas cannot be null"); return; }
        var ctx = canvas.getContext("2d");
        ctx.beginPath();
        if (source.color != null) {
            if (source.color == "clear") {
                ctx.clearRect(loc.x, loc.y, loc.w, loc.h);
            } else {
                ctx.rect(loc.x, loc.y, loc.w, loc.h);
                var color = source.color;
                if (loc.t != 1) {
                    color = tetresse.utils.getColor(source.color)
                    color.t = loc.t;
                    color = color.getString();
                }
                ctx.fillStyle = color;
                ctx.fill();
            }
        }
        if (source.src != null) { // show image
            if (tetresse.modules.graphics.sources.imgs[source.src] == null || !tetresse.modules.graphics.sources.imgs[source.src].loaded) {
                // console.log(tetresse.modules.graphics.sources.imgs[source.src]);
                // tetresse.utils.error("image (" + source.src + ") missed the train...");
                tetresse.modules.graphics.loadImage(source.src, function(args, img) {
                    tetresse.modules.graphics.draw(args.game, args.canvas, args.loc, args.source, args.animate);
                }, {game: game, canvas: canvas, loc: loc, source: source, animate: animate});
            } else {
                var img = tetresse.modules.graphics.sources.imgs[source.src].img;
                var w = 1; var h = 1;
                if (img.width / img.height > loc.w / loc.h) w = h * (loc.w / loc.h); // crop width
                else h = w * (loc.h / loc.w); // crop height
                ctx.drawImage(img, 0, 0, w * img.height, h * img.height, loc.x, loc.y, loc.w, loc.h);
            }
        }
        if (source.generate != null) { // generate
            source.generate(game, canvas, source, loc);
        }
        if (animate && source.animate != null) { // animate (setup animation, graphics.animate is called every frame
            var time = (new Date()).getTime();
            var graphics = game.modules.graphics;
            graphics.animation.active.push({src: source, loc: loc, time: time});
            if (graphics.animation.loop == null)
                graphics.animation.loop = window.requestAnimationFrame(this.components.animate.bind(this, game));
        }
    },
    /**
     * element: {src, loc, time}
     *   src: {
     *   return: true if animation is finished
     */
    animate(game, element) { // element is generated and contains src, loc, and time
        if (game.modules.graphics.settings.disableAnimations) return;
        if (element.src == null) return;
        if (element.src.animate == null) return;
        var animation = game.modules.graphics.animation;
        var animationFinished = false;
        var frameSettings = {source: element.src};
        if (element.src.animate.keyFrames != null) { // animate keyframe
            var keyFrames = element.src.animate.keyFrames;
            var time = (new Date()).getTime() - element.time;
            var nextIndex = tetresse.utils.getLocToInsert(keyFrames, "time", {time: time});
            var prevKey = keyFrames[nextIndex == 0 ? 0 : nextIndex - 1];
            var nextKey = keyFrames[nextIndex] === undefined ? keyFrames[nextIndex - 1] : keyFrames[nextIndex];
            if (keyFrames[nextIndex] === undefined) animationFinished = true;
            for (var v in prevKey) {
                if (typeof prevKey[v] == "number" && typeof nextKey[v] == "number")
                    frameSettings[v] = ((time - prevKey.time) / (nextKey.time - prevKey.time)) * (nextKey[v] - prevKey[v]) + prevKey[v];
                else
                    frameSettings[v] = prevKey[v] == null && frameSettings[v] != null ? frameSettings[v] : prevKey[v];
            }
        }
        var loc = {
            x: element.loc.x + frameSettings.translationX,
            y: element.loc.y + frameSettings.translationY,
            w: element.loc.w * frameSettings.scaleX,
            h: element.loc.h * frameSettings.scaleY,
            t: frameSettings.transparency,
        }

        tetresse.modules.graphics.draw(game, game.modules.graphics.canvases.animations, loc, frameSettings.source, false);
        
        return animationFinished;
    },
    components: {
        animate(game) { // animates current frame of game animations
            var graphics = game.modules.graphics;
            var animation = graphics.animation;
            var canvas = graphics.canvases.animations;
            tetresse.modules.graphics.draw(game, canvas, {x: 0, y: 0, w: canvas.width, h: canvas.height}, {color: "clear"}, false);
            for (var i = 0; i < animation.active.length; i++) {
                if (tetresse.modules.graphics.animate(game, animation.active[i])) { // check whether completed
                    animation.active.splice(i, 1);
                    i--;
                }
            }
            if (animation.active.length == 0) { animation.loop = null; return; }
            animation.loop = window.requestAnimationFrame(this.components.animate.bind(this, game));
        },
        tile(game, loc = {x: 0, y: 0, r: 0, c: 0, w: 2, h: 2}, content = "", hide = {top: 0, bot: 0, left: 0, right: 0}, canvas = null) { // loc in units of n, hide is percent
            hide = hide == null ? {} : hide;
            [{arr: ["x", "y", "r", "c"], val: 0, var: loc},
            {arr: ["w", "h"], val: 2, var: loc},
            {arr: ["top", "bot", "left", "right"], val: 0, var: hide}].forEach(function(ele) {
                ele.arr.forEach(function(lbl) {
                    ele.var[lbl] = ele.var[lbl] == null ? ele.val : ele.var[lbl];
                });
            });

            var graphics = game.modules.graphics;
            if (canvas == null) canvas = graphics.canvases.play;
            var n = graphics.n;
            area = {
                x: (loc.x + loc.c * loc.w + hide.left * loc.w) * n,
                y: (loc.y + loc.r * loc.h + hide.top * loc.h) * n,
                w: (loc.w - (hide.left + hide.right) * loc.w) * n,
                h: (loc.h - (hide.top + hide.bot) * loc.h) * n
            };
            for (var e in area)
                area[e] = Math.floor(area[e]);
            tetresse.modules.graphics.draw(game, canvas, area, tetresse.modules.graphics.getSource(game, "tiles")[content]);
            tetresse.modules.graphics.draw(game, canvas, area, tetresse.modules.graphics.getSource(game, "tiles").all);
        },
        piece(game, loc = {x: 0, y: 0, s: 2}, piece, arr) { // piece must be a valid piece
            if (piece == null) { tetresse.utils.error("piece cannot be null"); return; }
            arr = arr == null ? tetresse.utils.pieces.layouts[piece] : arr;
            if (arr == null) { tetresse.utils.error("invalid piece: " + piece); return; };
            for (var r = 0; r < arr.length; r++)
                for (var c = 0; c < arr.length; c++)
                    if (arr[r][c] == 1) {
                        this.tile(game, {x: loc.x, y: loc.y, r: r, c: c, w: loc.s, h: loc.s}, piece);
                    }
        },
        border(game, loc = {x: 0, y: 0, w: 100, h: 100, t: .5}, canvas = null, content = null) {
            var graphics = game.modules.graphics;
            var n = graphics.n;
            var thickness = (loc.t == null ? .5 : loc.t) * n;
            loc = {x: loc.x * n, y: loc.y * n, w: loc.w * n, h: loc.h * n};
            for (var e in loc)
                loc[e] = Math.floor(loc[e]);
            canvas = canvas == null ? game.modules.graphics.canvases.play : canvas;
            tetresse.modules.graphics.draw(game, canvas, loc, tetresse.modules.graphics.getSource(game, "border"));
            loc = {x: loc.x + thickness, y: loc.y + thickness, w: loc.w - 2 * thickness, h: loc.h - 2 * thickness};
            for (var e in loc)
                loc[e] = Math.ceil(loc[e]);
            tetresse.modules.graphics.draw(game, canvas, loc, tetresse.modules.graphics.getSource(game, "background"));
            if (content != null)
                tetresse.modules.graphics.draw(game, canvas, loc, tetresse.modules.graphics.getSource(game, content));
        },
        ability(game, tloc = {x: 0, y: 0, w: 100, h: 100}, type, canvas = null, cooldown = 0) { // TODO implement cooldown
            var loc = {}; [{x: 0}, {y: 0}, {w: 100}, {h: 100}].forEach(function(ele) {
                for (var v in ele) loc[v] = tloc[v] == null ? ele[v] : tloc[v];
            });
            var graphics = game.modules.graphics;
            var n = graphics.n;
            var border = n == 1 ? 1 : .5;
            var source = tetresse.modules.graphics.getSource(game, "abilities");
            if (source == null) { tetresse.utils.error("source not defined for " + game.mode + ".abilities"); return; }
            source = source[type];
            canvas = canvas == null ? graphics.canvases.play : canvas;

            tetresse.modules.graphics.components.border(game, loc, graphics.canvases.play);

            if (source == null) { tetresse.utils.error("[warning] no source for: " + game.mode + ".abilities." + type); return; }
            if (source.src != null && !tetresse.modules.graphics.sources.imgs[source.src].loaded) {
                tetresse.modules.graphics.loadImage(source.src, function(args, img) {
                    tetresse.modules.graphics.components.ability(args.game, args.loc, args.type, args.canvas, args.cooldown);
                }, {game: game, loc: loc, canvas: canvas, type: type, cooldown: cooldown});
                return;
            }
            loc = {x: loc.x + border, y: loc.y + border, w: loc.w - 2 * border, h: loc.h - 2 * border};
            for (var v in loc) loc[v] *= n;
            tetresse.modules.graphics.draw(game, graphics.canvases.play, loc, source);
        },
        sideBar(game, loc = {x: 0, y: 0, w: 1, h: 20.5}, source, amount = 0) {
            var graphics = game.modules.graphics;
            var n = graphics.n;
            var border = n == 1 ? 1 : .5;
            var borderLoc = {x: loc.x - .5, y: loc.y, w: loc.w + 2 * border, h: loc.h};
            tetresse.modules.graphics.components.border(game, borderLoc);
            loc.y += loc.h - amount - border;
            loc.h = amount;
            loc.x = n == 1 ? Math.ceil(loc.x) : loc.x;
            for (var v in loc) loc[v] = loc[v] * n;
            tetresse.modules.graphics.draw(game, graphics.canvases.play, loc, source);
        }
    },
    game: {
        priority: 30, // TODO use for when choosing which module to load the game first
        setup(game) {
            game.modules.graphics = {
                width: 0, height: 0,
                n: 0, // n is unit size of hold piece (1/4 size of regular tile)
                componentWidthN: 0, // width of components in units of n
                componentHeightN: 0, // height of components in units of n
                canvases: {},
                components: {}, // game specific component settings (eg location)
                sources: {}, // tiles: "retro"
                grid: tetresse.utils.grid.create(),
                animation: {
                    loop: null,
                    active: [],
                },
                settings: {
                    disableAnimations: false,
                }
            };

            // setup canvases
            [{classes: ["background"]}, {classes: ["play"]}, {classes: ["animations"]}].forEach(function(ele) {
                var canvas = document.createElement("canvas");
                ele.classes.forEach(function(label) {
                    canvas.classList.add(label);
                });
                game.div.appendChild(canvas);
                game.modules.graphics.canvases[ele.classes[0]] = canvas;
            });


            var graphics = game.modules.graphics;
            var components = tetresse.modules.graphics.game.components;

            var componentsList = tetresse.get(game.state.spectating ? "s.spectatorGraphicsComponents" : "s.graphicsComponents", game);

            componentsList.forEach(function(label) {
                if (components[label] == null) { tetresse.utils.error("invalid graphics component: " + label); return; }
                if (components[label].loc == null) return;
                var arr = components[label].loc.length == null ? [components[label].loc] : components[label].loc;
                arr.forEach(function(ele) {
                    tetresse.utils.grid.add(graphics.grid, ele);
                    graphics.components[ele.label == null ? label : ele.label] = {loc: ele};
                });
            });
            componentsList.forEach(function(label) {
                if (components[label] == null) { tetresse.utils.error("invalid graphics component: " + label); return; }
                if (components[label].loc == null) return;
                var arr = components[label].loc.length == null ? [components[label].loc] : components[label].loc;
                arr.forEach(function(ele) {
                    graphics.components[ele.label == null ? label : ele.label].loc = tetresse.utils.grid.get(graphics.grid, ele);
                });
            });
            
            componentsList.forEach(function(label) { // setup func
                var comps = tetresse.modules.graphics.game.components;
                if (comps[label] != null && comps[label].setup != null)
                    comps[label].setup(game);
            });
            
            // TODO remove later? (replace with a listener)
            this.resize(game);
        },
        cleanup(game) {
            game.div.parentNode.removeChild(game.div);
        },
        resize(game, n) {
            var graphics = game.modules.graphics;
            var gridDimensions = tetresse.utils.grid.getTotals(graphics.grid);

            if (n == null) {
                // update canvas widths
                game.div.style.width = "100%";
                game.div.style.height = "100%";
                if (typeof window.getComputedStyle !== "undefined") {
                    graphics.width = parseInt(window.getComputedStyle(game.div, null).getPropertyValue('width'));
                    graphics.height = parseInt(window.getComputedStyle(game.div, null).getPropertyValue('height'));
                } else {
                    tetresse.utils.error("[warning] browser does not support window.getComputedStyle");
                    graphics.width = game.div.clientWidth;
                    graphics.height = game.div.clientHeight;
                }

                for (var canvas in graphics.canvases) {
                    graphics.canvases[canvas].width = graphics.width;
                    graphics.canvases[canvas].height = graphics.height;
                }

                // update n
                if (gridDimensions.w / gridDimensions.h > graphics.width / graphics.height) { // width is the deciding factor
                    graphics.n = Math.floor(graphics.width / gridDimensions.w);
                    if (graphics.n / 2 != Math.floor(graphics.n / 2) && graphics.n != 1) graphics.n--;
                } else { // height is deciding factor
                    graphics.n = Math.floor(graphics.height / gridDimensions.h);
                    if (graphics.n / 2 != Math.floor(graphics.n / 2) && graphics.n != 1) graphics.n--;
                }
                if (graphics.n == 0) graphics.n = 1;
            } else { graphics.n = n; }

            // shrink canvas and game div to fit board
            graphics.width = graphics.n * gridDimensions.w;
            graphics.height = graphics.n * gridDimensions.h;
            game.div.style.width = graphics.width;
            game.div.style.height = graphics.height;
            for (canvas in graphics.canvases) {
                graphics.canvases[canvas].width = graphics.width;
                graphics.canvases[canvas].height = graphics.height;
            }

            this.update(game, true);
        },
        update(game) {
            tetresse.get(game.state.spectating ? "s.spectatorGraphicsComponents" : "s.graphicsComponents", game).forEach(function(label) {
                var comps = tetresse.modules.graphics.game.components;
                if (comps[label] != null && comps[label].update != null)
                    comps[label].update(game);
            });
        },
        components: {
            board: {
                loc: {row: {weight: 50, label: "board", n: 42}, col: {weight: 50, label: "board", n: 21}},
                prev: [], // array of {r: 0, c: 0} of tiles the last piece set that will need to be overwritten
                update(game) {
                    var graphics = game.modules.graphics;
                    tetresse.modules.graphics.components.border(game, graphics.components.board.loc, graphics.canvases.background);

                    var hiddenRows = Math.floor(game.board.length - tetresse.get("s.shownHeight", game));
                    for (var r = hiddenRows; r < game.board.length; r++) {
                        for (var c = 0; c < game.board[0].length; c++) {
                            var content = game.board[r][c];
                            this.tile(game, r, c, content);
                        }
                    }
                    this.piece(game);
                },
                setup(game) {
                    game.modules.graphics.components.board.prev = [];
                    tetresse.on("graphicsBoard", this.update.bind(this), game, "graphicsModuleBoard", 50, game.listeners);
                    tetresse.on("graphicsPiece", this.piece.bind(this), game, "graphicsModulePiece", 50, game.listeners);
                },
                piece(game) {
                    var graphics = game.modules.graphics;
                    var prev = graphics.components.board.prev;
                    while (prev.length != 0) {
                        var ele = prev.pop();
                        this.tile(game, ele.r, ele.c);
                    }
                    var cur = game.cur.layout;
                    if (cur == null || game.cur.piece == null) return;
                    if (tetresse.get("s.graphicsGhost", game)) {
                        var offset = tetresse.get("dropPiece", game)(game, {harddrop: true, pretend: true});
                        for (var r = 0; r < game.cur.layout.length; r++)
                            for (var c = 0; c < game.cur.layout[0].length; c++)
                                if (game.cur.layout[r][c] == 1) {
                                    prev.push({r: r + offset, c: c + game.cur.loc.x});
                                    this.tile(game, r + offset, c + game.cur.loc.x, "p");
                                }
                    }
                    for (var r = 0; r < game.cur.layout.length; r++)
                        for (var c = 0; c < game.cur.layout[0].length; c++)
                            if (game.cur.layout[r][c] == 1) {
                                prev.push({r: r + game.cur.loc.y, c: c + game.cur.loc.x});
                                this.tile(game, r + game.cur.loc.y, c + game.cur.loc.x, game.cur.piece);
                            }
                },
                tile(game, r, c, content = "") { // (0, 0) is top left
                    var shownHeight = tetresse.get("s.shownHeight", game);
                    r = r - Math.floor(game.board.length - shownHeight);
                    if (r < 0 || c < 0 || r > Math.ceil(shownHeight) || c > game.board[0].length) {
                        tetresse.utils.error("tried to update tile (" + r + ", " + c + "), which is invalid");
                        return;
                    }
                    var graphics = game.modules.graphics;
                    var n = graphics.n;
                    var border = n == 1 ? 1 : .5;
                    var loc = graphics.components.board.loc;
                    var area = {
                        x: loc.x + border,
                        y: loc.y - 1 + border,
                        r: r, c: c, w: 2, h: 2
                    };
                    tetresse.modules.graphics.components.tile(game, area, content, {top: r == 0 ? .5 : 0});
                }
            },
            hold: {
                loc: {row: "board", col: {weight: 30, label: "hold", n: 5.5}},
                widthN: 6, heightN: 6,
                yN: 5, // offsets from board height
                update(game) { // TODO move small tile graphic to an external method (include in board.tile?)
                    var piece = game.cur.hold;
                    var graphics = game.modules.graphics;
                    var loc = graphics.components.hold.loc;
                    var n = graphics.n;
                    var border = n == 1 ? 1 : .5;

                    var area = {x: loc.x, y: loc.y + this.yN + border, w: this.widthN, h: this.heightN};
                    tetresse.modules.graphics.components.border(game, area, graphics.canvases.play);

                    if (piece == null) return;
                    var layout = tetresse.utils.pieces.layouts[piece];
                    var offset = n == 1 ? 1 : (5 - layout.length) / 2;
                    var offsetY = piece == "i" ? 1 + offset : (piece == "o") ? 2 : offset * 2;
                    area = {x: loc.x + border + offset, y: loc.y + this.yN + border + offsetY};

                    tetresse.modules.graphics.components.piece(game, {x: area.x, y: area.y, s: 1}, piece);
                },
                setup(game) {
                    tetresse.on("graphicsHold", this.update.bind(this), game, "graphicsModuleHold", 50, game.listeners);
                }
            },
            next: {
                loc: {row: "board", col: {weight: 70, label: "next", n: 6}},
                widthN: 6, heightN: 6,
                yN: 5,
                update(game) {
                    var pieces = game.cur.next;
                    var graphics = game.modules.graphics;
                    var loc = graphics.components.next.loc;
                    var n = graphics.n;
                    var border = n == 1 ? 1 : .5;
                    var numNext = tetresse.get("s.upNext", game);
                    if (numNext == 0) return;

                    var area = {x: loc.x - (border == 1 ? 0 : border), y: (loc.y + this.yN) + border, w: this.widthN, h: this.heightN};
                    area.h += 4 * (numNext - 1) + (numNext != 1 ? border : 0);

                    tetresse.modules.graphics.components.border(game, area, graphics.canvases.play);

                    area.h = 6;
                    tetresse.modules.graphics.components.border(game, area, graphics.canvases.play);

                    for (var i = 0; i < numNext; i++) {
                        if (pieces == null || pieces.length == 0 || pieces[i] == null) return;
                        var layout = tetresse.utils.pieces.layouts[pieces[i]];
                        var offset = (5 - layout.length) / 2;
                        var offsetY = pieces[i] == "i" ? 1 + offset : (pieces[i] == "o") ? 2 : offset * 2;
                        var a = {x: area.x + offset + border, y: area.y + offsetY + 4 * i + (i != 0 ? 1 : 0)};
                        tetresse.modules.graphics.components.piece(game, {x: a.x, y: a.y, s: 1}, pieces[i]);
                    }
                },
                setup(game) {
                    tetresse.on("graphicsNext", this.update.bind(this), game, "graphicsModuleNext", 50, game.listeners);
                }
            },
            abilities: {
                loc: {row: "board", col: "hold"},
                widthN: 5, heightN: 5,
                yN: 5,
                update(game) {
                    var graphics = game.modules.graphics;
                    var loc = graphics.components.abilities.loc;
                    var n = graphics.n;
                    var border = n == 1 ? 1 : .5;

                    var gridDim = tetresse.utils.grid.get(graphics.grid, {row: "board", col: "board"});
                    var offsetY = (border + tetresse.get("s.shownHeight", game)) * 2 - 10;
                    var area = {x: (loc.x + 1), y: (loc.y + offsetY) + border, w: this.widthN, h: this.heightN};
                    var passiveArea = {x: loc.x + 1, y: area.y + 6 - border, w: area.w - 2 * border, h: area.h - 2 * border};
                    
                    var abilities = tetresse.get("s.abilities", game);
                    if (abilities.length == null) { tetresse.error("the setting 'abilities' length is null in mode: game.mode"); return; }
                    for (var i = 0; i < abilities.length; i++) {
                        var ele = abilities[i];
                        var a = area;
                        if (ele.type == "passive")
                            a = passiveArea;
                        tetresse.modules.graphics.components.ability(game, a, ele.type);
                        a.y -= 6;
                    }
                }
            },
            shake: { // TODO
                loc: [
                    {row: {weight: 5, label: "northShake", n: 1}, col: "board", label: "northShake"},
                    {row: "board", col: {weight: 5, label: "eastShake", n: 1}, label: "eastShake"},
                    {row: {weight: 95, label: "southShake", n: 1}, col: "board", label: "southShake"},
                    {row: "board", col: {weight: 95, label: "westShake", n: 1}, label: "westShake"},
                ],
                update(game, force = 50, direction = "east", rebound = false) { // force is on a scale from 0 to 100

                }
            },
            background: {
                loc: {row: "board", col: "board"},
                update(game) {
                    var graphics = game.modules.graphics;
                    var ctx = graphics.canvases.background.getContext("2d");

                    var n = graphics.n;
                    var border = n == 1 ? 1 : n / 2;
                    var loc = graphics.components.background.loc;
                    var widthN = 21;
                    var heightN = 42;
                    var area = {x: loc.x * n + border, y: loc.y * n + border, w: widthN * n - 2 * border, h: heightN * n - 2 * border};
                    var source = tetresse.modules.graphics.getSource(game, "background");
                    tetresse.modules.graphics.draw(game, graphics.canvases.background, area, source);
                },
            },
            lineclear: {
                play(game, rows) {
                    var graphics = game.modules.graphics;
                    var hiddenRows = Math.floor(game.board.length - tetresse.get("s.shownHeight", game));
                    rows.forEach(function(r) {
                        for (var c = 0; c < game.board[0].length; c++)
                            tetresse.modules.graphics.game.components.board.tile(game, r, c, "lineclear");
                    });
                },
                setup(game) {
                    tetresse.on("linesCleared", this.play, game, "animation", 60, game.listeners);
                },
                cleanup(game) {

                }
            },
            incomming: {
                loc: {row: "board", col: {weight: 60, label: "incomming", n: 1}},
                setup(game) {
                    var graphics = game.modules.graphics;
                    graphics.components.incomming.amount = 6;
                },
                update(game) {
                    var graphics = game.modules.graphics;
                    var loc = graphics.components.incomming.loc;
                    var n = graphics.n;
                    var border = n == 1 ? 1 : .5;
                    var area = {x: loc.x, y: loc.y, w: border, h: loc.h};
                    tetresse.modules.graphics.components.sideBar(game, area, tetresse.modules.graphics.getSource(game, "incomming"), graphics.components.incomming.amount);
                }
            },
            mana: {
                loc: {row: "board", col: {weight: 40, label: "mana", n: 1}},
                setup(game) {
                    var graphics = game.modules.graphics;
                    graphics.components.mana.amount = 8;
                },
                update(game) {
                    var graphics = game.modules.graphics;
                    var loc = graphics.components.mana.loc;
                    var n = graphics.n;
                    var border = n == 1 ? 1 : .5;
                    var area = {x: loc.x + border, y: loc.y, w: border, h: loc.h};
                    tetresse.modules.graphics.components.sideBar(game, area, tetresse.modules.graphics.getSource(game, "mana"), graphics.components.mana.amount);

                }
            }
        }
    },
}