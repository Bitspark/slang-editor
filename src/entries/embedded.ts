import "./common";

import "../styles/embedded.scss";

import {AppModel} from "../slang/model/app";
import {Slang} from "../slang/slang";
import {ViewFrame} from "../slang/ui/frame";
import {LandscapeModel} from "../slang/model/landscape";
import {StaticStorageApp} from "../apps/storage/src/app";
import {componentFactory} from "../slang/ui/components/factory";

export function SlangStudioEmbedded(el: HTMLElement, blueprintFullName: string): Promise<void> {
	return new Promise<void>(resolve => {
		const appModel = AppModel.create(`embedded-${blueprintFullName}`);
		const app = new Slang(appModel);
		app.addFrame(new ViewFrame(el), true);
		new StaticStorageApp(appModel, componentFactory, "https://files.bitspark.de/slang-operators/slang-definitions.json");

		app.load().then(() => {
			const blueprint = appModel.getChildNode([LandscapeModel])!.findBlueprint(blueprintFullName);
			if (blueprint) {
				blueprint.open();
			} else {
				console.error(`blueprint ${blueprintFullName} could not be found`);
			}
			resolve();
		});
	});
}

const elements = document.getElementsByClassName("slang-embedded");
for (const el of elements) {
	if (el instanceof HTMLElement) {
		SlangStudioEmbedded(el, el.dataset["blueprint"] as string);
	}
}