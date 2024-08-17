import { getCutsceneManager } from "./cutscenes/cutsceneManager.js";
import { createButton, createInputField } from "./mapMaker/htmlHelpers.js";
import { legacyCutsceneFetcher } from "./utils/fileFetcher.js";

window.addEventListener("load", async () => {
    let inputValue = "wasted";
    const mainDiv = document.getElementById("main");
    mainDiv.style.display = "flex";

    mainDiv.appendChild(
        createInputField({
            onChange: (e) => {
                inputValue = e.target.value;
            },
            style: {
                width: "1000px",
                height: "50px",
                fontSize: "30pt",
                marginRight: "5px",
            },
            value: inputValue
        })
    );
    mainDiv.appendChild(
        createButton({
            onClick: async () => {
                console.log({ inputValue }, await legacyCutsceneFetcher(inputValue));
                const cutsceneManager = await getCutsceneManager({
                    foregroundCanvas: document.getElementById("canvas-1"),
                    backgroundCanvas: document.getElementById("canvas-2"),
                    cutsceneName: inputValue,
                });
                console.log({ cutsceneManager });
                await cutsceneManager.perform();
            },
            innerText: "Go",
            style: {
                width: "50px",
                height: "50px",
            },
        })
    );
});
