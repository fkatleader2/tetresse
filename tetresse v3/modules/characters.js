tetresse.modules.characters = {
    modes: ["warrior", "tank", "juggernaut", "healer", "mage"],
    setup() {
        this.modes.forEach(function(label) {
            tetresse.modes[label] = this.characters[label];
        }.bind(this));
    },
    characters: {
        warrior: {
            settings: {
                graphicsComponents: ["board", "background", "hold", "next", "abilities", "lineclear", "incomming"],
                spectatorGraphicsComponents: ["board", "background", "lineclear", "incomming"],
                abilities: [{type: "passive", name: "warriorPassive"}, {type: "ultimate", name: "focus"}],
            }
        },
        tank: {
            settings: {
                graphicsComponents: ["board", "background", "hold", "next", "abilities", "lineclear", "incomming", "mana"],
                spectatorGraphicsComponents: ["board", "background", "lineclear", "incomming", "mana"],
                abilities: [
                    {type: "passive", name: "tankPassive"}, 
                    {type: "ability1", name: "tankAbility1"},
                    {type: "ultimate", name: "tankUltimate"}, 
                ],
            }
        },
        juggernaut: {
            settings: {
                graphicsComponents: ["board", "background", "hold", "next", "abilities", "incomming"],
                spectatorGraphicsComponents: ["board", "background", "lineclear", "incomming"],
                abilities: [{type: "passive", name: "juggernautPassive"}, {type: "ultimate", name: "juggernautUltimate"}],
                lineClearDelay: 0
            }
        },
        healer: {
            settings: {
                graphicsComponents: ["board", "background", "hold", "next", "abilities", "lineclear", "incomming", "mana"],
                spectatorGraphicsComponents: ["board", "background", "lineclear", "incomming", "mana"],
                abilities: [
                    {type: "passive", name: "healerPassive"}, 
                    {type: "ability1", name: "healerAbility1"},
                    {type: "ability2", name: "healerAbility2"},
                    {type: "ability3", name: "healerAbility3"},
                    {type: "ultimate", name: "healerUltimate"}, 
                ],
            }
        },
        mage: {
            settings: {
                graphicsComponents: ["board", "background", "hold", "next", "abilities", "lineclear", "mana"],
                spectatorGraphicsComponents: ["board", "background", "lineclear", "incomming", "mana"],
                abilities: [
                    {type: "passive", name: "magePassive"}, 
                    {type: "ability1", name: "mageAbility1"},
                    {type: "ability2", name: "mageAbility2"},
                    {type: "ultimate", name: "mageUltimate"}, 
                ],
            }
        }
    },
    graphics: {
        sources: {
            warrior: {
                abilities: {
                    ultimate: {src: "imgs/characters/focus.jpg"},
                    passive: {color: "blue"},
                }
            },
            tank: {
                abilities: {
                    ultimate: {color: "green"},
                    passive: {color: "yellow"},
                    ability1: {color: "orange"},
                }
            },
            juggernaut: {
                background: {color: "#1b0000"}, // #2b0000, #460000
                abilities: {
                    ultimate: {color: "green"},
                    passive: {color: "blue"},
                }
            },
            healer: {
                abilities: {
                    passive: {color: "blue"},
                    ability1: {color: "red"},
                    ability2: {color: "orange"},
                    ability3: {color: "yellow"},
                    ultimate: {color: "green"},
                },
                background: {color: "#001306"}
            },
            mage: {
                abilities: {
                    passive: {color: "blue"},
                    ability1: {color: "red"},
                    ability2: {color: "orange"},
                    ultimate: {color: "green"},
                },
                background: {color: "#13001d"}
            },
        }
    }
};