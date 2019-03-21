import {SlangApp} from "../../../slang/app";
import {BlueprintToolBoxType} from "../../../slang/aspects";
import {SlangSubject} from "../../../slang/core/abstract/utils/events";
import {blueprintModelToJson, loadBlueprints} from "../../../slang/core/mapper";
import {BlueprintModel, BlueprintType} from "../../../slang/core/models/blueprint";
import {LandscapeModel} from "../../../slang/core/models/landscape";
import {
	BlueprintJson, BlueprintsJson,
	GenericSpecificationsApiResponse,
	PropertyAssignmentsApiResponse,
} from "../../../slang/definitions/api";
import {PaperView} from "../../../slang/ui/views/paper-view";

interface SlangFileJSON {
	main: string;
	args?: {
		properties: PropertyAssignmentsApiResponse;
		generics: GenericSpecificationsApiResponse;
	};
	blueprints: BlueprintsJson;
}

export class BlueprintShareApp extends SlangApp {

	private exportRequested = new SlangSubject<BlueprintModel>("blueprint-export");
	private importRequested = new SlangSubject<SlangFileJSON>("blueprint-import");
	private downloadRequested = new SlangSubject<SlangFileJSON>("blueprint-download");

	protected onReady(): void {

		this.importRequested.subscribe((slangFile: SlangFileJSON) => {
			this.import(slangFile);
		});

		this.exportRequested.subscribe((blueprint: BlueprintModel) => {
			this.export(blueprint);
		});

		this.downloadRequested.subscribe((exported: SlangFileJSON) => {
			this.download(exported);
		});

		this.aspects!.registerBlueprintToolboxButton((_view: PaperView, blueprint: BlueprintModel): BlueprintToolBoxType[] => {
			return [{
				label: "Export",
				onclick: () => {
					this.exportRequested.next(blueprint);
				},
			}];
		});

		this.app.subscribeReady((ready) => {
			if (!ready) {
				return;
			}
			const landscape = this.app.getChildNode(LandscapeModel)!;
			landscape.subscribeUploadRequested(() => {
				this.upload();
			});
		});
	}

	protected upload() {
		const elem = document.createElement("input");
		elem.setAttribute("type", "file");
		elem.setAttribute("accept", ".json");

		const importRequested = this.importRequested;
		elem.onchange = () => {
			if (!elem.files) {
				return;
			}

			const file = elem.files[0];

			if (!file) {
				return;
			}

			const reader = new FileReader();
			reader.onload = () => {
				const data = reader.result as string;

				let slangFile;

				try {
					slangFile = JSON.parse(data) as SlangFileJSON;
				} catch {
					return;
				}

				if (slangFile.main === undefined || slangFile.blueprints === undefined) {
					return;
				}

				importRequested.next(slangFile);
			};

			reader.readAsText(file, "utf-8");

		};

		elem.style.display = "none";
		document.body.appendChild(elem);

		elem.click();

		document.body.removeChild(elem);
	}

	protected import(slangFile: SlangFileJSON) {
		const bpJson = slangFile.blueprints;
		if (bpJson.local.length === 0 && bpJson.library.length === 0) {
			return;
		}
		const landscape = this.app.createLandscape();
		loadBlueprints(landscape, bpJson);
		this.app.switchLandscape(landscape);
	}

	protected export(blueprint: BlueprintModel): void {
		const exportedBlueprints = new Map<string, [BlueprintJson, BlueprintType]>();
		const remainingBlueprints: BlueprintModel[] = [blueprint];

		while (remainingBlueprints.length > 0) {
			const currBp = remainingBlueprints.pop();
			if (!currBp || exportedBlueprints.has(currBp.uuid)) {
				continue;
			}

			exportedBlueprints.set(currBp.uuid, [blueprintModelToJson(currBp), currBp.getType()]);

			for (const op of currBp.getOperators()) {
				remainingBlueprints.push(op.getBlueprint());
			}
		}

		const bplist = Array.from(exportedBlueprints.values());
		this.downloadRequested.next({
			main: blueprint.uuid,
			blueprints: {
				elementary: bplist.filter((each) => each[1] === BlueprintType.Elementary).map((each) => each[0]),
				library: bplist.filter((each) => each[1] === BlueprintType.Library).map((each) => each[0]),
				local: bplist.filter((each) => each[1] === BlueprintType.Local).map((each) => each[0]),
			},
		});

	}

	protected download(slangFile: SlangFileJSON) {
		const elem = document.createElement("a");
		elem.setAttribute("href", "data:text/plain;charset=utf-8," + encodeURIComponent(JSON.stringify(slangFile)));
		elem.setAttribute("download", `${slangFile.main}.slang.json`);

		elem.style.display = "none";
		document.body.appendChild(elem);

		elem.click();

		document.body.removeChild(elem);
	}
}
