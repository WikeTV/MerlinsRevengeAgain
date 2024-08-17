import { getSceneBuilder } from "./mapMaker/sceneBuilder.js";

window.addEventListener("load", () => {
    let sceneBuilder = getSceneBuilder();
    sceneBuilder.update();
    let loop = () => {
        sceneBuilder.update();
        sceneBuilder.animate();
        requestAnimationFrame(loop);
    };

    loop();
});
