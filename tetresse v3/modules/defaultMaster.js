tetresse.modules.defaultMaster = {
    requires: {modules: ["defaultGraphics"]},
    currentView: [],
    setup() {
        for (var view in this.views)
            if (this.views[view].setup !== undefined) this.views[view].setup();

        this.api.goto("play");
        // tetresse.on("setup", utils.ready, 60);
    },
    api: {
        goto(view) { // adds view to currentView stack. If already in stack, cleans / pops stack until view is on top
            var dm = tetresse.modules.defaultMaster;
            if (view === undefined && dm.currentView.length > 1) view = dm.currentView[dm.currentView.length - 2];
            var i, i2, cur;
            for (i = dm.currentView.length - 1; i >= 0; i--) if (dm.currentView[i] == view) break;
            if (i >= 0) // if in stack, pop all above, clean first overlaying
                while (dm.currentView.length > i + 1) {
                    cur = dm.currentView.pop();
                    if (dm.views[cur].built) { dm.views[cur].clean(); dm.views[cur].built = false; }
                }
            if (!dm.views[view].overlay && i < 0) { // clean overlays if this is not overlay
                for (i2 = dm.currentView.length - 1; i2 >= 0; i2--) {
                    cur = dm.currentView[i2];
                    if (dm.views[cur].built) { dm.views[cur].clean(); dm.views[cur].built = false; }
                    else break;
                }
            }
            if (i < 0) dm.currentView.push(view);
            if (!dm.views[view].built) { dm.views[view].build(); dm.views[view].built = true; }
        },
        changeOption(optionId, value) {

        }    
    },
    views: {
        play: {
            state: {game: null},
            setup() {
                this.state.game = tetresse.create({m: {
                    defaultGraphics: {id: "tetresse-game-one", type: "pixel", 
                        layout: {"board": 1, "hold": 1, "next": 1}
                    },
                    // tetriaGravity: {enabled: true}
                }})

                window.setTimeout(tetresse.modules.defaultGraphics.utils.pixel.resize, 100, this.state.game);
            },
            build() {
                tetresse.start(this.state.game);
            },
            clean() {
                tetresse.reset(this.state.game);
            },
        }
    },
    utils: {
        options: {
            setup() {

            },
            change(id) {

            }
        }
    }
}