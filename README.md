## Tetresse v3
This project provides a standardized way to add features to the core game. It not only provides the base game structures and methods (tiles, boards, rotation, translation, generation, etc), but also a system for implementing "modules" using standard methods (create / destroy, start / reset, pause / resume) and a custom "list" listener system.

#### Quick Links:
- [Quickstart](#quickstart)
- [Project Develpment](#dev)
- [File Structure](#files)
- [Module Implementation](#module)
- [Source Code Structure](#src)
- [Implementation Details](#details)
- [License](#license)
<a name="quickstart"></a>
## Quickstart:
Super quick start: clone repo, open index.html, done!
<a name="dev"></a>
## Project Development:
How to help / development stuff
<a name="files"></a>
## File Structure:

**tetresse.js** Core game mechanics and module setup.

**index.html** Regular html file - a module is required to display board.

**modules/** Modules go here. Note all modules listed are not required for the core.

**modules/graphics.js** Generates a canvas and syncs the core with the canvas.

**modules/controls.js** Binds key events to core controls.

**modules/game.js** "Master" module which specifies where and when to make tetresse instances. Also implements html interaction with specific functions (change settings, start, reset, pause, etc).

<a name="module"></a>
## Module Implementation
To add module to list of tetresse modules, use: `tetresse.modules.myModule = {}`

"Keywords" used by the core in your module: setup(), cleanup(), create(game), destroy(game), start(game), reset(game), pause(game), resume(game), requires

Example module:
```
tetresse.modules.myModule = {
    requires: { modules: ["graphics, controls"] },
    setup() { this.data = {} },
    cleanup() { delete this.data },
    create(game) { game.modules.myModule.count = 0 },
    destroy(game) { delete game.modules.myModule.count },
    start(game) { game.modules.myModule.count = 1 },
    reset(game) { game.modules.myModule.count = 0 },
    pause(game) { game.modules.myModule.count += 1 },
}
```
Note that resume is not defined. "keywords" are only called / parsed if they are defined, so leaving some out is fine.
<a name="src"></a>
## Source Code Structure
Life cycle of core (and modules): setup, destroy
Life cycle of a game (and "module games"): create, start, pause, resume, reset, start, destroy

The following methods are also called for every module where all requirements are met. Note function params are the same (`myModule.setup()`) except for create: `myModule.create(game)`

[**setup()**](#details-setup) Sets up core. Order of module setup is not guarenteed.

[**cleanup()**](#details-cleanup) Cleans up memory and html listeners used by core.

[**game create(settings)**](#details-create) Creates a new game structure `{board, piece, upNext, hold, modules, listeners}`.

[**destroy(game)**](#details-destroy) Called on game event "destroy" (note: setup must be called once prior). Destroys (cleans up) a game, including memory and listeners.

[**start(game)**](#details-start) Called on game event "start" (note: either create or reset must be called prior to this). Starts the game from a blank state.

[**reset(game)**](#details-reset) Called on game event "reset". Resets a game to it's blank state.

[**pause(game)**](#details-pause) Called on game event "pause" (note: start or resume must be called prior to this). Pauses the game but preserves the state.

[**resume(game)**](#details-resume) Called on game event "resume" (note: pause must have been called prior to this). Resumes the game at its paused state.

The following data and methods are unique to the core.

[**games**](#details-games) Structure with games listed in format `{id: 3, list: [0, 2], game0, game2}` (note that game1 has been destroyed)

[**utils**](#details-utils) Object with useful methods `{game: {move(), rotate(), drop(), place(), isValid(), ...}, defaultSettings, ...}`

[**listeners**](#details-listeners) Structure storing events and callbacks for core.

[**on(event, priority, func, data) on(listeners, event, priority, func, data)**](#details-listen) Listens for event.

[**execute(event) execute(listeners, event)**](#details-execute) Executes event by calling all events specified in listeners by priority (lightest first: 0 to 100).

[**q**](#details-queue) Object which takes multiple threads and makes execution synchronous.

<a name="details"></a>
## Implementation Details

<a name="details-setup"></a>
**setup()** Goes through all modules, warns if some module's requirements (`myModule.requires = {modules: []}`) are not met and removes them. Calls remaining module's setup function (`myModule.setup()`) if it's a function.

Note: order is not guarenteed.

<a name="details-cleanup"></a>
**cleanup()** Calls all module's cleanup function (`myModule.cleanup()`) if it's a function.

Note: order is not guarenteed.

<a name="details-create"></a>
**game create(settings)** Creates a game with given settings and calls all module's create function (`myModule.create(obj)`) if it's a function and passes: `{game, settings}`.

Settings parameter format:
```
settings = {
    rows, cols, // numbers (width and height of board)
    m: {
        myModule: {} // settings for myModule
    }
}
```

Game object returned:
```
game = {
    id, // number
    modules: {},
    listeners: { id: 0 },
    board: [rows][cols],
    cur: {
        hold, piece, // string
        canHold, // boolean
        locX, locY, rot // numbers
        next, // array of strings
        nextBufferSize: 7, // min number of pieces to have in buffer (-1 to not generate)
        layout // 2d array of this piece (locX, locY is layout[0][0])
    },
    state: -1, // number (-1: create, 0: reset, 1: start, 2: pause)
    settings: {} // for disabling core manipulator functions
}
```

<a name="details-destroy"></a>
**destroy(game)** Calls all module's destroy function (`myModule.destroy(game)`) if it's a function. Removes game from `tetresse.games` object.

<a name="details-start"></a>
**start(game)** game must be in state -1 or 0. Calls all module's start function (`myModule.start()`) if it's a function. Changes `game.state` to 1.

<a name="details-reset"></a>
**reset(game)** game must be in state 1 or 2. Calls all module's reset function (`myModule.reset()`) if it's a function. Changes `game.state` to 0.

<a name="details-pause"></a>
**pause(game)** game must be in state 1. Calls all module's pause function (`myModule.pause()`) if it's a function. Changes `game.state` to 2.

<a name="details-resume"></a>
**resume(game)** game must be in state 2. Calls all module's resume function (`myModule.resume()`) if it's a function. Changes `game.state` to 1.

<a name="details-games"></a>
**games** Object containing games created.

```
games = {
    remove(id), // removes id and game at id
    cleanup(), // resets games (emptys and resets ids)
    add(game), // adds a game and sets game.id
    get(id), // returns the game with the id, or null if game has been removed
    list: {[id]: arrIndex},
    arr: [game]
    id: 3 // always the id of the next game that will be created
}
```

<a name="details-utils"></a>
**utils** General functions used in core.

Mechanics linked when game is created unless setting specified (TODO).
Default piece life:
[gamestart]
> next -> initCur -> (move)\
> place -> next -> initCur
>> hold  
>> if first time: next -> initCur
    else initCur
[gameend]

Overview:
```
utils = {
    game: { // module calls move(game, 1) if(testMove(game, 1) == 1) place(game)
        hold(game) // returns boolean
        move(game, amount) // returns boolean
        rotate(game, amount) // returns boolean
        drop(game, (amount)) // returns number amount dropped (or lifted into first valid opening, negative), or null if no valid opening
        softDrop(game) // returns boolean
        hardDrop(game) // returns boolean
        moveTo(game, locX, locY) // returns boolean
        // tests don't update board once completed
        testHold(game) // returns boolean
        testMove(game, amount) // returns amount successfully moved (-1 if invalid)
        testRotate(game, amount) // amount is amount to rotate (negative CCW, positive CW), returns {canRotate (boolean), (locX, locY, layout -- set if canRotate is true)}, locs potential new locs after rotation
        testDrop(game, amount) // returns amount piece can drop (negative if currently invalid and needs to go up)
        testMoveTo(game, locX, locY) // returns {locX, locY}, locs are lowest potential new locs (0 if piece is valid after moving, null if no valid openings)
        testValid(game, (locX), (locY), (layout)) // returns if not out of bounds and not overlap, note x/y/layout are whatever game specifies when undefined
        testOutOfBounds(game, (locX), (locY), (layout)) // test if piece is outside of the board, returns true if outside board
        testOverlap(game, (locX), (locY), (layout)) // tests if piece is overlapping any on the board, returns true if overlapping
        place(game) // places cur onto board
        next(game) // next piece becomes cur
        initCur(game) // initializes cur piece
        testFilledRows(game) // searches from bottom until it reaches an empty row, returns array of numbers (rows that are filled)
        collapse(game) // collapses completed board rows
    },
    pieces: {
        layout: { i: [][] }, // 1 indicates piece takes up that spot
        rotationChart: { "j,l,o,s,t,z": [][], "i": [][] } // see SRS spin rules
        copy2dStringMatrix(arr) // assumes arr is 2d matrix where all elements are strings and copies it.
        rotate(arr, amount) // rotates given array by amount (1 = 90 degrees, 2 = 180, 3 = ...), note doesn't copy
        shuffle(arr) // shuffles arr
    }
    misc: {
        passToModules(funcName, game) // game optional, calls funcName of all modules and passes game if function funcName exists in module
        locToInsert(arr, sortKey, element) // returns number where to insert element to keep array ordered (ascending) given sortKey
        findKey(obj, str) // returns first (string) key in object which includes str
        removeListener((listeners, )event, id) // removes listener from listeners (tetress.listeners by default)
    }
}
```

<a name="details-listeners"></a>
**listeners**

<a name="details-on"></a>
**on(event, priority, func, data) on(listeners, event, priority, func, data)**

<a name="details-execute"></a>
**execute(event) execute(listeners, event)**

<a name="details-queue"></a>
**q**

<a name="license"></a>
## License
Copyright (c) 2018 tetresse

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
