import "./common"

import "../styles/standalone.scss"

import {AppModel} from "../app/model/app";
import {MainComponent} from "../app/components/app";
import {APIStorageComponent} from "../app/components/storage";
import {RouterComponent} from "../app/components/router";

function SlangStudioStandalone(el: HTMLElement): Promise<void> {
    return new Promise<void>(resolve => {
        const app = new AppModel();
        const mainComponent = new MainComponent(app, el);

        new APIStorageComponent(app, 'http://localhost:5149/');
        const router = new RouterComponent(app);

        mainComponent.load().then(() => {
            router.checkRoute();
        });
    });
}

const el =document.getElementById("slang-studio");
if (el) {
    SlangStudioStandalone(el);
}