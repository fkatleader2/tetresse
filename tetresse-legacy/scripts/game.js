var games;

/**
 * TODO
 * create gameover menu
 * create pause menu
 * finish finesse
 * use node js to connect with data stream?
 * use get / post to get moves?
 * add game options: 40 line, etc (in game creation and stats?)
 * remove statslisteners for stats that don't have any elements (reload option)
 * generate header linking to other local sites
 * count tspins that don't clear lines
 * Change ids to be unique (board cover) - class can be different
 * Convert current CSS settings to be contained in this board (option to customize it?)
 * design way to define settings from game html (inner html?)
 * Add option to add event listeners for resizing board / stats updates / piece movements (recording) etc
 * change settings without reloading board
 * add setting for silencing settingsListeners
 * load board from setup - resume
 * add multiple keys to one function
 * add tutorials / tools (finesse)
 * create pages: solo practice, sprint, versus?
 * create "click on game to start" menu
 * add different tetris color settings
 * line clear animation / delay setting
 */

/**
 * setup - goes through page and replaces elements that contain class "game" with a game
 */
function setup() {
    games = [];

    var ele, ele1, ele2;
    var gameArr = document.getElementsByClassName("game");

    for (var i = 0; i < gameArr.length; i++) {
        var element = gameArr[i];

        var settings = getCookie("settings");
        settings = settings.length == 0 ? {} : JSON.parse(settings);

        if (element.innerHTML.length != 0) {
            var str = element.innerHTML;
            element.innerHTML = "";
            if (str.indexOf("play") != -1) {
                var e = addChild(element, "game-" + games.length + "-file-input", "input");
                e.type = "file";
                settings.loadFile = [];
                settings.loadFile.push(e);
            }
            if (str.indexOf("hide options bar") != -1) {
                settings.optionsBarVisible = false;
            }
            if (str.indexOf("show finesse errors") != -1) {
                settings.showFinesseErrors = true;
            }
            if (str.indexOf("redo finesse errors") != -1) {
                settings.redoFinesseErrors = true;
            }
        }

        element.id += "-" + games.length + "-container";
        element.classList.add("game-container");

        ele1 = addChild(element, "game-" + games.length, "div");
        ele1.classList.add("loaded-game");

        settings.playable = true; // jank!

        var a = new Game([ele1, settings]); // idk why but if I remove the variable a this doesn't work :'(
        games.push(a);
    }
}

function setCookie(name, value, exp) {
    value = escape(value);
    var d = new Date();
    d.setTime(d.getTime() + (exp*24*60*60*1000));
    var expires = "expires="+ d.toUTCString();
    document.cookie = name + "=" + value + ";" + expires + ";path=/";
}

function getCookie(name) {
    name += "=";
    var decodedCookie = decodeURIComponent(document.cookie);
    var ca = decodedCookie.split(';');
    for(var i = 0; i <ca.length; i++) {
        var c = ca[i];
        while (c.charAt(0) == ' ') {
            c = c.substring(1);
        }
        if (c.indexOf(name) == 0) {
            var rtnstr = c.substring(name.length, c.length);
            return unescape(rtnstr);
        }
    }
    console.log("Couldn't get cookie");
    return "";
}

// TODO add these as static functions to game class
function error(message) {
    throw new Error("[game.js]: " + message);
}

function log(message) {
    console.log("Log: " + message);
}

function addEvent(element, eventName, callback) {
    if (element.addEventListener) {
        element.addEventListener(eventName, callback, false);
    } else if (element.attachEvent) {
        element.attachEvent("on" + eventName, callback);
    } else {
        element["on" + eventName] = callback;
    }
}

function addChild(parent, id, type) {
    var newEle = document.createElement(type);
    newEle.id = id;
    parent.appendChild(newEle);
    return newEle;
}

class Game {
    /**
     * args - array of arguments
     *   0: element to construct this game with
     *   1: settings to use
     */
    constructor(args) {
        if (args == null || args.length == 0) error("Invalid arguments for board constructor: " + args);
        if (args[0] == null) error("Board element cannot be null in constructor parameter");
        
        this.element = args[0];
        this.name = "tetresse";

        // load settings
        this.settings = Game.getDefaultSettings();
        if (args[1] != null) {
            var changedSettings = args[1];
            var settings = this.settings;
            var labels = this.settings.labels;
            for (var i = 0; i < labels.length; i++) {
                if (changedSettings[labels[i]] != null)
                    settings[labels[i]] = changedSettings[labels[i]];
            }
        }
        setCookie("settings", JSON.stringify(this.settings), 1000);

        // generate board
        this.board = {
            tiles: []
        };
        // generate tiles on board TODO test
        var playArea = addChild(this.element, "board", "div");
        if (this.settings.playable) { // TODO change this setting name (what should it do)
            this.boardCover = addChild(playArea, "board-cover", "div");
            this.boardCover.tabIndex = 0;
        }
        for (var r = 0; r < 40; r++) {
            this.board.tiles.push([]);
            for (var c = 0; c < 10; c++) {
                this.board.tiles[r].push({p: "", element: null});
                // TODO add rows above option in settings
                // generate html
                if (r > 19) {
                    var span = document.createElement("span");
                    playArea.appendChild(span);
                    span.id = "cell-" + r + "-" + c;
                    this.board.tiles[r][c].element = span;
                }
            }
        }

        // add credits
        var tempCredits = addChild(this.boardCover.parentNode.parentNode, "credits", "div");
        tempCredits.innerHTML = "<!-- Images: Icons made by Dave Gandy, Freepik,  from www.flaticon.com -->";

        // add rest of elements
        var holdContainer = addChild(this.element, "hold", "div")
        this.realHeldPiece = addChild(holdContainer, "hold-center", "div");
        this.realHeldPieces = [];
        for (var i = 0; i < 4; i++) {
            this.realHeldPieces.push(addChild(this.realHeldPiece, "hold-piece", "span"))
        }
        this.realNextPiecesContainer = addChild(this.element, "next-pieces", "div");
        this.realNextPiecesLocations = [];
        for (var i = 0; i < this.settings.numNextPieces; i++) {
            var piece = addChild(this.realNextPiecesContainer, "next-piece-" + i, "div");
            var arr = [];
            for (var j = 0; j < 4; j ++) {
                var span = addChild(piece, "next-piece-" + arr.length + "-" + i, "span");
                arr.push(span);
            }
            this.realNextPiecesLocations.push(arr);
        }

        this.paused = !(this.boardCover === document.activeElement);

        // stats stuff
        this.stats = new Stats(this);
        this.stats.addStatsListener("pause", function(s) {
            s.clock.pause();
        });
        this.stats.addStatsListener("resume", function(s) {
            s.clock.resume();
        });
        this.stats.addStatsListener("addRecord", function(s) {
            
        });
        this.stats.addStatsListener("startGame", function(s) {
            s.startTime.updateValue(new Date().getTime());
        });
        this.stats.addStatsListener("endGame", function(s) {
            s.endTime.updateValue(new Date().getTime());
        });
        this.stats.addStatsListener("linesCleared", function(s) {
            var p = s.board.piece;
            s.linesCleared.total.add(p.linesCleared);
            s.linesCleared.count[p.linesCleared - 1].add(1);
            if (p.spin) {
                // TODO add s.spins[p.piece].count[p.linesCleared - 1].add(1)
            }
        });
        this.stats.addStatsListener("spin", function(s) {
            var p = s.board.piece.piece;
            var lc = s.board.piece.linesCleared;
            s.spins.total.add(1);

            // TODO set initial values to 6
            // TODO change these to be a part of the tspin statsListener?
            s.spins[p].total.add(1);
            if (lc > 0) {
                s.spins[p].count[lc - 1].add(1);
            }
            // s.executeStatsListeners(p.piece + "spin");
        });
        this.stats.addStatsListener("piecePlaced", function(s) {
            s.piecesPlaced.add(1);

            // update pp TODO update pp for regular lines cleared and make easier (repeated code in tick)
            s.spins.total.update("pp");
            s.finesse.update("pp");
            s.linesCleared.total.update("pp");
            for (var i = 0; i < 4; i++)
                s.linesCleared.count[i].update("pp");

            var str = "ijlstz";
            for (var j = 0; j < str.length; j++) {
                s.spins[str.charAt(j)].total.update("ps");
                for (var k = 0; k < (str.charAt(j) == "i" ? 4 : 3); k++) {
                    s.spins[str.charAt(j)].count[k].update("pp");
                }
            }

            // finesse
            var rec = s.board.record;
            var p = s.board.piece;

            var count = 0;
            for (var i = p.keysPressed.length - 1; i >= 0; i--) {
                var j = p.keysPressed[i].key;
                if ("hold".indexOf(j) != -1)
                    break;
                if ("sd".indexOf(j) != -1) {
                    count = 0;
                    break;
                }
                if (("hd").indexOf(j) == -1)
                    count++;
            }

            if (!p.spin) {
                var v = s.board.getIdealFinesse(p.piece, p.getLocation()[1], p.getRotation(), p.spin);
                
                var str = "";
                for (var i = 0; i < v.length; i++)
                    str += v[i] + ", ";
                if (str.length > 0)
                    str = str.substring(0, str.length - 2);
                else
                    str = "drop"; // TODO put this in settings?
                if (count - v.length > 0) {
                    s.finesse.add(count - v.length);
                    s.finessePrintout.updateValue(str); // TODO add finesse error (tell user what they did that was wrong)
                    if (s.board.settings.redoFinesseErrors)
                        p.reset();
                    else
                        if (s.board.settings.showFinesseErrors)
                            p.greyOut();
                }
            }
        });
        this.stats.addStatsListener("ispin", function(s) {

        });
        this.stats.addStatsListener("jspin", function(s) {

        });
        this.stats.addStatsListener("jspin", function(s) {

        });
        this.stats.addStatsListener("sspin", function(s) {

        });
        this.stats.addStatsListener("tspin", function(s) {

        });
        this.stats.addStatsListener("zspin", function(s) {

        });
        this.stats.addStatsListener("tick", function(s) {
            if (s.clock.paused)
                s.totalPauseTime.updateValue(s.clock.getPausedTime());
            else
                s.totalTime.updateValue(s.clock.getStoredTime());

            // update ps TODO update ps for regular linesCleared
            s.spins.total.update("ps");
            s.finesse.update("ps");
            s.linesCleared.total.update("ps");
            for (var i = 0; i < 4; i++)
                s.linesCleared.count[i].update("ps");
            
            var str = "ijlstz";
            for (var j = 0; j < str.length; j++) {
                s.spins[str.charAt(j)].total.update("ps");
                for (var k = 0; k < (str.charAt(j) == "i" ? 4 : 3); k++) {
                    s.spins[str.charAt(j)].count[k].update("ps");
                }
            }
        });

        // generate menus over boardcover
        if (true) {// TODO add setting for menu generation
            var v, arr;
            var menu = addChild(this.boardCover, this.element.id + "-menu", "div");
            menu.classList.add(this.name + "-menu");
            menu.style.display = "none";
            // title
            var title = addChild(menu, menu.id + "-title", "div");
            title.classList.add(this.name + "-menu-title");
            v = addChild(title, title.id + "-hamburger", "div");
            v.classList.add(this.name + "-hamburger");
            v.classList.add(this.name + "-menu-title-button");
            v.classList.add(this.name + "-al");
            v.style.display = "none";
            v = addChild(title, title.id + "-text", "div");
            v.classList.add(this.name + "-menu-title-text");
            v = addChild(title, title.id + "-x", "div");
            v.classList.add(this.name + "-x");
            v.classList.add(this.name + "-menu-title-button");
            v.classList.add(this.name + "-ar");
            v.onclick = function(e) {
                games[Game.getGameNumber(e.target.id)].showMenu(null);
            }

            //settings TODO make expandable (based on settings)
            var settings = addChild(menu, menu.id + "-settings", "div");
            settings.classList.add(this.name + "-menu-content");

            settings.style.display = "none";
            // keybinds
            var keybinds = addChild(settings, settings.id + "-keybinds", "div");
            keybinds.classList.add(this.name + "-menu-group");
            v = addChild(keybinds, keybinds.id + "-heading", "div");
            v.classList.add(this.name + "-menu-break");
            v.innerHTML = "Keybinds";
            arr = ["Left", "Right", "CCW", "CW", "SD", "HD", "Hold", "180"];
            for (var i = 0; i < arr.length; i++) {
                var g, e;
                if (i % 2 == 0) {
                    g = addChild(keybinds, keybinds.id + "-container-" + i, "div");
                    g.classList.add(this.name + "-menu-keybind-group");
                }
                e = addChild(g, g.id + "-element-" + arr[i].toLowerCase(), "div");
                e.classList.add(this.name + "-menu-keybinds-element");
                e.classList.add(this.name + (i % 2 == 0 ? "-al" : "-ar"));
                v = addChild(e, e.id + "-question", "div");
                v.classList.add(this.name + "-question");
                v.classList.add(this.name + "-menu-keybinds-button");
                v.classList.add(this.name + "-al");
                v.title = (i == 0 || i == 1 ? "Move " + arr[i].toLowerCase() + "... have you not played tetris before? You should probably learn what the controls do before learning finesse" :
                        (i == 2 || i == 3 ? "Rotate " + (i == 2 ? "counter " : "") + "clockwise" :
                            (i == 4 ? "Soft drop (drop softly)" : (i == 5 ? "Hard drop (http://harddrop.com/fkatleader2/)" :
                                (i == 6 ? "Hold the current piece in play" : "")
                            ))
                        )
                    );
                v = addChild(e, e.id + "-text", "div");
                v.classList.add(this.name + "-menu-keybinds-text");
                v.innerHTML = arr[i];
                v = addChild(e, e.id + "-view", "div");
                v.classList.add(this.name + "-view");
                v.classList.add(this.name + "-menu-keybinds-button");
                v.classList.add(this.name + "-ar");
                v.classList.add(this.name + "-disabled");
                v = addChild(e, e.id + "-add", "div");
                v.classList.add(this.name + "-add");
                v.classList.add(this.name + "-menu-keybinds-button");
                v.classList.add(this.name + "-ar");
                v.tabIndex = "2";
                addEvent(v, "click", Game.addKeybind);
            }
            // gameplay
            var gamePlay = addChild(settings, settings.id + "-game-play", "div");
            gamePlay.classList.add(this.name + "-menu-group");
            v = addChild(gamePlay, gamePlay.id + "-heading", "div");
            v.classList.add(this.name + "-menu-break");
            v.innerHTML = "Game Play";
            arr = ["ARR", "DAS"];
            for (var i = 0; i < arr.length; i++) {
                var g, e, e1;
                if (i % 2 == 0) {
                    g = addChild(gamePlay, gamePlay.id + "-container-" + i, "div");
                    g.classList.add(this.name + "-menu-keybind-group");
                }
                e = addChild(g, g.id + "-element-" + arr[i].toLowerCase(), "div");
                e.classList.add(this.name + "-menu-keybinds-element");
                e.classList.add(this.name + (i % 2 == 0 ? "-al" : "-ar"));
                v = addChild(e, e.id + "-question", "div");
                v.classList.add(this.name + "-question");
                v.classList.add(this.name + "-al");
                v.classList.add(this.name + "-menu-keybinds-button");
                v.title = (v == 0 ? "Auto Repeat Rate - how fast the piece goes to the wall when a key is held down" : "Delayed Auto Shift - how long it takes when holding down a key to make the piece start moving really fast towards the wall");
                v = addChild(e, e.id + "-text", "div");
                v.classList.add(this.name + "-al");
                v.innerHTML = arr[i];
                v = addChild(e, e.id + "-edit", "div");
                v.classList.add(this.name + "-edit", this.name + "-ar", this.name + "-menu-keybinds-button");
                addEvent(v, "click", function(e) {
                    var board = games[Game.getGameNumber(e.target.id)];
                    var eles = e.target.parentNode.children;
                    eles[2].style.display = "none";
                    eles[4].style.display = "none";
                    eles[3].style.display = "inline-block";
                    eles[3].value = eles[4].innerHTML;
                    addEvent(eles[3], "keypress", function(e){
                        if (!e) e = window.event;
                            var keyCode = e.keyCode || e.which;
                            if (keyCode == '13'){
                                e.target.blur();
                            }
                    });
                    eles[3].focus();
                });
                v = addChild(e, e.id + "-edit-area", "input");
                v.type = "text";
                v.classList.add(this.name + "-menu-keybinds-edit-area", this.name + "-ar");
                addEvent(v, "blur", function(e) {
                    var board = games[Game.getGameNumber(e.target.id)];
                    var eles = e.target.parentNode.children;
                    eles[2].style.display = "inline-block";
                    eles[3].style.display = "none";
                    var val = parseInt(eles[3].value);
                    if (eles[4].id.indexOf("-arr") != -1) {
                        board.settings.arr = val
                        setCookie("settings", JSON.stringify(board.settings), 1000);
                    } else {
                        board.settings.das = val;
                        setCookie("settings", JSON.stringify(board.settings), 1000);
                    }
                    eles[4].innerHTML = val;
                    eles[4].style.display = "inline-block";
                });
                v = addChild(e, e.id + "-number", "div");
                v.classList.add(this.name + "-menu-settings-number");
                v.classList.add(this.name + "-ar");
                v.innerHTML = this.settings[arr[i].toLowerCase()];
            }
            // finesse
            var finesse = addChild(settings, settings.id + "-finesse", "div");
            finesse.classList.add(this.name + "-menu-group");
            v = addChild(finesse, finesse.id + "-heading", "div");
            v.classList.add(this.name + "-menu-break");
            v.innerHTML = "Finesse";
            arr = [["showFinesseErrors", "Show"],["redoFinesseErrors", "Redo"]];
            for (var i = 0; i < arr.length; i++) {
                var g, e;
                if (i % 2 == 0) {
                    g = addChild(finesse, finesse.id + "-container-" + i, "div");
                    g.classList.add(this.name + "-menu-keybind-group");
                }
                e = addChild(g, g.id + "-element-" + arr[i][1].toLowerCase(), "div");
                e.classList.add(this.name + "-menu-keybinds-element");
                e.classList.add(this.name + (i % 2 == 0 ? "-al" : "-ar"));
                v = addChild(e, e.id + "-question", "div");
                v.classList.add(this.name + "-question");
                v.classList.add(this.name + "-al");
                v.classList.add(this.name + "-menu-keybinds-button");
                v.title = (i == 0 ? "Show finesse errors - changes the colors of pieces that were dropped with bad finesse.\nNote: if both 'Show' and 'Redo' are checked this setting does nothing" : "Redo finesse errors - resets the piece after it has been placed with bad finesse");
                v = addChild(e, e.id + "-text", "div");
                v.classList.add(this.name + "-al");
                v.innerHTML = arr[i][1];
                v = addChild(e, e.id + "-checkbox", "input");
                v.type = "checkbox";
                v.classList.add(this.name + "-ar", this.name + "-menu-keybinds-checkbox");
                v.checked = this.settings[arr[i][0]];
                addEvent(v, "change", function(e) {
                    var board = games[Game.getGameNumber(e.target.id)];
                    if (e.target.id.indexOf("-show-") != -1) {
                        board.settings.showFinesseErrors = e.target.checked;
                        setCookie("settings", JSON.stringify(board.settings), 1000);
                    } else {
                        board.settings.redoFinesseErrors = e.target.checked;
                        setCookie("settings", JSON.stringify(board.settings), 1000); // TODO remove these inline cookie updates
                    }
                });
            }

            // menu stuffs
            if (true) {
                this.menu = {
                    stats: {
                        pageStats: [], // corrisponds with elements array
                        elements: [],
                        add: function(ps, e) {
                            this.pageStats.push(ps);
                            this.elements.push(e);
                        },
                        display: function() {
                            for (var i = 0; i < this.pageStats.length; i++)
                                this.pageStats[i].addElements([this.elements[i]]);
                        },
                        hide: function() {
                            for (var i = 0; i < this.pageStats.length; i++)
                                this.pageStats[i].removeElement(this.elements[i]);
                        }
                    }
                };
            }
            // Stats
            var stats = addChild(menu, menu.id + "-stats", "div");
            stats.classList.add(this.name + "-menu-content");
            stats.style.display = "none";
            // generate nested options
            v = function(func, board, parent, reference) {
                var e, e1, e2, f;
                if (reference.id == null) {
                    e = parent;
                } else {
                    e = addChild(parent, parent.id + "-" + reference.id, "div");

                    f = function(e) {
                        var ele = e.target.parentNode.parentNode.children;
                        var eleArrow = e.target.parentNode.children[1];
                        for (var i = 1; i < ele.length; i++)
                            ele[i].style.display = (ele[i].style.display == "inline-block" ? "none" : ( ele[i].style.display == "none" ? "inline-block" : "inline-block"));
                        if (ele.length > 1) {
                            eleArrow.classList.toggle("tetresse-arrow-sideways");
                            eleArrow.classList.toggle("tetresse-arrow-down");
                        }
                    };

                    g = function(e) {
                        var eles = e.target.parentNode.children;
                        var eles = eles[eles.length - 1].children;
                        for (var i = 0; i < eles.length; i++)
                            eles[i].style.display = (eles[i].style.display == "inline-block" ? "none" : ( eles[i].style.display == "none" ? "inline-block" : "inline-block"));
                    }

                    e.classList.add(board.name + "-menu-stat");
                    e1 = addChild(e, e.id + "-content", "div");
                    e1.classList.add(board.name + "-menu-stat-content");
                    e2 = addChild(e1, e1.id + "-number", "div");
                    e2.classList.add(board.name + "-menu-stat-number", board.name + "-ar");
                    reference.pageStat.addElements([e2]);
                    board.menu.stats.add(reference.pageStat, e2);
                    e2 = addChild(e1, e1.id + "-arrow", "div");
                    e2.classList.add(board.name + "-arrow-sideways", board.name + "-menu-stat-arrow", board.name + "-al");
                    if (reference.stats != null)
                        e2.onclick = f;
                    else
                        e2.style.opacity = "0";
                    e2 = addChild(e1, e1.id + "-text", "div");
                    e2.classList.add(board.name + "-menu-stat-text", board.name + "-al");
                    e2.innerHTML = reference.name;
                    if (reference.stats != null)
                        e2.onclick = f;
                    e2 = addChild(e1, e1.id + "-question", "div");
                    e2.classList.add(board.name + "-question", board.name + "-menu-stat-button", board.name + "-ar");
                    e2.classList.add(board.name + "-disabled");
                    if (reference.pageStat.linked != null) {
                        e2 = addChild(e1, e1.id + "-dots", "div");
                        e2.classList.add(board.name + "-dots", board.name + "-menu-stat-button", board.name + "-ar");
                        e2.onclick = g;
                        e2 = addChild(e1, e1.id + "-options", "div");
                        var h = function(parent, board, pageStat) {
                            var e3, e4;
                            e3 = addChild(parent, parent.id + "-" + pageStat.type, "div");
                            e3.classList.add(board.name + "-menu-stat");
                            e3.style.display = "none";
                            e4 = addChild(e3, e3.id + "-text", "div");
                            e4.classList.add(board.name + "-menu-stat-text", board.name + "-ar");
                            e4.innerHTML = "-" + pageStat.type;
                            e4 = addChild(e3, e3.id + "-number", "div");
                            e4.classList.add(board.name + "-menu-stat-number", board.name + "-ar");
                            pageStat.addElements([e4]);
                            board.menu.stats.add(pageStat, e4);
                            e4 = addChild(e3, e3.id + "-question", "div");
                            e4.classList.add(board.name + "-question", board.name + "-menu-stat-button", board.name + "-al");
                            e4.classList.add(board.name + "-disabled");
                        }
                        for (var j = 0; j < reference.pageStat.linked.length; j++)
                            h(e2, board, reference.pageStat.linked[j]);
                    }
                }
                if (reference.stats == null)
                    return;
                for (var i = 0; i < reference.stats.length; i++) {
                    func(func, board, e, reference.stats[i]);
                }
            }
            // stat object: TODO make cleaner and create stats object / use it here
            v(v, this, stats, {
                stats: [
                    {id: "total-time", name: "Time", pageStat: this.stats.totalTime,
                        stats: [
                            {id: "time-paused", name: "Paused", pageStat: this.stats.totalPauseTime},
                        ]
                    }, {id: "pieces-placed", name: "Pieces Placed", pageStat: this.stats.piecesPlaced,
                        // stats: [
                        //     {} TODO add the different pieces
                        // ]
                    }, {id: "finesse", name: "Finesse Errors", pageStat: this.stats.finesse,
                        stats: [
                            {id: "printout", name: "Tips", pageStat: this.stats.finessePrintout}
                        ]
                    }, {id: "lines-cleared", name: "Lines Cleared", pageStat: this.stats.linesCleared.total,
                        stats: [
                            {id: "singles", name: "Singles", pageStat: this.stats.linesCleared.count[0]},
                            {id: "doubles", name: "Doubles", pageStat: this.stats.linesCleared.count[1]},
                            {id: "triples", name: "Triples", pageStat: this.stats.linesCleared.count[2]},
                            {id: "tetrisses", name: "Tetrisses", pageStat: this.stats.linesCleared.count[3]}
                        ]
                    }, {id: "spins", name: "Spins", pageStat: this.stats.spins.total,
                        stats: [
                            {id: "i", name: "I", pageStat: this.stats.spins.i.total,
                                stats: [
                                    {id: "singles", name: "Singles", pageStat: this.stats.spins.i.count[0]},
                                    {id: "doubles", name: "Doubles", pageStat: this.stats.spins.i.count[1]},
                                    {id: "triples", name: "Triples", pageStat: this.stats.spins.i.count[2]},
                                    {id: "tetrisses", name: "Tetrisses", pageStat: this.stats.spins.i.count[3]}
                                ]
                            }, {id: "j", name: "J", pageStat: this.stats.spins.j.total,
                                stats: [
                                    {id: "singles", name: "Singles", pageStat: this.stats.spins.j.count[0]},
                                    {id: "doubles", name: "Doubles", pageStat: this.stats.spins.j.count[1]},
                                    {id: "triples", name: "Triples", pageStat: this.stats.spins.j.count[2]}
                                ]
                            }, {id: "l", name: "L", pageStat: this.stats.spins.l.total,
                                stats: [
                                    {id: "singles", name: "Singles", pageStat: this.stats.spins.l.count[0]},
                                    {id: "doubles", name: "Doubles", pageStat: this.stats.spins.l.count[1]},
                                    {id: "triples", name: "Triples", pageStat: this.stats.spins.l.count[2]}
                                ]
                            }, {id: "s", name: "S", pageStat: this.stats.spins.s.total,
                                stats: [
                                    {id: "singles", name: "Singles", pageStat: this.stats.spins.s.count[0]},
                                    {id: "doubles", name: "Doubles", pageStat: this.stats.spins.s.count[1]},
                                    {id: "triples", name: "Triples", pageStat: this.stats.spins.s.count[2]}
                                ]
                            }, {id: "t", name: "T", pageStat: this.stats.spins.t.total,
                                stats: [
                                    {id: "singles", name: "Singles", pageStat: this.stats.spins.t.count[0]},
                                    {id: "doubles", name: "Doubles", pageStat: this.stats.spins.t.count[1]},
                                    {id: "triples", name: "Triples", pageStat: this.stats.spins.t.count[2]}
                                ]
                            }, {id: "z", name: "Z", pageStat: this.stats.spins.z.total,
                                stats: [
                                    {id: "singles", name: "Singles", pageStat: this.stats.spins.z.count[0]},
                                    {id: "doubles", name: "Doubles", pageStat: this.stats.spins.z.count[1]},
                                    {id: "triples", name: "Triples", pageStat: this.stats.spins.z.count[2]}
                                ]
                            }
                        ]
                    }
                ]
            });
            
            // question
            var question = addChild(menu, menu.id + "-question", "div");
            question.classList.add(this.name + "-menu-content");
            question.style.display = "none";
            // basic info
            var questionBasicInfo = addChild(question, question.id + "-basic-info", "div");
            questionBasicInfo.classList.add(this.name + "-menu-group");
            v = addChild(questionBasicInfo, questionBasicInfo.id + "-heading", "div");
            v.classList.add(this.name + "-menu-break");
            v.innerHTML = "Basic Info";
            v = addChild(questionBasicInfo, questionBasicInfo.id + "-text", "div");
            v.innerHTML = "Just another tetris clone! Hover over the question mark to get information in the different menus (don't click).<br>The current piece movement settings are set to the max speed on Tetris Friends, but you can change them in the settings menu under the gameplay section.<br>A spin is when a piece cannot move left, right, or up after being placed.";
            // mechanics
            var questionMechanics = addChild(question, question.id + "-mechanics", "div");
            questionMechanics.classList.add(this.name + "-menu-group");
            v = addChild(questionMechanics, questionMechanics.id + "-heading", "div");
            v.classList.add(this.name + "-menu-break");
            v.innerHTML = "Mechanics";
            v = addChild(questionMechanics, questionMechanics.id + "-text", "div");
            v.innerHTML = "This tetris clone uses the SRS rotation system and has a play area 40x10 (board extends 20 tiles past the top).<br>Gravity speed is 1 second and the piece autoplaces after gravity has been canceled 20 times (by movement left / right or rotating).";
            // known bugs TODO
            var questionKnownBugs = addChild(question, question.id + "-known-bugs", "div");
            questionKnownBugs.classList.add(this.name + "-menu-group");
            v = addChild(questionKnownBugs, questionKnownBugs.id + "-heading", "div");
            v.classList.add(this.name + "-menu-break");
            v.innerHTML = "Known Bugs";
            v = addChild(questionKnownBugs, questionKnownBugs.id + "-text", "div");
            v.innerHTML = "-Finesse tracker:<br>Ignores a piece if it's spun into place.<br>Counter stops counting after soft drops.<br>Does not penalize using DAS left instead of right right (not using DAS is faster).<br>-o spin:<br>Not yet implemented.";
            // bug reporting TODO
            var questionBugs = addChild(question, question.id + "-bugs", "div");
            questionBugs.classList.add(this.name + "-menu-group");
            v = addChild(questionBugs, questionBugs.id + "-heading", "div");
            v.classList.add(this.name + "-menu-break");
            v.innerHTML = "Bug Reporting";
            v = addChild(questionBugs, questionBugs.id + "-text", "div");
            v.innerHTML = 'If you find a bug please email <div style="display:inline;user-select:text;">tf.tetresse@gmail.com</div> with the subject line:<br>tetresse bug found';
            // future plans TODO
            var questionFuture = addChild(question, question.id + "-future", "div");
            questionFuture.classList.add(this.name + "-menu-group");
            v = addChild(questionFuture, questionFuture.id + "-heading", "div");
            v.classList.add(this.name + "-menu-break");
            v.innerHTML = "Future Plans";
            v = addChild(questionFuture, questionFuture.id + "-text", "div");
            v.innerHTML = 'I am currently developing a new multiplayer tetris game which will be announced on the harddrop discord winter or spring 2019. Eventually I am planning on porting this tool over to that site and will make tetresse.harddrop.com forward to the new site.<br>Any ideas / insights / comments are welcome. Just shoot an email to<br><div style="display:inline;user-select:text;">tf.tetresse@gmail.com</div><br><br>Updated Aug. 29, 2018<div style="display:inline-block;float:right;text-align:right;">-tf2</div>';
        }

        // options bar
        if (this.settings.optionsBarVisible) {
            var v;
            var gameID = this.element.id;
            var options = addChild(this.element, gameID + "-options", "div");
            options.classList.add(this.name + "-options");
            v = addChild(options, options.id + "-question", "div");
            v.classList.add(this.name + "-question", this.name + "-ar", this.name + "-option");
            v.onclick = function(e) {
                games[Game.getGameNumber(e.target.id)].showMenu("question");
            };
            v = addChild(options, options.id + "-refresh", "div");
            v.classList.add(this.name + "-refresh", this.name + "-ar", this.name + "-option");
            v.onclick = function(e) {
                games[Game.getGameNumber(e.target.id)].resetGame();
            };
            v = addChild(options, options.id + "-settings", "div");
            v.classList.add(this.name + "-setting", this.name + "-ar", this.name + "-option");
            v.onclick = function(e) {
                games[Game.getGameNumber(e.target.id)].showMenu("settings");
            };
            v = addChild(options, options.id + "-save", "div");
            v.classList.add(this.name + "-save", this.name + "-ar", this.name + "-option");
            v.classList.add(this.name + "-disabled");
            // TODO
            v.onclick = function(e) {

            };
            v = addChild(options, options.id + "-load", "div");
            v.classList.add(this.name + "-load", this.name + "-ar", this.name + "-option");
            v.classList.add(this.name + "-disabled");
            v.onclick = function(e) {
                // TODO
            };
            v = addChild(options, options.id + "-stats", "div");
            v.classList.add(this.name + "-stats", this.name + "-ar", this.name + "-option");
            v.onclick = function(e) {
                games[Game.getGameNumber(e.target.id)].showMenu("stats");
            };
        }

        // set listener for file upload
        for (var i = 0; i < this.settings.loadFile.length; i++) {
            this.settings.loadFile[i].onclick = function(e) {
                this.value = null;
            }; // it works so shhh
            this.settings.loadFile[i].onchange = function(e) {
                var v = e.target.id.replace("game-", "").charAt(0);
                // TODO change select element and add buttons (to pause / play / reload)?
                loadFile(this, games[parseInt(v)], true);
            }
        }

        this.record = {
            moves: [],
            nextPieces: [],
        };

        // initialization game settings
        // TODO change to initialization class to be able to reset board without reloading page
        if (this.settings.playable)
            this.initialize();
    }

    recordAddMove(m) {
        if (!this.settings.playable)
            return;
        this.record.moves.push(m);
        this.stats.executeStatsListeners("addRecord");
    }
        
    recordSetNextPieces(arr) {
        this.record.nextPieces = [];
        for (var i = 0; i < arr.length; i++)
            this.record.nextPieces.push(arr[i].piece);
    }

    showMenu(menuString) {
        this.boardCover.blur();
        this.settings.playable = false;
        var gameID = this.element.id;
        var menu = document.getElementById(gameID + "-menu");
        var title = document.getElementById(gameID + "-menu-title-text");
        
        this.menu.stats.hide();
        for (var i = 1; i < menu.children.length; i++) {
            menu.children[i].style.display = "none";
        }
        if (menuString == null) {
            menu.style.display = "none";
            title.innerHTML = "";
            this.settings.playable = true;
            return;
        }

        menu.style.display = "block";
        if (menuString == "settings") {
            title.innerHTML = "Settings";
            document.getElementById(gameID + "-menu-settings").style.display = "block";
        } else if (menuString == "stats") {
            var v, g;
            title.innerHTML = "Stats";
            this.menu.stats.display();

            var settingsEle = document.getElementById(gameID + "-menu-stats");
            settingsEle.style.display = "block";
        } else if (menuString == "question") {
            title.innerHTML = "Help";
            document.getElementById(gameID + "-menu-question").style.display = "block";
        } else {
            this.showMenu(null);
        }
    }

    /**
     * getGameNumber: parses the div ID and returns the game number (in format "game-112-menu-item" returns 112)
     */
    static getGameNumber(divID) {
        divID = divID.substring(divID.indexOf("-") + 1);
        return divID.substring(0, divID.indexOf("-"));
    }

    initialize() {
        this.bag = [];
        this.gameOver = false;
        this.piece = null;
        this.heldPiece = null;
        this.gravTimer = null;
        this.swapped = false;
        this.gravNum = 0;
        this.pieceMoveTimeout = {"right": null, "left": null};
        
        this.boolKeys = {right:{down: false}, left: {down: false}, sd: {down: false}};
        this.nextPieces = [];
        this.heldLocations = {"i":[[37.5,0], [37.5, 25], [37.5, 50], [37.5, 75]], "j":[[25,12.5],[50,12.5],[50,37.5],[50,62.5]], "l":[[25,62.5],[50,12.5],[50,37.5],[50,62.5]], "o":[[25,25],[25,50],[50,25],[50,50]], "s":[[25,37.5],[25,62.5],[50,12.5],[50,37.5]], "t":[[25,37.5],[50,12.5],[50,37.5],[50,62.5]], "z":[[25,12.5],[25,37.5],[50,37.5],[50,62.5]]};

        this.listeners = [];
        var setListeners = function() {
            var b = null;
            for (var i = 0; i < games.length; i++)
                if (this.parentNode.parentNode === games[i].element) {
                    b = games[i];
                    break;
                }
            
            if (b.gameOver)
                return;
            if (!b.settings.playable) {
                b.boardCover.style.background = "rgba(255,255,255,0.5)";
                return;
            } else {
                b.boardCover.style.background = "none";
            }
            b.paused = false;

            b.stats.executeStatsListeners("resume");
            if (b.gravTimer != null)
                b.gravTimer.resume();
            b.playPiece();

            var keypress = function (e) {
                e = e || window.event;

                var b = null;
                for (var i = 0; i < games.length; i++)
                    if (this.parentNode.parentNode === games[i].element) {
                        b = games[i];
                    }

                // TODO this shouldn't need to be here (when gameover)
                if (b.gameOver)
                    return;

                if (b.settings.keyCodes[e.keyCode] == "right") {
                    if (b.boolKeys.right.down)
                        return;
                    b.piece.addKeyPressed("right");
                    b.boolKeys.right.down = true;
                    b.boolKeys.left.down = false;
                    var m = function() {
                        if (b.boolKeys.left.down) {
                            b.boolKeys.right.down = false;
                            return;
                        }
                        if (b.piece.canMove(1))
                            b.addMove(function() {b.piece.move(1)});
                    };
                    m();
                    if (b.pieceMoveTimeout["right"] != null)
                        clearTimeout(b.pieceMoveTimeout["right"]);
                    b.pieceMoveTimeout["right"] = setTimeout(Game.repeatKeys, b.settings.das, m, b.boolKeys.right, b.settings.arr);
                } else if (b.settings.keyCodes[e.keyCode] == "left") {
                    if (b.boolKeys.left.down)
                        return;
                    b.piece.addKeyPressed("left");
                    b.boolKeys.left.down = true;
                    b.boolKeys.right.down = false;
                    var m = function() {
                        if (b.boolKeys.right.down) {
                            b.boolKeys.left.down = false;
                            return;
                        }
                        if (b.piece.canMove(-1))
                            b.addMove(function() {b.piece.move(-1)});
                    };
                    m();
                    if (b.pieceMoveTimeout["left"] != null)
                        clearTimeout(b.pieceMoveTimeout["left"]);
                    b.pieceMoveTimeout["left"] = setTimeout(Game.repeatKeys, b.settings.das, m, b.boolKeys.left, b.settings.arr);
                } else if (b.settings.keyCodes[e.keyCode] == "cw") {
                    b.piece.addKeyPressed("cw");
                    b.addMove(function() {b.piece.rotate(1)});
                } else if (b.settings.keyCodes[e.keyCode] == "ccw") {
                    b.piece.addKeyPressed("ccw");
                    b.addMove(function() {b.piece.rotate(-1)});
                } else if (b.settings.keyCodes[e.keyCode] == "180") {
                    b.piece.addKeyPressed("180");
                    b.addMove(function() {b.piece.rotate(1);b.piece.rotate(1)});
                } else if (b.settings.keyCodes[e.keyCode] == "hd") {
                    b.piece.addKeyPressed("hd");
                    while(b.piece.canDrop()) {
                        b.piece.drop();
                    };
                    b.piece.addMove(6);
                    b.piece.drop();
                } else if (b.settings.keyCodes[e.keyCode] == "sd") {
                    if (b.boolKeys.sd.down)
                        return;
                    b.piece.addKeyPressed("sd");
                    b.boolKeys.sd.down = true;
                    var m = function() {
                        if (!b.piece.canDrop())
                            return;
                        b.piece.addMove(5);
                        b.piece.drop();
                        b.resetGravityTimer();
                    };
                    Game.repeatKeys(m, b.boolKeys.sd, b.settings.softDropSpeed);
                } else if (b.settings.keyCodes[e.keyCode] == "hold") {
                    if (b.swapped)
                        return;
                    b.piece.addKeyPressed("hold");
                    if (b.heldPiece == null)
                        b.heldPiece = b.nextPieces.splice(0,1)[0];
                    b.updateQueue();
                    var temp = b.heldPiece;
                    b.piece.hold();
                    b.heldPiece = b.piece;
                    b.piece = temp;
                    b.playPiece();
                    b.piece.addMove(0);
                    b.updateHeld();
                    b.swapped = true;
                }
            };

            var keyrelease = function(e) {
                e = e || window.event;
                if (b.settings.keyCodes[e.keyCode] == "right") {
                    b.boolKeys.right.down = false;
                    clearTimeout(b.pieceMoveTimeout["right"]);
                } else if (b.settings.keyCodes[e.keyCode] == "left") {
                    b.boolKeys.left.down = false;
                    clearTimeout(b.pieceMoveTimeout["left"]);
                } else if (b.settings.keyCodes[e.keyCode] == "sd") {
                    b.boolKeys.sd.down = false;
                }
            };

            b.listeners.push(keyrelease);
            b.listeners.push(keypress);
            addEvent(this, "keyup", keyrelease);
            addEvent(this, "keydown", keypress);
        };
        var unsetListeners = function() {
            var b = null;
            for (var i = 0; i < games.length; i++)
                if (this.parentNode.parentNode === games[i].element) {
                    b = games[i];
                    break;
                }
            if (!b.paused)
                b.stats.executeStatsListeners("pause");
            b.boardCover.style.background = "rgba(255,255,255,0.5)";
            b.paused = true;
            if (b.gravTimer != null) {
                b.gravTimer.pause();
            }
            while(b.listeners.length != 0) {
                this.removeEventListener("keydown", b.listeners.splice(0,1)[0]);
            }
        };
        addEvent(this.boardCover, "focus", setListeners);
        addEvent(this.boardCover, "blur", unsetListeners);
    }

    playRecord() {
        var startTime = this.record.moves[0].time;
        log("[playRecord] Started");
        Game.playingRecord(this, startTime, 0);
    }

    static playingRecord(board, startTime, move) {
        if (board == null)
            error("board can't be null");

        var v = board.record.moves[move].action;
        // right: 1, left: 2, cw: 3, ccw: 4, spawn: 0, sd: 5, hd: 6, hold: 7, reset: 8
        if (v == 0) {
            board.piece = new Piece(board.record.moves[move].piece, board);
            board.piece.display();
        } else if (v == 1) {
            board.piece.move(1);
        } else if (v == 2) {
            board.piece.move(-1);
        } else if (v == 3) {
            board.piece.rotate(1);
        } else if (v == 4) {
            board.piece.rotate(-1);
        } else if (v == 5) {
            board.piece.drop();
        } else if (v == 6) {
            while(board.piece.canDrop())
                board.piece.drop();
            board.piece.drop();
        } else if (v == 7) {
            board.piece.hold();
            if (board.heldPiece == null)
                board.heldPiece = null;
            var temp = board.piece;
            board.piece = board.heldPiece;
            board.heldPiece = temp;
        }
        move++;
        if (move >= board.record.moves.length) {
            log("[playRecord] Finished playing");
            return;
        }
        var pauseTime = board.record.moves[move].time - startTime;
        startTime = board.record.moves[move].time;
        board.playRecording = setTimeout(Game.playingRecord, pauseTime, board, startTime, move);
    }

    pauseRecord() {
        clearTimeout(this.playRecording);
        // TODO
    }

    playPiece() {
        if (this.paused || this.gameOver)
            return;
        if (this.piece == null) {
            this.updateQueue();
            this.stats.executeStatsListeners("startGame");
        }

        // if the game can't load in a piece, it's game over
        for (var i = 3; i < 7; i++)
            if (this.board.tiles[20][i].p != "")
                this.gameOver = true;

        if (!this.gameOver && (this.piece == null || this.piece.isDropped)) {
            // every new piece's turn starts here
            this.stats.executeStatsListeners("pieceSpawn");
            this.piece = this.nextPieces.splice(0, 1)[0];

            this.piece.addMove(0);
            this.updateQueue();
        }
        
        if (!this.gameOver) {
            this.piece.display();
            this.gravTimer = new GravityTimer(this);
            this.movesMade = 0;
        } else {
            // location.reload();
            // TODO: Game Over
            // this.stats.executeStatsListeners("endGame");
            console.log("resetting game");
            // while(this.listeners.length != 0) {
            //     document.removeEventListener("keydown", this.listeners.splice(0,1)[0]);
            // }
            
            this.gameOver = false;
            this.resetGame();
            this.playPiece();
            // this.gameOver = true;
        }
        // set key events
    }

    /**
     * resetGame: resets the board but keeps stats and bag
     */
    resetGame() {
        for (var r = 0; r < 40; r++) {
            for (var c = 0; c < 10; c++) {
                this.board.tiles[r][c].p = "";
                // TODO add rows above option in settings
                // html
                if (r > 19) {
                    this.board.tiles[r][c].element.className = "";
                }
            }
        }
        
        this.bag = [];
        this.piece = null;
        this.heldPiece = null;
        this.updateHeld();
        this.swapped = false;
        this.resetGravityTimer();
        this.bag = [];
        this.nextPieces = [];
        this.updateNextPieces();
        this.stats.reset();
    }

    /**
     * getIdealFinesse
     *   returns array ideal finesse instructions (may be multiple ways with different order / whatever)
     * piece - the letter of the piece
     * loc - the column of the piece (can be negative)
     * rot - the rotation of the piece (0 through 3)
     * spin - boolean of whether this piece spun
     */
    getIdealFinesse(piece, loc, rot, spin) {
        if (piece == "i") {
            if (rot == 1) {
                loc += + 2;
            } else if (rot == 3) {
                loc += + 1;
                rot = 1;
            } else if (rot == 2) {
                rot = 0;
            }
        }
        if (piece == "o") {
            rot = 0;
        }
        if ("sz".indexOf(piece) != -1) {
            if (rot == 2)
                rot = 0;
            if (rot == 0) {
                piece = "j";
            } else {
                piece = "s";
                if (rot == 1)
                    loc += 1
                rot = 0;
            }
        }
        if ("jlt".indexOf(piece) != -1) {
            piece = "j";
            if (rot == 1)
                loc += 1;
        }

        if ("ijlostz".indexOf(piece) == -1) {
            error("Invalid piece: " + piece);
        }

        var guide = {
            i: [
                [
                    ["das left"],
                    ["das left", "right"],
                    ["left"],
                    [],
                    ["right"],
                    ["das right", "left"],
                    ["das right"]
                ], // 0 rotation
                [
                    ["ccw", "das left"],
                    ["das left", "ccw"],
                    ["das left", "cw"],
                    ["left", "ccw"],
                    ["ccw"],
                    ["cw"],
                    ["right", "cw"],
                    ["das right", "ccw"],
                    ["das right", "cw"],
                    ["ccw", "das right"],
                ], // 1 rotation
            ],
            j: [
                [
                    ["das left"],
                    ["left", "left"],
                    ["left"],
                    [],
                    ["right"],
                    ["right", "right"],
                    ["das right", "left"],
                    ["das right"]
                ], // 0
                [
                    ["cw", "das left"],
                    ["das left", "cw"],
                    ["left", "left", "cw"],
                    ["left", "cw"],
                    ["cw"],
                    ["right", "cw"],
                    ["right", "right", "cw"],
                    ["das right", "left", "cw"],
                    ["das right", "cw"]
                ], // 1
                [
                    ["das left", "cw", "cw"],
                    ["left", "left", "cw", "cw"],
                    ["left", "cw", "cw"],
                    ["cw", "cw"],
                    ["right", "cw", "cw"],
                    ["right", "right", "cw", "cw"],
                    ["das right", "left", "cw", "cw"],
                    ["das right", "cw", "cw"]
                ], // 2
                [
                    ["das left", "ccw"],
                    ["left", "left", "ccw"],
                    ["left", "ccw"],
                    ["ccw"],
                    ["right", "ccw"],
                    ["right", "right", "ccw"],
                    ["das right", "left", "ccw"],
                    ["das right", "ccw"],
                    ["ccw", "das right"]
                ] // 3
            ],
            o: [
                [
                    ["das left"],
                    ["das left", "right"],
                    ["left", "left"],
                    ["left"],
                    [],
                    ["right"],
                    ["right", "right"],
                    ["das right", "left"],
                    ["das right"]
                ]
            ],
            s: [
                [
                    ["cw", "das left"],
                    ["das left", "cw"],
                    ["left", "ccw"],
                    ["ccw"],
                    ["cw"],
                    ["right", "cw"],
                    ["right", "right", "cw"],
                    ["das right", "ccw"],
                    ["cw", "das right"]
                ],
            ],
        }

        var v = guide[piece][rot][loc]
        if (spin)
            v.push("spins");

        return v;
    }

    updateQueue() {
        while(this.nextPieces.length < this.settings.nextPiecesNum) {
            this.nextPieces.push(this.nextPiece());
        }
        this.recordSetNextPieces(this.nextPieces);
        this.updateNextPieces();
    }

    updateNextPieces() {
        for (var j = 0; j < this.settings.nextPiecesNum; j++) {
            for (var i = 0; i < 4; i++) {
                var p = this.realNextPiecesLocations[j][i];
                var u = this.nextPieces[j] == null ? "" : this.nextPieces[j].piece;
                if (p.classList.length == 0)
                    p.classList.add(u);
                else
                    p.classList.value = u;
                if (u == "")
                    continue;
                p.style.top = (this.heldLocations[this.nextPieces[j].piece][i][0]) + "%";
                p.style.left = (this.heldLocations[this.nextPieces[j].piece][i][1]) + "%";
            }
        }
    }

    updateHeld() {
        if (this.heldPiece == null) {
            for (var i = 0; i < this.realHeldPieces.length; i++) {
                var p = this.realHeldPieces[i];
                if (p.classList.length != 0)
                    p.classList.value = "";
            }
            return;
        }
            
        for (var i = 0; i < this.realHeldPieces.length; i++) {
            var p = this.realHeldPieces[i];
            if (p.classList.length == 0)
                p.classList.add(this.heldPiece.piece);
            else
                p.classList.value = this.heldPiece.piece;
            p.style.top = (this.heldLocations[this.heldPiece.piece][i][0]) + "%";
            p.style.left = (this.heldLocations[this.heldPiece.piece][i][1]) + "%";
        }
        
    }

    static repeatKeys(action, bool, speed) {
        if (!bool.down)
            return;
        action();
        window.setTimeout(Game.repeatKeys, speed, action, bool, speed);
    }

    addMove(func) {
        var loc = this.piece.getLocation();
        var rotation = this.piece.getRotation();
        if (this.piece.canDrop()) {
            func();
            if (!this.piece.canDrop() && (loc[0] != this.piece.getLocation()[0] || loc[1] != this.piece.getLocation()[1] || rotation != this.piece.getRotation())) {
                this.movesMade++;
                if (this.movesMade <= this.maxMoves)
                this.resetGravityTimer();
            }
        } else {
            func();
            if (loc[0] != this.piece.getLocation()[0] || loc[1] != this.piece.getLocation()[1] || rotation != this.piece.getRotation()) {
                this.movesMade++;
                if (this.movesMade <= this.maxMoves)
                    this.resetGravityTimer();
            }
        }
    }

    updateKeyCodes() {
        // TODO add event listener function thingy
        // var ids = ["keybinds-right", "keybinds-left", "keybinds-cw", "keybinds-ccw", "keybinds-hd", "keybinds-sd", "keybinds-hold"];
        // var numbers = [];
        // var ele = document.getElementById("keybinds");
        // for (var i = 1; i < ele.children.length; i += 2) {
        //     numbers.push(parseInt(ele.children[i].innerHTML));
        // }
        // keyCodes = {right: numbers[0], left: numbers[1], cw: numbers[2], ccw: numbers[3], hd: numbers[4], sd: numbers[5], hold: numbers[6]};
    }

    resetGravityTimer() {
        this.gravTimer = new GravityTimer(this);
    }

    nextPiece() {
        if (this.bag.length == 0) {
            this.bag = Game.shuffle(["i", "j", "l", "o", "s", "t", "z"]);
        }
        return new Piece(this.bag.pop(), this);
    }

    // sets the displayed screen to match the virtual board
    updateScreen() {
        var start = this.board.tiles.length - this.settings.displayedBoardHeight;
        
        var tempBoard = [];
        for (var r = 0; r < 40; r++) {
            tempBoard.push([]);
            for (var c = 0; c < 10; c++) {
                tempBoard[r].push(this.board.tiles[r][c].p);
            }
        }

        // remove filled rows
        var removedRows = [];
        for (var row = start; row < tempBoard.length; row++) {
            var filledUp = true;
            for (var col = 0; col < tempBoard[0].length; col++) {
                if (tempBoard[row][col] == "") {
                    filledUp = false;
                    break;
                }
            }
            if (filledUp) {
                for (var col = 0; col < tempBoard[0].length; col++) {
                    tempBoard[row][col] = "";
                }
                removedRows.push(row);
            }
        }
            
        this.piece.linesCleared = removedRows.length;
        // TODO add this to constructor of piece object
        if (removedRows.length != 0)
            this.stats.executeStatsListeners("linesCleared");
        if (this.piece.spin)
            this.stats.executeStatsListeners("spin");

        // compress
        var swap = function(board, row1, row2) {
            var arr1 = board[row1];
            board[row1] = board[row2];
            board[row2] = arr1;
        };
        // bubble sort lol
        var offset = 0;
        for (var i = removedRows.length - 1; i >= 0; i--) {
            var tempArr = []
            for (var row = removedRows[i] + offset; row >= removedRows.length - i; row--) {
                swap(tempBoard, row, row - 1);
                tempArr.push(row, row - 1);
            }
            offset++;
        }

        // copy board to screen
        for (var row = 20; row < 40; row++) {
            for (var col = 0; col < 10; col++) {
                var ele = this.board.tiles[row][col].element;
                var value = tempBoard[row][col];
                this.board.tiles[row][col].p = value;
                if (ele.classList.length != 0)
                    ele.classList.value = value;
                else if (value != "")
                    ele.classList.add(value);
            }
        }
    }

    download() {
        var v = this.record;
        delete v.board;
        var text = JSON.stringify(v);
        var name = "game-0";
        var type = "text/plain";
        var a = document.createElement("a");
        var file = new Blob([text], {type: type});
        a.href = URL.createObjectURL(file);
        a.download = name;
        a.click();
    }

    loadFile(input, play) {
        // TODO implement drag and drop files and test this
        var fr;
        var board = this;

        if (typeof window.FileReader !== 'function') {
            error("The file API isn't supported on this browser yet.");
            return;
        }

        if (!input.files) {
            error("This browser doesn't seem to support the `files` property of file inputs.");
        }
        else if (!input.files[0]) {
            error("Please select a file before clicking 'Load'");
        }
        else {
            fr = new FileReader();
            fr.board = board;
            fr.onload = function(e) {
                var lines = e.target.result;
                if (e.target.board != null) {
                    e.target.board.record = JSON.parse(lines);
                } else {
                    error("Could not link board with file loaded");
                }
                if (play)
                    board.playRecord();
            };
            fr.readAsText(input.files[0]);
        }
    }

    static addKeybind(e) {
        e.target.style.background = "#cd7f7f";
        e.target.addEventListener("keydown", function(e) {
            e = e || window.event;
            var keyCode = e.keyCode;
            
            var board = games[Game.getGameNumber(e.target.id)];
            board.settings.addKeyCode(e.target.parentNode.children[1].innerHTML.toLowerCase(), keyCode);
            
            e.target.style.background = "none";
            var ele = e.target.cloneNode(true);
            e.target.parentNode.replaceChild(ele, e.target);
            addEvent(ele, "click", Game.addKeybind);

        });
    }

    // Fisher-Yates shuffle
    static shuffle(array) {
        var m = array.length, t, i;
        while (m) {
            i = Math.floor(Math.random() * m--);
            t = array[m];
            array[m] = array[i];
            array[i] = t;
        }
        return array;
    }

    // returns object with all settings: use .label to get a list of labels of the settings
    static getDefaultSettings() {
        var settings = {
            das: 125, //
            arr: Math.floor(1000/60),
            gravityDelay: 1000,
            maxMoves: 20,
            softDropSpeed: 25,
            displayedBoardHeight: 20,
            displayedBoardWidth: 10,
            nextPiecesNum: 5,
            boolShadowPiece: true,
            numNextPieces: 5,
            keyCodes: {
                39: "right",
                37: "left",
                38: "cw",
                90: "ccw",
                40: "sd",
                32: "hd",
                67: "hold",
                16: "hold",
                87: "hold",
                69: "ccw",
                82: "cw",
                74: "left",
                75: "sd",
                76: "right",
            },
            loadFile: [],
            optionsBarVisible: true,
            playable: true,
            showFinesseErrors: false,
            redoFinesseErrors: true,
            addKeyCode: function(key, number) {
                this.keyCodes[number] = key;
                setCookie("settings", JSON.stringify(this), 1000);
            },

            labels: [
                "das",
                "arr",
                "gravityDelay",
                "maxMoves",
                "softDropSpeed",
                "displayedBoardHeight",
                "displayedBoardWidth",
                "nextPiecesNum",
                "boolShadowPiece",
                "numNextPieces",
                "keyCodes",
                "loadFile",
                "optionsBarVisible",
                "playable",
                "showFinesseErrors",
                "redoFinesseErrors"
            ]
        };
        return settings;
    }
}

/**
 * class Stats:
 * Possible listeners:
 *   pause -
 *   resume
 *   startGame
 *   endGame
 *   linesCleared
 *   spin
 *   tspin
 *   piecePlaced - every time a piece is placed
 *   addRecord - everytime a new record is added
 *   tick - every 100ms (.1s)
 *   pieceSpawn
 * HTML Element classes: (adding -pp or -ps changes it to per second or per piece)
 *   time
 *   time-paused
 *   start-time
 *   end-time
 *   pieces-placed
 *   finesse-errors (-[ps, pp])
 *   lines-cleared (-[singles, doubles, triples, tetrisses]) (-[ps, pp])
 *   spins (-[ps, pp])
 *     [i, j, l, s, t, z]-spins (-[ps, pp])
 *     [i, j, l, s, t, z]-spin-[singles, doubles, triples[, tetrisses]] (-[ps, pp]) eg: i-spin-tetrisses, t-spin-triples-ps
 */
class Stats {
    constructor(board) {
        this.psArr = [];

        this.board = board;
        // TODO add clock interval to game settings
        this.clock = new Clock(this.board, 100, function(b) {
            b.stats.executeStatsListeners("tick");
        });

        
        // object that stores listeners. labels array stores names of all function arrays (every "element" in statsListeners is an array of functions)
        this.statsListeners = {
            labels: []
        };
        this.reset();
    }

    // Check if statListener contains function with specified event.
    // If it does, return array of listeners
    executeStatsListeners(event) {
        var funcs = this.statsListeners[event];
        if (funcs == null) {
            // log("[executeStatsListeners] could not execute event (index was null): " + event + "\n statsListener was:\n" + this.statsListeners);
            return;
        }
        for (var i = 0; i < funcs.length; i++)
            funcs[i](this);
    }

    /**
     * update page: element's innerHTML with value
     * value - string to put into elements
     * elements - array of html elements
     */
    updatePage(value, elements) {
        for (var i = 0; i < elements.length; i++)
            elements[i].innerHTML = value;
    }

    /**
     * addStatsListener: adds a stats listener
     * event - is a string
     * func - is a function
     */
    addStatsListener(event, func) {
        if (this.statsListeners[event] == null)
            this.statsListeners[event] = [];
        this.statsListeners[event].push(func);
        this.statsListeners.labels.push(event);
    }

    // TODO test this
    removeStatsListener(event, func) {
        log("[removeStatsListener] this has not been tested");
        if (this.statsListener[event] == null)
            return null;
        var list = this.statsListener[event];
        for (var i = 0; i < list.length; i++)
            if (list[i] == func)
                return list.splice(i, 1);
    }

    reset() {
        // TODO convert name to a setting in stats
        // value stored in time is in milliseconds
        this.totalTime = new PageStat(["time", this, 0, "t"]);
        this.totalPauseTime = new PageStat(["time-paused", this, 0, "t"]);
        var tempDate = new Date();
        this.startTime = new PageStat(["start-time", this, "" + tempDate.getHours() + ":" + tempDate.getMinutes() + ":" + tempDate.getSeconds()]);
        // TODO set end time when game finishes
        this.endTime = new PageStat(["end-time", this]);

        this.piecesPlaced = "pieces-placed";//new PageStat(["pieces-placed", this, 0]);
        this.finesse = "finesse-errors"; // TODO implements finesse
        this.finessePrintout = new PageStat(["finesse-errors-p", this, "-"]);
        this.linesCleared = {
            total: "lines-cleared",
            count: ["singles","doubles","triples","tetrisses"]
        };
        // total spins is the number of pieces spun not lines cleared
        // count is the number of singles / doubles / triples
        this.spins = {
            total: "spins",
            i: {
                total: "i-spins",
                count: ["i-spin-singles","i-spin-doubles","i-spin-triples","i-spin-tetrisses"]
            },
            j: {
                total: "j-spins",
                count: ["j-spin-singles","j-spin-doubles","j-spin-triples"]
            },
            l: {
                total: "l-spins",
                count: ["l-spin-singles","l-spin-doubles","l-spin-triples"]
            },
            s: {
                total: "s-spins",
                count: ["s-spin-singles","s-spin-doubles","s-spin-triples"]
            },
            t: {
                total: "t-spins",
                count: ["t-spin-singles","t-spin-doubles","t-spin-triples"]
            },
            z: {
                total: "z-spins",
                count: ["z-spin-singles","z-spin-doubles","z-spin-triples"]
            }
        };

        var toLoad = ["piecesPlaced"];
        for (var i = 0; i < toLoad.length; i++) {
            var ps = new PageStat([this[toLoad[i]], this, 0, "ps"]);
            this[toLoad[i]] = new PageStat([this[toLoad[i]], this, 0, null, null, [ps]]);
        }

        toLoad = ["finesse"];
        for (var i = 0; i < toLoad.length; i++) {
            var ps = new PageStat([this[toLoad[i]], this, 0, "ps"]);
            var pp = new PageStat([this[toLoad[i]], this, 0, "pp"]);
            this[toLoad[i]] = new PageStat([this[toLoad[i]], this, 0, null, null, [ps, pp]]);
        }

        // TODO clean this up
        toLoad = ["linesCleared", "spins"];
        for (var i = 0; i < toLoad.length; i++) {
            if (toLoad[i] == "spins") {
                var toLoadLetters = "ijlstz";
                for (var j = 0; j < toLoadLetters.length; j++) {
                    var ps = new PageStat([this.spins[toLoadLetters.charAt(j)].total, this, 0, "ps"]);
                    var pp = new PageStat([this.spins[toLoadLetters.charAt(j)].total, this, 0, "pp"]);
                    this.spins[toLoadLetters.charAt(j)].total = new PageStat([this.spins[toLoadLetters.charAt(j)].total, this, 0, null, null, [ps, pp]]);
                    for (var k = 0; k < (("i").indexOf(toLoadLetters.charAt(j)) != -1 ? 4 : 3); k++) {
                        var ps = new PageStat([this.spins[toLoadLetters.charAt(j)].count[k], this, 0, "ps"]);
                        var pp = new PageStat([this.spins[toLoadLetters.charAt(j)].count[k], this, 0, "pp"]);
                        this.spins[toLoadLetters.charAt(j)].count[k] = new PageStat([this.spins[toLoadLetters.charAt(j)].count[k], this, 0, null, null, [ps, pp]]);
                    }
                }
            } else if (toLoad[i] == "linesCleared") {
                for (var k = 0; k < 4; k++) {
                    var ps = new PageStat([this.linesCleared.count[k], this, 0, "ps"]);
                    var pp = new PageStat([this.linesCleared.count[k], this, 0, "pp"]);
                    this.linesCleared.count[k] = new PageStat([this.linesCleared.count[k], this, 0, null, null, [ps, pp]]);
                }
            }
            var ps = new PageStat([this[toLoad[i]].total, this, 0, "ps"]);
            var pp = new PageStat([this[toLoad[i]].total, this, 0, "pp"]);
            this[toLoad[i]].total = new PageStat([this[toLoad[i]].total, this, 0, null, null, [ps, pp]]);
        }
    }

    /**
     * reload: researches page for divs to update
     */
    reload() {
        for (var i = 0; i < this.psArr.length; i++) {
            this.psArr[i].updateElements();
        }
    }
}

class PageStat {
    /**
     * args - array of specifications
     *     [0] - name of elements to search for
     *     [1] - stats object
     *     [2] - starting value
     *     [3] - type (null: default, "ps": per second, "pp": per piece, "t": time)
     *     [4] - string to append to end of innerHTML
     *     [5] - array of linked stats (share the same value)
     */
    constructor(args) {
        var name = null, stats = null, startValue = 0, type = null, append = null, linked = null;
        if (args != null) {
            if (args.length > 0) name = args[0];
            if (args.length > 1) stats = args[1];
            if (args.length > 2) startValue = args[2];
            if (args.length > 3) type = args[3];
            if (args.length > 4) append = args[4];
            if (args.length > 5) linked = args[5];
        }

        this.setup(name, stats, startValue, type, append, linked);
    }

    setup(name, stats, startValue, type, append, linked) {
        this.name = name;
        this.stats = stats;
        this.value = (startValue == null ? 0 : startValue);
        this.type = type;
        this.append = (append == null ? "" : append);
        this.linked = linked;
        this.updateElements();
        stats.psArr.push(this);
    }

    addElements(arr) {
        for (var i = 0; i < arr.length; i++) {
            if (this.elements.indexOf(arr[i]) == -1)
                this.elements.push(arr[i]); // why won't concat work?!?!?
        }
        this.updateValue(this.value);
    }

    removeElement(ele) {
        for (var i = 0; i < this.elements.length; i++)
            if (this.elements[i] === ele) {
                this.elements.splice(i, 1);
                return true;
            }
    }

    /**
     * updateElements: resets the list of elements this PageStat will update
     */
    updateElements() {
        this.elements = [];
        if (this.name == null || this.stats == null)
            this.addElements([]);

        var toSearch = this.stats.board.element.id + "-" + this.name;
        toSearch += (this.type == null || this.type == "t"? "" : "-" + this.type);
        var eles = document.getElementsByClassName(toSearch);
        this.addElements(eles);
    }

    updateValue(value) {
        this.value = value
        
        if (this.linked != null)
            for (var i = 0; i < this.linked.length; i++)
                this.linked[i].updateValue(value);

        var v = this.value;
        if (this.type != null) {
            if (this.type == "ps") {
                v = (1.0 * this.value / (this.stats.totalTime.value / 1000)).toFixed(3);
            } else if (this.type == "pp") {
                var p = this.stats.piecesPlaced.value;
                if (p == 0)
                    v = (0).toFixed(3);
                else
                    v = (1.0 * this.value / p).toFixed(3);
            } else if (this.type == "t") {
                var s = ((this.value % 60000) / 1000).toFixed(1);
                var m = Math.floor((this.value / 60000) % 60);
                var h = Math.floor((this.value / 3600000));
                v = (h == 0 ? "" : h + ":") + (m == 0 ? "" : m + ":") + s;
            } else {
                error("Type not recognized: " + this.type);
            }
        }
        if (this.elements != null) {
            for (var i = 0; i < this.elements.length; i++) {
                if (this.elements[i].matches("div")) { // TODO redesign
                    this.elements[i].innerHTML = "" + v + (this.append == null ? "" : this.append);
                } else {
                    console.log(this.name);
                    this.elements.splice(i, 1);
                    i--;
                }
            }
        }
    }

    update(type) {
        if (this.type == type) // TODO bug: if this is "ps" it will go through linked
            this.add(0); // haha saving space
        else if (this.linked != null)
            for (var i = 0; i < this.linked.length; i++)
                if (this.linked[i].type == type)
                    this.linked[i].add(0);
    }

    add(value) {
        if (value == 0)
            this.updateValue(this.value); // prevent problems if value is a string
        else
            this.updateValue(this.value + value);
    }

    clone() { // TODO test
        return new PageStat([this.name, this.stats, this.value, this.type, this.append]);
    }
}

// TODO incorperated into gravity timer?
class Clock {
    constructor(board, interval, func) {
        this.board = board;
        this.interval = interval;
        this.func = func;

        this.completed = false;
        this.creationTime = new Date().getTime();

        this.storedTime = -1;
        this.pausedTime = -1;
        
        if (!this.board.paused)
            this.resume();
    }

    pause() {
        if (this.completed)
            error("Can not use (pause) a completed clock!");
        this.paused = true;
        this.storedTime += new Date().getTime() - this.startTime;
        this.startTime = new Date().getTime();
    }

    resume() {
        this.paused = false;
        if (this.startTime != null)
            this.pausedTime += new Date().getTime() - this.startTime;
        this.startTime = new Date().getTime();
        this.timer = setTimeout(this.loop, this.interval, this.board, this);
    }

    loop(b, c) {
        c.func(b);
        c.timer = setTimeout(c.loop, c.interval, b, c);
    }

    complete() {
        if (this.completed)
            error("Can not use a completed clock");
        this.completed = true;
        if (this.paused)
            this.resume();
        else
            this.pause();
        clearTimeout(this.timer);
    }

    getStartTime() {
        return this.creationTime;
    }

    // return number of intervals that have passed
    getStoredTime() {
        if (this.paused)
            return this.storedTime;
        else
            return this.storedTime + new Date().getTime() - this.startTime;
    }

    getPausedTime() {
        if (this.paused)
            return this.pausedTime + new Date().getTime() - this.startTime;
        else
            return this.pausedTime;
    }

    getFinishedTime() {
        if (this.completed) {
            return this.startTime;
        } else {
            error("Can't get finished time when clock is not completed");
            return -1;
        }
    }
}

class GravityTimer {
    constructor(board) {
        this.board = board;
        this.timerId, this.start, this.remaining = this.board.settings.gravityDelay;
        this.board.gravNum++;
        this.resume();
    }

    pause() {
        clearTimeout(this.timerId);
        this.remaining -= new Date().getTime() - this.start;
    }

    resume() {
        this.start = new Date().getTime();
        
        var f = function(board) {
            if (board.gravNum == 0)
                return;
            if (board.gravNum >= 1)
                board.gravNum--;
            if (board.gravNum != 0)
                return;
            
            board.piece.drop();
            
            if (board.gravTimer != null)
                board.gravTimer = new GravityTimer(board);
        }

        this.timerId = setTimeout(f, this.remaining, this.board);
    }
}

class Piece {
    // piece must be either i, j, l, o, s, t, z
    constructor(piece, board) {
        if (piece.length != 1 || "ijlostz".indexOf(piece) == -1) {
            error("Error: piece must be either i, j, l, o, s, t, z but was: " + piece);
            return;
        }
        this.board = board;
        this.piece = piece;
        this.rotation = 0;
        this.isDropped = false;
        this.displayed = false;
        this.keysPressed = []; // fill out by key listeners then adds to record
        this.linesCleared = 0;
        this.spin = false;

        // adjustments for cw. For ccw multiply by -1.
        // sets are: (column adjust, row adjust)
        var rot1 = [];
        rot1.push([[0,0], [-1,0], [-1,1], [0,-2], [-1,-2]]); // 0>>1
        rot1.push([[0,0], [1,0], [1,-1], [0,2], [1,2]]); // 1>>2
        rot1.push([[0,0], [1,0], [1,1], [0,-2], [1,-2]]); // 2>>3
        rot1.push([[0,0], [-1,0], [-1,-1], [0,2], [-1,2]]); // 3>>0
        var rot2 = [];
        rot2.push([[0,0], [-2,0], [1,0], [-2,-1], [1,2]]); // 0>>1
        rot2.push([[0,0], [-1,0], [2,0], [-1,2], [2,-1]]); // 1>>2
        rot2.push([[0,0], [2,0], [-1,0], [2,1], [-1,-2]]); // 2>>3
        rot2.push([[0,0], [1,0], [-2,0], [1,-2], [-2,1]]); // 3>>0
        var rotationChart = {"i": rot2, "j": rot1, "l": rot1, "o": rot1, "s": rot1, "t": rot1, "z": rot1};
        this.rotationChart = rotationChart[piece];
        
        var i = [[0,0,0,0],[1,1,1,1],[0,0,0,0],[0,0,0,0]];
        var j = [[1,0,0],[1,1,1],[0,0,0]];
        var l = [[0,0,1],[1,1,1],[0,0,0]];
        var o = [[1,1],[1,1]];
        var s = [[0,1,1],[1,1,0],[0,0,0]];
        var t = [[0,1,0],[1,1,1],[0,0,0]];
        var z = [[1,1,0],[0,1,1],[0,0,0]];
        var pieceLayout = {"i": i, "j": j, "l": l, "o": o, "s": s, "t": t, "z": z};
        this.pieceLayout = pieceLayout[piece];

        this.loc = this.getDefaultLoc();
    }

    getDefaultLoc() {
        // TODO implement starting row setting (or add with other setting - number of rows)
        var loc = [20,3];
        var spawnLoc = {"i": [19,3], "j": loc, "l": loc, "o": [20,4], "s": loc, "t": loc, "z": loc};
        if (!this.isValidPosition(spawnLoc[this.piece], this.pieceLayout))
            spawnLoc[this.piece][0]--;
        return spawnLoc[this.piece];
    }
    
    getPiece() {
        return this.piece;
    }
    
    getRotation() {
        return this.rotation
    }

    getLocation() {
        return [this.loc[0], this.loc[1]];
    }

    getLayout() {
        // TODO return copy of layout?
        return this.pieceLayout;
    }

    addMove(m) {
        var v = {action: m, time: new Date().getTime()};
        if (m == 0)
            v.piece = this.piece;
        this.board.recordAddMove(v);
    }

    addKeyPressed(m) {
        this.keysPressed.push({key: m, time: new Date().getTime()});
    }

    reset() {
        this.isDropped = false;
        this.clear();
        this.loc = this.getDefaultLoc();
        this.setRotation(0);
        this.loc = this.getDefaultLoc();
        this.addKeyPressed("hold"); // TODO: fix - super jank
        this.addMove(8);
        this.display();
    }

    greyOut() {
        this.piece = "grey";
    }

    place() {
        var testUpLoc = this.getLocation();
        testUpLoc[0]--;
        if (!(this.canMove(1) || this.canMove(-1) || this.isValidPosition(testUpLoc, this.pieceLayout))) {
            this.spin = true;
        }
        this.isDropped = true;

        this.board.stats.executeStatsListeners("piecePlaced");

        if (this.isDropped) {
            this.display();
            this.board.swapped = false;

            this.board.updateScreen();
            this.board.playPiece();
        }
    }
    
    // erase piece from board
    clear() {
        if (this.isDropped)
            return;
        for (var row = 0; row < this.pieceLayout.length; row++) {
            for (var col = 0; col < this.pieceLayout.length; col++) {
                if (this.pieceLayout[row][col] == 1) {
                    var newRow = this.loc[0] + row;
                    var newCol = this.loc[1] + col;// TODO change bounds to those specified in settings
                    if (!(newRow < 20 || newCol < 0 || newRow >= this.board.board.tiles.length || newCol >= this.board.board.tiles[0].length)) {
                        var ele = this.board.board.tiles[newRow][newCol].element;
                        if (ele !== null)
                            ele.classList.remove(this.piece);
                        else
                            error(row + "," + col);
                        if (this.isDropped)
                            this.board.board.tiles[newRow][newCol].p = "";
                    }
                }
            }
        }
        this.clearShadow();
    }
    
    hold() {
        this.addMove(7);
        this.clear();
        this.loc = this.getDefaultLoc();
        this.setRotation(0);
        this.loc = this.getDefaultLoc();
        this.clear();
    }

    setRotation(r) {
        var count = 0;
        while (this.rotation != r) {
            this.rotate(1);
            if (count >= 100) {
                error("couldn't rotate piece");
                break;
            }
            count++;
        }
    }

    // display piece on board
    display() {
        if (!this.displayed) {
            this.displayed = true;
            this.loc = this.getDefaultLoc();
        }

        if (!this.isValidPosition(this.loc, this.pieceLayout)) {
            error("Piece [" + this.piece + "] collision error. location: \n" + this.loc + "\npieceLayout:\n" + this.pieceLayout);
            return;
        }
        for (var row = 0; row < this.pieceLayout.length; row++) {
            for (var col = 0; col < this.pieceLayout.length; col++) {
                if (this.pieceLayout[row][col] == 1) {
                    var newRow = this.loc[0] + row;
                    var newCol = this.loc[1] + col;
                    if (!(newRow < 0 || newCol < 0 || newRow >= this.board.board.tiles.length || newCol >= this.board.board.tiles[0].length)) {
                        var ele = this.board.board.tiles[newRow][newCol].element;
                        if (ele !== null)
                            ele.classList.add(this.piece);
                        if (this.isDropped)
                            this.board.board.tiles[newRow][newCol].p = this.piece;
                    }
                }
            }
        }
        this.displayShadow();
    }

    displayShadow() {
        if (!this.board.settings.boolShadowPiece)
            return;

        var arr = this.getShadowElements();
        for (var i = 0; i < arr.length; i++) {
            var e = this.board.board.tiles[arr[i][0]][arr[i][1]].element;
            try {
                if (e.classList.length == 0) {
                    e.classList.add("shadow");
                }
            } catch(err) {
                // console.log("Could not display shadow"); // TODO fix this bug when you spam pieces to the top
            }
        }
    }

    clearShadow() {
        var arr = this.getShadowElements();
        for (var i = 0; i < arr.length; i++) {
            var e = this.board.board.tiles[arr[i][0]][arr[i][1]].element;
            if (e != null && e.classList.length != 0) {
                e.classList.remove("shadow");
            }
        }
    }

    getShadowElements() {
        var loc = this.getLocation();
        while (this.isValidPosition(loc, this.pieceLayout)) {
            loc[0]++;
        }
        loc[0]--;
        var arr = [];
        for (var r = 0; r < this.pieceLayout.length; r++) {
            for (var c = 0; c < this.pieceLayout[0].length; c++) {
                if (this.pieceLayout[r][c] != 0 && loc[0] + r < this.board.board.tiles.length && loc[1] + c < this.board.board.tiles[0].length && loc[0] + r >= 0 && loc[1] + c >= 0) {
                    arr.push([loc[0] + r, loc[1] + c]);
                }
            }
        }
        return arr;
    }

    // either 1 (cw) or -1 (ccw)
    rotate(num) {
        if (num != 1 && num != -1) {
            error("Error: rotate value must be either 1 or -1 but was " + num);
            return;
        }
        this.clear();
        this.addMove((num > 0) ? 3 : 4);
        var tempRotation = (this.rotation + 4 + num) % 4;
        var tempLayout = Piece.rotateArr(this.pieceLayout, num);
        for (var i = 0; i < this.rotationChart[0].length; i++) {
            var rotRules = (this.rotation + 4 -(num == -1 ? 1 : 0)) % 4;
            var loc = [];
            // index 1 is y-axis (so row) and positive y is negative row
            loc.push(this.loc[0] + (-1) * num * this.rotationChart[rotRules][i][1]);
            loc.push(this.loc[1] + num * this.rotationChart[rotRules][i][0]);

            if (this.isValidPosition(loc, tempLayout)) {
                this.pieceLayout = tempLayout;
                this.loc = loc;
                this.rotation = tempRotation;
                break;
            }
        }
        this.display();
    }



    // move the piece down one level: if it's at the bottom and can't go down this piece will become "dropped"
    drop() {
        if (this.canDrop()) {
            this.clear();
            this.loc = [this.loc[0] + 1, this.loc[1]];
            this.display();
        } else {
            this.place();
        }
    }

    canDrop() {
        var newLoc = [this.loc[0] + 1, this.loc[1]];
        return this.isValidPosition(newLoc, this.pieceLayout);
    }

    canMove(num) {
        var newLoc = this.getLocation();
        newLoc[1] = newLoc[1] + num;
        return this.isValidPosition(newLoc, this.pieceLayout);
    }

    // moves the piece this amount, positive is right, negative is left.
    move(amount) {
        if (!this.canMove(amount))
            error("Can not move " + amount + " (positive is right, negative is left).");
        this.addMove((amount > 0) ? 1 : 2);
        var direction = amount / Math.abs(amount);
        var originalLoc = this.loc;
        this.clear();
        var newLoc;
        for (var i = 0; i != amount; i += direction) {
            newLoc = [this.loc[0], this.loc[1] + direction];
            if (!this.isValidPosition(newLoc, this.pieceLayout)) {
                this.clear();
                break;
            }
            this.loc = newLoc;
        }
        this.display();
    }
    
    // tests if there are any conflicts at location (2 element array) and arr (piece layout array)
    isValidPosition(loc, arr) {
        // remove own piece from the virtual board before checking

        for (var row = 0; row < arr.length; row++) {
            for (var col = 0; col < arr[0].length; col++) {
                // if the tile in arr is empty don't need to check
                if (arr[row][col] !== 0) {
                    // + 20 because the game board is 20 squares taller than the other board
                    var curRow = loc[0] + row;
                    var curCol = loc[1] + col;
                    // if the tile is off the edge
                    if (curRow >= this.board.board.tiles.length || curCol >= this.board.board.tiles[0].length || curRow < 0 || curCol < 0)
                        return false;
                    
                    // check if the tile is empty
                    if (this.board.board.tiles[curRow][curCol].p !== "")
                        return false;
                }
            }
        }

        return true;
    }
    
    // rotates the array clockwise, array must be square. Direction is 1 for cw, -1 for ccw
    static rotateArr(arr, direction) {
        if (arr.length != arr[0].length) {
            error("Error: array must be 2d and square but was " + arr);
            return;
        }
        
        var newArr = [];
        for (var row = 0; row < arr.length; row++) {
            var temp = [];
            for (var col = 0; col < arr.length; col++) {
                if (direction == 1)
                    temp.push(arr[arr.length - col - 1][row]);
                else
                    temp.push(arr[col][arr.length - row - 1]);
            }
            newArr.push(temp);
        }
        return newArr;
    }
}
