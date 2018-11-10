import "./common";

import "../styles/standalone.scss";

import {AppModel} from "../app/model/app";
import {SlangApp} from "../app/app";
import {APIStoragePlugin} from "../app/plugins/storage";
import {RouterPlugin} from "../app/plugins/router";
import {ViewFrame} from "../app/ui/frame";

function SlangStudioStandalone(el: HTMLElement): Promise<void> {
    return new Promise<void>(resolve => {
        const appModel = new AppModel("slang");
        const app = new SlangApp(appModel);
        const frame = new ViewFrame(el);
        app.addFrame(frame, true);

        new APIStoragePlugin(appModel, "http://localhost:5149/");

        app.load().then(() => {
            const router = new RouterPlugin(appModel);
            router.checkRoute();
            resolve();
        });
    });
}

const el = document.getElementById("slang-studio");
if (el) {
    SlangStudioStandalone(el);
}