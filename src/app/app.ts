import '../styles/index.scss';
import 'jointjs/css/layout.css';

import {AppModel} from './model/app';
import {MainComponent} from "./components/app";
import {HTTPStorageComponent} from './components/storage';
import {RouterComponent} from './components/router';

function SlangStudio(el: HTMLElement) {
    const app = new AppModel();
    const mainComponent = new MainComponent(app, el);

    new HTTPStorageComponent(app, 'http://localhost:5149/');
    const router = new RouterComponent(app);

    mainComponent.load().then(() => {
        router.checkRoute();
    });
}

SlangStudio(document.getElementById("app")!);