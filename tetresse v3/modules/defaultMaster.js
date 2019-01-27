tetresse.modules.defaultMaster = {
    requires: {modules: ["defaultGraphics"]},
    setup() {
        var utils = tetresse.modules.defaultMaster.utils
        tetresse.on("setup", utils.ready, 60);
    },
    utils: {
        ready: function() {
            var settings = {
                m: {
                    defaultGraphics: {type: "pixel"}
                }
            };
            var game = tetresse.create(settings);
            tetresse.start(game);
        },
    }
}