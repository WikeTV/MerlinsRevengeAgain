import { getGameManager } from "./scenes/gameManager.js";

// Controls debug displays and other development-specific features.
const DEV_MODE = window?.location?.href?.includes("localhost") ?? false; // only allow debug mode on while accessed via localhost URL

if(DEV_MODE){
    console.log("Debug info display key: I");
}

window.addEventListener("load", async () => {
    const { loop } = await getGameManager({ canDebug: DEV_MODE });

    loop();
});
