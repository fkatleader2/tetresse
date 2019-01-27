// TODO fix problem of too much empty space at some screen sizes
tetresse.modules.tetria = {
    games: [],
    sizeGroups: [[0], [1, 2, 3, 4, 5]],
    setup() {
        // settings
        $("#settings-button").click(function(e) {
            $("#settings-menu-container")[0].classList.toggle("hidden");
        });

        // exit
        document.getElementById("exit-button").onclick = function(e) {
            console.log("exit");
        }

        // chat send message
        document.getElementById("chat-input").onkeydown = function(e) {
            if (e.keyCode === 13 && !e.shiftKey) {
                console.log("sent text");
                e.target.innerHTML = "";
                return false;
            }
        }
        for (var component in this.components)
            if (this.components[component].setup != null) this.components[component].setup();
    },
    loading() { // loading graphic
        console.log("loading");
    },
    loaded() { // entry point for game
        console.log("loaded");
        tetresse.setup();
        var characters = ["warrior", "tank", "juggernaut", "healer", "healer", "mage"];
        for (var i = 0; i < 6; i++)
            this.games.push(tetresse.create(document.getElementById("game-" + i), characters[i], {"state.spectating": i == 0 ? false : true}));
        window.onresize = function() {
            tetresse.modules.tetria.resize();
        };
        tetresse.modules.tetria.resize();
        document.getElementById("loading").style.display = "none";
    },
    resize() { // resize the games to be the same size as their groups
        tetresse.modules.tetria.games.forEach(function(game) {
            tetresse.modules.graphics.game.resize(game);
        });
        tetresse.modules.tetria.sizeGroups.forEach(function(groupArr) {
            var min = null;
            groupArr.forEach(function(num) {
                var graphics = tetresse.modules.tetria.games[num].modules.graphics;
                min = min == null || graphics.n < min ? graphics.n : min;
            });
            groupArr.forEach(function(num) {
                var game = tetresse.modules.tetria.games[num];
                tetresse.modules.graphics.game.resize(game, min);
            });
        });
    },
    components: {
        menus: {
            setup() {
                // close button
                $(".menu-navbar>.close").click(function(e) {
                    console.log(e);
                    e.target.parentNode.parentNode.parentNode.classList.toggle("hidden");
                });
                // navigation buttons
                var navbars = $(".menu-navbar>.tabs").click(function(e) {
                    var getValue = function(text) {
                        return text.toLowerCase().replace(" ", "");
                    };
                    if (e.target.value == null) return;
                    var tabs = e.target.parentNode.parentNode;
                    var next = getValue(e.target.innerHTML);
                    var prev = tabs.attributes.selected.value;
                    tabs.attributes.selected.value = next;
                    console.log([e.target]);
                    var list = e.target.parentNode.children;
                    for (var i = 0; i < list.length; i++)
                        if (getValue(list[i].innerHTML) == prev) {
                            list[i].classList.remove("active");
                        }
                    e.target.classList.add("active");

                    list = e.target.parentNode.parentNode.parentNode.parentNode.children[1];
                    if (list == null) return;
                    for (var i = 0; i < list.children.length; i++) {
                        var eleValue = list.children[i].attributes.value.value
                        if (eleValue == prev || eleValue == next)
                            list.children[i].classList.toggle("hidden");
                    }
                });
            }
        }
    },
    chat: {
        history: [], // stores messages in format: {name, msg, timeStamp}
        add(uname, message, time = (new Date()).getTime()) {
            this.history.push({name: uname, msg: message, timeStamp: time})
        },
        reset() {
            this.history = [];
        },
        generate(clear = false) {
            var chatElement = document.getElementById("chat-area");
            if (clear) {
                while(chatElement.children.length > 0)
                    chatElement.removeChild(chatElement.children[0]);
            }
            for(var i = chatElement.children.length; i < this.history.length; i++) {
                var ele = document.createElement("div");
                var eleData = this.history[i];
                ele.innerHTML = "<strong>" + eleData.name + "</strong>: " + eleData.msg;
                var date = new Date(eleData.timeStamp);
                ele.title = ((date.getHours() - 1) % 12 + 1) + ":" + date.getMinutes() + " " + (date.getHours() > 12 ? "pm" : "am");
                chatElement.appendChild(ele);
            }

        }
    },
    players: {
        list: [], // stores players names and stuff in format: {name, rank, playing: true | false}
    },
    game: {
        setup(game) {
            if (!game.state.spectating) { // generate keybinds table
                // TODO include this in tetresse utils
                var labelPairs = {"8": "backspace","9": "tab","13": "enter","16": "shift","17": "ctrl","18": "alt","19": "pause/break","20": "caps lock","27": "escape","32": "(space)","33": "page up","34": "page down","35": "end","36": "home","37": "left arrow","38": "up arrow","39": "right arrow","40": "down arrow","45": "insert","46": "delete","48": "0","49": "1","50": "2","51": "3","52": "4","53": "5","54": "6","55": "7","56": "8","57": "9","65": "a","66": "b","67": "c","68": "d","69": "e","70": "f","71": "g","72": "h","73": "i","74": "j","75": "k","76": "l","77": "m","78": "n","79": "o","80": "p","81": "q","82": "r","83": "s","84": "t","85": "u","86": "v","87": "w","88": "x","89": "y","90": "z","91": "left window key","92": "right window key","93": "select key","96": "numpad 0","97": "numpad 1","98": "numpad 2","99": "numpad 3","100": "numpad 4","101": "numpad 5","102": "numpad 6","103": "numpad 7 ","104": "numpad 8","105": "numpad 9","106": "multiply","107": "add","109": "subtract","110": "decimal point","111": "divide","112": "f1","113": "f2","114": "f3","115": "f4","116": "f5","117": "f6","118": "f7","119": "f8","120": "f9","121": "f10","122": "f11","123": "f12","144": "num lock","145": "scroll lock","186": "semi-colon","187": "equal sign","188": "comma","189": "dash","190": "period","191": "forward slash","192": "grave accent","219": "open bracket","220": "back slash","221": "close braket","222": "single quote"};
                var table = document.getElementById("settings-area-keybinds-table").children[0];
                for (var label in game.keyBinds) {
                    var tr = document.createElement("tr");
                    tr.id = "settings-area-keybinds-table-" + label + "-row";
                    var shownLabel = label.length > 3 ? 
                        label.substring(0, 1).toUpperCase() + label.substring(1) : label.toUpperCase();
                    var keyArr = [];
                    game.keyBinds[label].forEach(function(ele) {
                        keyArr.push(labelPairs[ele]);
                    });
                    [{innerHTML: shownLabel}, {innerHTML: game.keyBinds[label].toString()}, {innerHTML: keyArr.toString()}].forEach(function(ele) {
                        var td = document.createElement("td");
                        for (var v in ele) td[v] = ele[v];
                        tr.appendChild(td);
                    });
                    table.appendChild(tr);
                }
            }
        }
    }
};