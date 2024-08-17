export const sceneLoader = async (fileName) => {
    let scene;
    await fetch(`/public/maps/${fileName}`)
        .then((res) => res.json())
        .then((data) => {
            scene = data;
        });
    return scene;
};
