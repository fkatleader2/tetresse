tetresse.modules.tetriasocket = {
    socket: null,
    setup() {
        try {
            this.socket = io();
        } catch(e) {
            console.log("offline mode");
        }
    }
}