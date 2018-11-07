import "./common"

import "../styles/embedded.scss"

import {AppModel} from "../app/model/app";
import {SlangApp} from "../app/ui/app";
import {StaticStoragePlugin} from "../app/plugins/storage";
import {HTMLCanvas} from "../app/ui/cavas";

export function SlangStudioEmbedded(el: HTMLElement, blueprintFullName: string): Promise<void> {
    return new Promise<void>(resolve => {
        const appModel = new AppModel(`embedded-${blueprintFullName}`);
        const app = new SlangApp(appModel);
        app.addCanvas(new HTMLCanvas(el), true);
        app.addPlugin(new StaticStoragePlugin(appModel, 'https://files.bitspark.de/slang-operators/slang-definitions.json'));

        app.load().then(() => {
            const blueprint = appModel.getLandscape().findBlueprint(blueprintFullName);
            if (blueprint) {
                blueprint.open();
            } else {
                console.error(`blueprint ${blueprintFullName} could not be found`);
            }
            resolve();
        });
    })
}

const elements = document.getElementsByClassName("slang-embedded");
for (const el of elements) {
    if (el instanceof HTMLElement) {
        SlangStudioEmbedded(el, el.dataset['blueprint'] as string);
    }
}