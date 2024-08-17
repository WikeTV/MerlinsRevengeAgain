import { getGameManager } from "./scenes/gameManager.js";

const DEV_MODE = true;

window.addEventListener("load", async () => {
    const { loop } = await getGameManager({ isDevMode: DEV_MODE });

    loop();
});
