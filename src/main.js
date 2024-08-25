import { getGameManager } from "./scenes/gameManager.js";

// Controls debug displays and other development-specific features.
const DEV_MODE = window?.location?.href?.includes("localhost") ?? false; // dev mode on while accessed via localhost URL

window.addEventListener("load", async () => {
    const { loop } = await getGameManager({ isDevMode: DEV_MODE });

    loop();
});
