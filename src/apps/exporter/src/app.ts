import {SlangApp} from "../../../slang/app";
import {BlueprintToolBoxType} from "../../../slang/aspects";
import {SlangSubject} from "../../../slang/core/abstract/utils/events";
import {blueprintModelToJson, updateBlueprints} from "../../../slang/core/mapper";
import {BlueprintModel} from "../../../slang/core/models/blueprint";
import {LandscapeModel} from "../../../slang/core/models/landscape";
import {
	BlueprintJson,
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
	blueprints: BlueprintJson[];
}

export class BlueprintExporterApp extends SlangApp {

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
		if (slangFile.blueprints.length === 0) {
			return;
		}
		const landscape = this.app.getChildNode(LandscapeModel)!;
		updateBlueprints(landscape, slangFile.blueprints);
	}

	protected export(blueprint: BlueprintModel): void {
		const exportedBlueprints = new Map<string, BlueprintJson>();
		const remainingBlueprints: BlueprintModel[] = [blueprint];

		while (remainingBlueprints.length > 0) {
			const currBp = remainingBlueprints.pop();
			if (!currBp || exportedBlueprints.has(currBp.uuid)) {
				continue;
			}

			exportedBlueprints.set(currBp.uuid, blueprintModelToJson(currBp));

			for (const op of currBp.getOperators()) {
				remainingBlueprints.push(op.getBlueprint());
			}
		}

		this.downloadRequested.next({
			main: blueprint.uuid,
			blueprints: Array.from(exportedBlueprints.values()),
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
