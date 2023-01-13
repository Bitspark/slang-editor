import m, {ClassComponent, CVnode} from "mithril";

import {Icon} from "../../../slang/ui/toolkit/buttons";

function copyToClipboard(textToCopy: string) {
    const myTemporaryInputElement = document.createElement("input");
    myTemporaryInputElement.type = "text";
    myTemporaryInputElement.value = textToCopy;

    document.body.appendChild(myTemporaryInputElement);

    myTemporaryInputElement.select();
    document.execCommand("Copy");

    document.body.removeChild(myTemporaryInputElement);
}


export class TextWithCopyButton implements ClassComponent<{class: string}> {
    public view({attrs, children}: CVnode<{class:string}>): any {
        return m("span.sle-comp__copyable-text", {
            ...attrs,
            onclick(event: MouseEvent) {
                event.stopPropagation();
                // @ts-ignore
                copyToClipboard(children[0].children);
            }
        }, [
            children,
            m(Icon, {
                fas: "clone",
                size: "small",
            })
        ]);
    }
}
