import "./common";

import "../styles/embedded.scss";

import {OperatorDataApp} from "../apps/operators/src/app";
import {SLANG_ASPECTS} from "../slang/aspects";
import {fillLandscape} from "../slang/core/mapper";
import {AppModel} from "../slang/core/models/app";
import {LandscapeModel} from "../slang/core/models/landscape";
import {BlueprintApiResponse, BlueprintDefApiResponse} from "../slang/definitions/api";
import {Slang} from "../slang/slang";
import {COMPONENT_FACTORY} from "../slang/ui/components/factory";
import {ViewFrame} from "../slang/ui/frame";

(window as any).startSlang = () => {
	const appModel = AppModel.create(`embedded-slang`);
	const app = new Slang(appModel);

	app.setDefaultViewArgs({
		editable: false,
		descendable: false,
		hscrollable: false,
		vscrollable: false,
	});

	const blueprints: BlueprintApiResponse[] = [];

	for (const el of document.querySelectorAll(`script[type="text/slang"]`)) {
		if (!(el instanceof HTMLScriptElement)) {
			continue;
		}

		const blueprintId = el.dataset.operator as string;
		const blueprintType = el.dataset.type as string;
		const blueprintDef = JSON.parse(el.innerText) as BlueprintDefApiResponse;

		if (blueprintDef.id !== blueprintId) {
			throw new Error(`blueprint ids don't match: ${blueprintId} !== ${blueprintDef.id}`);
		}

		blueprints.push({type: blueprintType, def: blueprintDef});
	}

	fillLandscape(appModel.getChildNode(LandscapeModel)!, blueprints);

	new OperatorDataApp(appModel, SLANG_ASPECTS, COMPONENT_FACTORY);

	for (const el of document.getElementsByClassName("slang-embedded")) {
		if (!(el instanceof HTMLElement)) {
			continue;
		}

		const blueprintId = el.dataset.operator as string;

		app.addFrame(new ViewFrame(el), true);
		app.load().then(() => {
			const blueprint = appModel.getChildNode([LandscapeModel])!.findBlueprint(blueprintId);
			if (blueprint) {
				blueprint.open();
			} else {
				console.error(`blueprint ${blueprintId} could not be found`);
			}
		});
	}
};
