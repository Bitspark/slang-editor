import "./common"

import "../styles/embedded.scss"

import {AppModel} from "../app/model/app";
import {MainComponent} from "../app/ui/app";
import {StaticStoragePlugin} from "../app/plugins/storage";

export function SlangStudioEmbedded(el: HTMLElement, blueprintFullName: string): Promise<void> {
    return new Promise<void>(resolve => {
        const app = new AppModel();
        const mainComponent = new MainComponent(app, el);
        new StaticStoragePlugin(app, 'https://files.bitspark.de/slang-operators/slang-definitions.json');

        mainComponent.load().then(() => {
            const blueprint = app.getLandscape().findBlueprint(blueprintFullName);
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