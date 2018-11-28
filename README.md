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

[**setup()**](#detailsSetup) Sets up core. Order of module setup is not guarenteed.

**[cleanup()](#detailsCleanup)** Cleans up memory and html listeners used by core.

**game create(settings)** Creates a new game structure `{board, piece, upNext, hold, modules, listeners}`.

**destroy(game)** Called on game event "destroy". Destroys (cleans up) a game, including memory and listeners.

**start(game)** Called on game event "start" (note: either create or reset must be called prior to this). Starts the game from a blank state.

**reset(game)** Called on game event "reset". Resets a game to it's blank state.

**pause(game)** Called on game event "pause" (note: start or resume must be called prior to this). Pauses the game but preserves the state.

**resume(game)** Called on game event "resume" (note: pause must have been called prior to this). Resumes the game at its paused state.

The following data and methods are unique to the core.

**games** Structure with games listed in format `{id: 3, list: [0, 2], game0, game2}` (note that game1 has been destroyed)

**utils** Object with useful methods `{game: {move(), rotate(), drop(), place(), isValid(), ...}, defaultSettings, ...}`

**listeners** Structure storing events and callbacks for core.

**listen(event, priority, func, data) listen(listeners, event, priority, func, data)** Listens for event.

**execute(event) execute(listeners, event)** Executes event by calling all events specified in listeners by priority (lightest first: 0 to 100).

<a name="details"></a>
## Implementation Details

<a name="details-setup"></a>
**setup()**

<a name="details-cleanup"></a>
**cleanup()** Cleans up memory and html listeners used by core.

<a name="details-create"></a>
**game create(settings)** Creates a new game structure `{board, piece, upNext, hold, modules, listeners}`.

<a name="details-destroy"></a>
**destroy(game)** Called on game event "destroy". Destroys (cleans up) a game, including memory and listeners.

<a name="details-start"></a>
**start(game)** Called on game event "start" (note: either create or reset must be called prior to this). Starts the game from a blank state.

<a name="details-reset"></a>
**reset(game)** Called on game event "reset". Resets a game to it's blank state.

<a name="details-pause"></a>
**pause(game)** Called on game event "pause" (note: start or resume must be called prior to this). Pauses the game but preserves the state.

<a name="details-resume"></a>
**resume(game)** Called on game event "resume" (note: pause must have been called prior to this). Resumes the game at its paused state.

<a name="details-games"></a>
**games** Structure with games listed in format `{id: 3, list: [0, 2], game0, game2}` (note that game1 has been destroyed)

<a name="details-utils"></a>
**utils** Object with useful methods `{game: {move(), rotate(), drop(), place(), isValid(), ...}, defaultSettings, ...}`

<a name="details-listeners"></a>
**listeners** Structure storing events and callbacks for core.

<a name="details-listen"></a>
**listen(event, priority, func, data) listen(listeners, event, priority, func, data)** Listens for event.

<a name="details-execute"></a>
**execute(event) execute(listeners, event)** Executes event by calling all events specified in listeners by priority (lightest first: 0 to 100).

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
