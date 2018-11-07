import "./common";

import "../styles/standalone.scss";

import {AppModel} from "../app/model/app";
import {SlangApp} from "../app/ui/app";
import {APIStoragePlugin} from "../app/plugins/storage";
import {RouterPlugin} from "../app/plugins/router";
import {HTMLCanvas} from "../app/ui/cavas";

function SlangStudioStandalone(el: HTMLElement): Promise<void> {
    return new Promise<void>(resolve => {
        const appModel = new AppModel("slang");
        const app = new SlangApp(appModel);
        app.addCanvas(new HTMLCanvas(el), true);

        new APIStoragePlugin(appModel, "http://localhost:5149/");
        const router = new RouterPlugin(appModel);

        app.load().then(() => {
            router.checkRoute();
            resolve();
        });
    });
}

const el = document.getElementById("slang-studio");
if (el) {
    SlangStudioStandalone(el);
}