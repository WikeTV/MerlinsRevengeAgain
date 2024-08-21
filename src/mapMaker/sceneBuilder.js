import { getMouseInputHandler } from "../utils/inputManager.js";
import {
    getScaledEntityBounds,
    calculateSceneScalingMultiplier,
    rescaleElement,
} from "../utils/scaling.js";
import {
    getEntityManager,
    getEntitiesForSaving,
} from "../enitites/entityManager.js";
import { entityTypes, createEntityOfType } from "../enitites/entityFactory.js";
import tileSprites from "/src/spriteDefinitions/background.js";
import { getSceneManager } from "../scenes/sceneManager.js";
import {
    createCustomizedElement,
    createForm,
    downloadBlob,
} from "./htmlHelpers.js";
import { getMapManager } from "./mapManager.js";

const getTileEntityProps = (tileName, tileSpriteDefinition) => ({
    type: "tileEntity",
    name: tileName,
    definition: tileSpriteDefinition,
    baseWidth: tileSpriteDefinition.frame.w,
    baseHeight: tileSpriteDefinition.frame.h,
    x: tileSpriteDefinition.frame.x + tileSpriteDefinition.frame.w / 2,
    y: tileSpriteDefinition.frame.y + tileSpriteDefinition.frame.h / 2,
    currentState: "default",
    reverseImage: false,
    frameCount: 0,
    rotation: 0,
    states: {
        default: {
            animationFrames: [{ ...tileSpriteDefinition }],
        },
        updateState: ({ currentEntityState }) => currentEntityState,
    },
});

// For selecting which tiles belong in which location for each scene in a map
export const getSceneBuilder = (options = {}) => {
    const floorTilesPng = document.getElementById("tileset");

    let sceneName = "";
    let mapName = "";

    let sceneScalingMultiplier = calculateSceneScalingMultiplier();
    let previewCanvasScale;
    let tilePlacerCanvasScale;
    let tileMapScale;

    // Select canvases and init contexts

    // Foreground tiles
    const foregroundTilesCanvas = document.getElementById("foreground-tiles");
    const foregroundTilesCanvasContext = foregroundTilesCanvas.getContext("2d");
    foregroundTilesCanvas.style.display = "inline";

    // Background tiles
    const backgroundTilesCanvas = document.getElementById("background-tiles");
    const backgroundTilesCanvasContext = backgroundTilesCanvas.getContext("2d");
    backgroundTilesCanvas.style.display = "inline";

    // Tile preview and entity placer (these canvases overlap)
    const overlappingCanvasDisplayStyle = {
        display: "block",
    };
    const canvasContainer = document.getElementById("canvas-container");
    const tilePreviewCanvas = document.getElementById("scene-preview");
    Object.assign(tilePreviewCanvas.style, overlappingCanvasDisplayStyle);
    const entityPreviewCanvas = document.getElementById("entity-preview");
    Object.assign(entityPreviewCanvas.style, overlappingCanvasDisplayStyle);
    const entityPreviewCanvasContext = entityPreviewCanvas.getContext("2d");

    const tileSelectorCanvas = document.getElementById("tile-selector");
    tileSelectorCanvas.width = document.documentElement.clientWidth;
    tileSelectorCanvas.height =
        tileSelectorCanvas.width * (floorTilesPng.width / floorTilesPng.height);
    tileSelectorCanvas.style.display = "block";
    tileSelectorCanvas.style.position = "relative";
    tileSelectorCanvas.style.left = "50%";
    tileSelectorCanvas.style.transform = "translate(-50%, 0)";

    const applyCanvasScaling = () => {
        // Set appropriate scales
        previewCanvasScale = sceneScalingMultiplier / 2;
        tilePlacerCanvasScale = sceneScalingMultiplier / 3;
        tileMapScale =
            document.documentElement.clientWidth / floorTilesPng.width;

        // Scale canvases
        rescaleElement(canvasContainer, previewCanvasScale);
        rescaleElement(tilePreviewCanvas, previewCanvasScale);
        rescaleElement(entityPreviewCanvas, previewCanvasScale);
        rescaleElement(foregroundTilesCanvas, tilePlacerCanvasScale);
        rescaleElement(backgroundTilesCanvas, tilePlacerCanvasScale);

        // Rescale tile selector canvas
        tileMapScale = tileSelectorCanvas.width / floorTilesPng.width;
        tileSelectorCanvas.width = document.documentElement.clientWidth;
        tileSelectorCanvas.height =
            (tileSelectorCanvas.width * floorTilesPng.height) /
            floorTilesPng.width;
    };

    // Initial canvas scale
    applyCanvasScaling();

    const tileSelectorCanvasContext = tileSelectorCanvas.getContext("2d");

    const tileSelectorMouseInput = getMouseInputHandler(tileSelectorCanvas);

    // Load all tile sprites into the EntityManager, to handle them in a standard way.
    // these will be rendered later
    const tileSelectorEntityManager = Array.from(
        Object.entries(tileSprites.frames)
    ).reduce(
        (entityManagerState, [tileName, tileSpriteDefinition]) => {
            return entityManagerState.createAndSpawnEntity({
                entityValues: Object.assign(
                    {},
                    getTileEntityProps(tileName, tileSpriteDefinition),
                    {
                        spriteSheet: floorTilesPng,
                    }
                ),
                entityManagerState,
            });
        },
        getEntityManager({
            entityCanvas: tileSelectorCanvas,
        })
    );

    const allTileOptions = tileSelectorEntityManager.getCurrentState().entities;

    let selectedTile;

    // Initialize map preview and scene entity placer
    let sceneManager = getSceneManager({
        tileDisplayCanvasElement: tilePreviewCanvas,
    });
    let scene = sceneManager.initializeEmptyScene().currentScene;

    let sceneEntityManager = getEntityManager({
        entityCanvas: entityPreviewCanvas,
    });

    // Take all entity options and convert them into a list of selectable options
    const entitySelectOptions = Object.keys(entityTypes).map((type) => {
        const optionElementString = `<option value="${type}" id="${type}"><span>${type}</span></option>`;
        return optionElementString;
    });

    // Insert options inside the select element that already exists on the page
    const entitySelectElement = document.getElementById("entity-select");
    entitySelectElement.innerHTML = [
        `<option value="" id="unselected"></option>`,
        ...entitySelectOptions,
    ].join("");
    const entityAttributesDisplayContainer =
        document.getElementById("entity-attributes");
    const entityAttributesFormContainer = document.getElementById(
        "edit-form-container"
    );

    // When an entity is selected, create it and display its attributes to be modified
    let selectedNewEntity = null;
    entitySelectElement.addEventListener("change", (e) => {
        if (e.target.value) {
            selectedNewEntity = createEntityOfType(e.target.value);
            const attributesObject = {
                ...selectedNewEntity,
                states: Object.keys(selectedNewEntity.states),
            };
            entityAttributesDisplayContainer.innerText = JSON.stringify(
                attributesObject,
                null,
                2
            );
            selectedEditEntity = null;
            entityAttributesFormContainer.innerHTML = "";
        } else {
            selectedNewEntity = null;
            entityAttributesDisplayContainer.innerText = "";
        }
    });

    let tileSize = {
        w: foregroundTilesCanvas.width / 18,
        h: foregroundTilesCanvas.height / 9,
    };

    const getArrayXY = (offsetX, offsetY) => {
        return {
            x: Math.floor(offsetX / tileSize.w),
            y: Math.floor(offsetY / tileSize.h),
        };
    };

    // Handle when user clicks on background tile placer element
    backgroundTilesCanvas.addEventListener("click", (e) => {
        // Place tile in background grid when clicked
        let { x: columnNumber, y: rowNumber } = getArrayXY(
            e.offsetX,
            e.offsetY
        );
        scene.backgroundTiles[columnNumber][rowNumber] =
            selectedTile?.name ?? undefined;
    });
    backgroundTilesCanvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        // Right-click should fill row with tile
        let { x: columnNumber, y: rowNumber } = getArrayXY(
            e.offsetX,
            e.offsetY
        );
        scene.backgroundTiles.forEach((col) => {
            col[rowNumber] = selectedTile?.name ?? undefined;
        });
    });

    // Handle when user clicks on foreground tile placer element
    foregroundTilesCanvas.addEventListener("click", (e) => {
        // Place tile in foreground grid when clicked
        let { x: columnNumber, y: rowNumber } = getArrayXY(
            e.offsetX,
            e.offsetY
        );
        scene.foregroundTiles[columnNumber][rowNumber] =
            selectedTile?.name ?? undefined;
    });
    foregroundTilesCanvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
    });

    // Entity placer handler
    entityPreviewCanvas.addEventListener("click", (e) => {
        if (selectedNewEntity) {
            console.log({
                selectedNewEntity,
                entityManagerState: sceneEntityManager,
                entity: Object.assign({}, selectedNewEntity, {
                    x: e.offsetX / previewCanvasScale,
                    y: e.offsetY / previewCanvasScale,
                }),
            });
            sceneEntityManager = sceneEntityManager.createAndSpawnEntity({
                entityManagerState: sceneEntityManager,
                entityValues: Object.assign({}, selectedNewEntity, {
                    x: e.offsetX / previewCanvasScale,
                    y: e.offsetY / previewCanvasScale,
                }),
            });
        }
        console.log(
            "entitySavedValues",
            getEntitiesForSaving({ entityManagerState: sceneEntityManager })
        );
    });

    // Entity edit select handler
    let selectedEditEntity = null;
    entityPreviewCanvas.addEventListener("contextmenu", (e) => {
        e.preventDefault();
        const mouseX = e.offsetX;
        const mouseY = e.offsetY;
        const foundEntity = sceneEntityManager.entities.find((sceneEntity) => {
            const {
                x: scaledX,
                y: scaledY,
                w,
                h,
            } = getScaledEntityBounds(sceneEntity, previewCanvasScale);
            const x = scaledX - w / 2;
            const y = scaledY - h / 2;
            return mouseX > x && mouseX < x + w && mouseY > y && mouseY < y + h;
        });

        selectedEditEntity = foundEntity
            ? Object.assign({}, foundEntity)
            : null;

        if (!selectedEditEntity) {
            entityAttributesFormContainer.innerHTML = "";
            return;
        }

        selectedNewEntity = null;
        entitySelectElement.value = "";
        entityAttributesDisplayContainer.innerHTML = "";

        // Define "entity edit" input field elements and onChange behavior
        const getFieldElement = (fieldName, props = {}) => {
            return {
                tagName: "div",
                style: {
                    display: "flex",
                    justifyContent: "space-between",
                },
                children: [
                    { tagName: "p", innerText: fieldName },
                    {
                        tagName: "input",
                        name: fieldName,
                        placeholder: fieldName,
                        onChange: (e) => {
                            console.log(
                                "field value change: ",
                                fieldName,
                                e.target.value
                            );
                            selectedEditEntity[fieldName] = e.target.value;
                            sceneEntityManager = sceneEntityManager
                                .removeEntity({
                                    entityManagerState: sceneEntityManager,
                                    entityToRemove: selectedEditEntity,
                                })
                                .createAndSpawnEntity({
                                    entityValues: selectedEditEntity,
                                    entityManagerState: sceneEntityManager,
                                })
                                .clearScreen({
                                    entityManagerState: sceneEntityManager,
                                })
                                .drawEntities({
                                    entityManagerState: sceneEntityManager,
                                });
                        },
                        value: selectedEditEntity[fieldName],
                    },
                ],
            };
        };

        // Define, create, and attach edit entity form
        const editForm = createForm({
            onSubmit: (e) => {
                e.preventDefault();
            },
            fields: [
                ...Object.entries(selectedEditEntity || {})
                    ?.filter(
                        ([fieldName, fieldValue]) =>
                            typeof fieldValue === "number" ||
                            typeof fieldValue?.split === "function"
                    )
                    ?.map(([fieldName, fieldValue]) =>
                        getFieldElement(fieldName)
                    ),
                {
                    tagName: "button",
                    onClick: (e) => {
                        e.preventDefault();
                        sceneEntityManager = sceneEntityManager.removeEntity({
                            entityManagerState: sceneEntityManager,
                            entityToRemove: selectedEditEntity,
                        });
                        entityAttributesFormContainer.innerHTML = "";
                        selectedEditEntity = null;
                    },
                    type: "button",
                    innerText: "Remove",
                },
            ],
        });
        editForm.addEventListener("submit", (e) => {
            console.log(e);
            e.preventDefault();
        });

        entitySelectElement.value = "";
        entityAttributesFormContainer.innerHTML = "";
        entityAttributesFormContainer.appendChild(editForm);
    });

    // Initialize mapManager tool
    let mainDiv = document.getElementById("main-div");
    let sceneSelectorDiv = createCustomizedElement({
        style: { display: "flex" },
    });
    mainDiv.appendChild(sceneSelectorDiv);
    let mapManager = getMapManager(sceneSelectorDiv, {
        width: 1,
        height: 1,
        onSceneSelect: (newScene, event) => {
            // Load scene from map when a scene is selected
            if (newScene.name === "") {
                scene = sceneManager.initializeEmptyScene().currentScene;
                sceneEntityManager = getEntityManager({
                    entityCanvas: entityPreviewCanvas,
                });
                sceneName = undefined;
                document.getElementById("scene-name").value = "";
            } else {
                scene = sceneManager.loadSceneFromJSON(
                    JSON.stringify(newScene)
                ).currentScene;
                sceneEntityManager = getEntityManager({
                    entityCanvas: entityPreviewCanvas,
                    scene,
                });
                sceneName = scene.name;
                document.getElementById("scene-name").value = scene.name;
            }
            selectedEditEntity = null;
        },
    });
    // Destructure mapManager object to more easily view available helpers
    const {
        getCurrentlySelectedScene,
        setSelectedScene,
        saveSceneToMap,
        loadMap,
        saveMap,
        copyScene,
        pasteScene,
    } = mapManager;

    // Handle when user wants to save the scene itself to a separate file
    document.getElementById("scene-name").addEventListener("change", (e) => {
        sceneName = e.target.value;
    });

    document
        .getElementById("save-scene-to-file-button")
        .addEventListener("click", (e) => {
            e.preventDefault();
            var fileName = `${sceneName || "scene"}.json`;

            // Save the names of the tile in each slot
            downloadBlob(
                fileName,
                JSON.stringify({
                    ...scene,
                    // JSON-friendly save data
                    entities: getEntitiesForSaving({
                        entityManagerState: sceneEntityManager,
                    }),
                })
            );
        });

    // Handle saving scene changes to the map
    document
        .getElementById("save-scene-to-map-button")
        .addEventListener("click", (e) => {
            e.preventDefault();

            // Save the names of the tile in each slot
            saveSceneToMap({
                ...scene,
                name: sceneName,
                // JSON-friendly save data
                entities: getEntitiesForSaving({
                    entityManagerState: sceneEntityManager,
                }),
            });
        });

    const handleSceneLoadFormSubmit = async (event) => {
        event.preventDefault();

        // Parse form input into JSON scene data
        const form = event.target;
        const formData = new FormData(form);
        const sceneFileInput = formData.get("load-scene-file");
        const fileJSON = await sceneFileInput.text();

        // Init sceneManager and entityManager
        scene = sceneManager.loadSceneFromJSON(fileJSON).currentScene;
        sceneEntityManager = getEntityManager({
            entityCanvas: entityPreviewCanvas,
            scene,
        });
        document.getElementById("scene-name").value = scene.name;
    };

    document
        .getElementById("scene-load-form")
        .addEventListener("submit", handleSceneLoadFormSubmit);

    // Handle when user saves or loads a map file
    document.getElementById("map-name").addEventListener("change", (e) => {
        mapName = e.target.value;
    });

    document
        .getElementById("save-map-button")
        .addEventListener("click", (e) => {
            e.preventDefault();
            saveMap(mapName);
        });

    const handleMapFileLoadFormSubmit = async (event) => {
        event.preventDefault();

        // Parse form input into JSON scene data
        const form = event.target;
        const formData = new FormData(form);
        const mapFileInput = formData.get("load-map-file");
        const fileJSON = await mapFileInput.text();

        // Init sceneManager and entityManager
        loadMap(fileJSON);
        mapName = JSON.parse(fileJSON)?.name;
        document.getElementById("map-name").value = mapName;
    };

    document
        .getElementById("map-load-form")
        .addEventListener("submit", handleMapFileLoadFormSubmit);

    // Return state update and animate functions
    return {
        update: () => {
            // Check if window size has changed substantially
            if (calculateSceneScalingMultiplier() != sceneScalingMultiplier) {
                // If so, rescale canvas elements
                sceneScalingMultiplier = calculateSceneScalingMultiplier();
                applyCanvasScaling();
            }

            // Select the tile the mouse is hovering at the time it's clicked
            if (
                Object.values(tileSelectorMouseInput.mouseButtonsDown).some(
                    (mb) => Boolean(mb)
                )
            ) {
                const mouseX = tileSelectorMouseInput.x;
                const mouseY = tileSelectorMouseInput.y;
                selectedTile = allTileOptions.find((tileEntity) => {
                    const {
                        x: scaledX,
                        y: scaledY,
                        w,
                        h,
                    } = getScaledEntityBounds(tileEntity, tileMapScale);
                    const x = scaledX - w / 2;
                    const y = scaledY - h / 2;
                    return (
                        mouseX > x &&
                        mouseX < x + w &&
                        mouseY > y &&
                        mouseY < y + h
                    );
                });
            }
        },
        animate: () => {
            tileSize = {
                w: foregroundTilesCanvas.width / 18,
                h: foregroundTilesCanvas.height / 9,
            };

            // Tile selector canvas
            tileSelectorCanvasContext.clearRect(
                0,
                0,
                tileSelectorCanvas.width,
                tileSelectorCanvas.height
            );
            // Draw all floor tile options on the tile selector canvas
            // They exist as entities here, but they get saved to the final scene as just the string fileName
            tileSelectorEntityManager.clearScreen({
                entityManagerState: tileSelectorEntityManager,
            });
            tileSelectorEntityManager.drawEntities({
                entityManagerState: tileSelectorEntityManager,
                scalingMultiplier: tileMapScale,
            });

            // Draw red border around selected tile
            if (selectedTile) {
                tileSelectorCanvasContext.save();
                let { x, y, w, h } = getScaledEntityBounds(
                    selectedTile,
                    tileMapScale
                );
                tileSelectorCanvasContext.strokeStyle = "red";
                tileSelectorCanvasContext.strokeWidth = "10px";
                tileSelectorCanvasContext.strokeRect(
                    x - w / 2,
                    y - h / 2,
                    w,
                    h
                );
                tileSelectorCanvasContext.restore();
            }

            // Refresh foreground tile canvas
            foregroundTilesCanvasContext.clearRect(
                0,
                0,
                foregroundTilesCanvas.width,
                foregroundTilesCanvas.height
            );
            // Draw selected tiles on foreground canvas
            sceneManager.drawScene({
                customCanvas: foregroundTilesCanvas,
                customContext: foregroundTilesCanvasContext,
                options: { skipBackground: true, drawGridLines: true },
            });

            // Refresh background tile canvas
            backgroundTilesCanvasContext.clearRect(
                0,
                0,
                backgroundTilesCanvas.width,
                backgroundTilesCanvas.height
            );
            // Draw selected tiles on background canvas
            sceneManager.drawScene({
                customCanvas: backgroundTilesCanvas,
                customContext: backgroundTilesCanvasContext,
                options: { skipForeground: true, drawGridLines: true },
            });

            // Draw all tiles on preview canvas bottom layer
            sceneManager.drawScene();

            // Draw entities on preview canvas top layer
            sceneEntityManager.clearScreen({
                entityManagerState: sceneEntityManager,
                scalingMultiplier: previewCanvasScale,
            });
            sceneEntityManager.drawEntities({
                entityManagerState: sceneEntityManager,
                scalingMultiplier: previewCanvasScale,
            });

            // Highlight selected entity
            if (selectedEditEntity) {
                entityPreviewCanvasContext.save();
                let { x, y, w, h } = getScaledEntityBounds(
                    selectedEditEntity,
                    previewCanvasScale
                );
                entityPreviewCanvasContext.strokeStyle = "red";
                entityPreviewCanvasContext.strokeWidth = "10px";
                entityPreviewCanvasContext.strokeRect(
                    x - w / 2,
                    y - h / 2,
                    w,
                    h
                );
                entityPreviewCanvasContext.restore();
            }
        },
    };
};
