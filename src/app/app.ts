import '../styles/index.scss';

import {LandscapeModel} from "./model/landscape";
import {BlueprintModel} from "./model/blueprint";
import {LandscapeComponent} from "./components/landscape";
import {StorageComponent} from "./components/storage";

const landscape = new LandscapeModel();
const landscapeComponent = new LandscapeComponent(landscape, 'myholder');
const storageComponent = new StorageComponent(landscape, 'http://localhost:5149/');

storageComponent.load();

document.getElementById('sl-btn-add-bp').addEventListener('click', () => {
    const name = (document.getElementById('sl-bp-name') as any).value;
    landscape.addBlueprint(new BlueprintModel(name));
});
