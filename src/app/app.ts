import '../styles/index.scss';

import {LandscapeModel} from "./model/landscape";
import {BlueprintModel} from "./model/blueprint";
import {LandscapeComponent} from "./components/landscape";
import {StorageComponent} from "./components/storage";
import {ApiService} from "./services/api";

const landscape = new LandscapeModel();
const landscapeComponent = new LandscapeComponent(landscape, 'map');
const storageComponent = new StorageComponent(landscape, new ApiService('http://localhost:5149/'));


// JUST FOR TESTING:

document.getElementById('sl-btn-add-bp')!.addEventListener('click', () => {
    const name = (document.getElementById('sl-bp-name') as any).value;
    landscape.addBlueprint(new BlueprintModel(name));
});

landscape.subscribeSelectionChanged(bp => {
    document.getElementById('sl-bp-selected')!.textContent = bp === null ? 'null' : bp.getFullName();
});

landscape.subscribeBlueprintAdded(bp => {
    const bpel = document.createElement('li');
    bpel.textContent = bp.getFullName();
    bpel.addEventListener('click', () => {
        bp.select();
    });
    document.getElementById('sl-bps')!.append(bpel);

    bp.subscribeSelectChanged(selected => {
        if (selected) {
            bpel.style.color = 'red';
        } else {
            bpel.style.color = 'inherit';
        }
    })
});

storageComponent.load();
