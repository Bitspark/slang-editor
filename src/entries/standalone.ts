import "./common"

import "../styles/standalone.scss"

import {AppModel} from "../app/model/app";
import {MainComponent} from "../app/ui/app";
import {APIStoragePlugin} from "../app/plugins/storage";
import {RouterPlugin} from "../app/plugins/router";

function SlangStudioStandalone(el: HTMLElement): Promise<void> {
    return new Promise<void>(resolve => {
        const app = new AppModel();
        const mainComponent = new MainComponent(app, el);

        new APIStoragePlugin(app, 'http://localhost:5149/');
        const router = new RouterPlugin(app);

        mainComponent.load().then(() => {
            router.checkRoute();
        });
    });
}

const el =document.getElementById("slang-studio");
if (el) {
    SlangStudioStandalone(el);
}