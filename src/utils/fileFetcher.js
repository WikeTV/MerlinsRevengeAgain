export const publicJSONFileLoader = async (filePath) => {
    let fileData;
    await fetch(`/public/${filePath}`)
        .then((res) => res.json())
        .then((data) => {
            fileData = data;
        });
    return fileData;
};

export const publicGenericFileLoader = async (filePath) => {
    let fileData;
    await fetch(`/public/${filePath}`)
        .then((res) => res.text())
        .then((data) => {
            fileData = data;
        });
    return fileData;
};

export const legacyCutsceneFetcher = async (cutsceneName) => {
    return publicGenericFileLoader("legacyFiles/cut_scenes/" + cutsceneName + ".txt");
};
