import '../styles/index.scss';

import {LandscapeModel} from "./model/landscape";
import {BlueprintModel} from "./model/blueprint";
import {LandscapeComponent} from "./components/landscape";
import {StorageComponent} from "./components/storage";
import {ApiService} from "./services/api";

const landscape = new LandscapeModel();
const landscapeComponent = new LandscapeComponent(landscape, 'map');
const storageComponent = new StorageComponent(landscape, new ApiService('http://localhost:5149/'));

storageComponent.load();

const btn = document.getElementById('sl-btn-add-bp');
if (btn != null) {
    btn.addEventListener('click', () => {
        const name = (document.getElementById('sl-bp-name') as any).value;
        landscape.addBlueprint(new BlueprintModel(name));
    });
}
