export const createCustomizedElement = ({
    tagName = "div",
    children = [],
    style = {},
    onChange,
    onClick,
    ...props
} = {}) => {
    let element = document.createElement(tagName);
    Object.assign(element, props);
    Object.assign(element.style, style);
    if (children) {
        children.forEach((child) =>
            element.appendChild(createCustomizedElement(child))
        );
    }
    if (typeof onChange === "function") {
        element.addEventListener("change", onChange);
    }
    if (typeof onClick === "function") {
        element.addEventListener("click", onClick);
    }
    return element;
};

export const createButton = ({ style, onClick, ...props } = {}) => {
    const button = createCustomizedElement({
        tagName: "button",
        innerText: "+",
        ...props,
        style: {
            backgroundColor: "lightblue",
            borderRadius: "5px",
            ...style,
        },
    });

    if (onClick) {
        button.addEventListener("click", onClick);
    }
    return button;
};

export const downloadBlob = (fileName = "file.json", dataObj) => {
    // Create a blob of the data
    // Save the names of the tile in each slot
    var fileToSave = new Blob([dataObj], {
        type: "application/json",
    });

    // Save the file
    const link = document.createElement("a");
    link.download = fileName;
    link.href = window.URL.createObjectURL(fileToSave);
    link.dataset.downloadurl = ["text/json", link.download, link.href].join(
        ":"
    );

    const evt = new MouseEvent("click", {
        view: window,
        bubbles: true,
        cancelable: true,
    });

    link.dispatchEvent(evt);
    link.remove();
};

export const createInputField = ({ onChange, onClick, ...fieldProps }) => {
    const newField = createCustomizedElement({ tagName: "input", ...fieldProps });
    if (onChange) {
        newField.addEventListener("change", onChange);
    }
    if (onClick) {
        newField.addEventListener("click", onClick);
    }
    return newField;
};

export const createForm = ({ onSubmit, fields, ...formProps }) => {
    /*
formProps: {
    onSubmit: function(e),
    fields: [{
        name: String,
        label: String,
        value: any,
        onChange: function(e),
        ...other,
    }]
}
*/
    const formElement = createCustomizedElement({ tagName: "form" });

    if (!formProps) {
        return;
    }

    if (onSubmit) {
        formElement.addEventListener("submit", onSubmit);
    }

    if (!fields) {
        return;
    }

    fields.forEach((options) => {
        formElement.appendChild(createInputField(options));
    });

    return formElement;
};
