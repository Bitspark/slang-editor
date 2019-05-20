import m from "mithril";

import {SlangApp} from "../../../slang/app";
import {BlueprintToolBoxType, SlangAspects} from "../../../slang/aspects";
import {AppModel} from "../../../slang/core/models/app";
import {BlueprintModel} from "../../../slang/core/models/blueprint";
import {ApiService, PortMessageJson} from "../../../slang/definitions/api";
import {SlangTypeValue} from "../../../slang/definitions/type";
import {PaperView} from "../../../slang/ui/views/paper-view";

export class DeploymentApp extends SlangApp {
	private api: ApiService;

	constructor(app: AppModel, aspect: SlangAspects, api: ApiService) {
		super(app, aspect);
		this.api = api;
	}

	protected onReady(): void {
		this.aspects!.registerBlueprintToolboxButton((view: PaperView, blueprint: BlueprintModel, redraw: () => void): BlueprintToolBoxType[] => {
			const l: BlueprintToolBoxType[] = [];

			if (view.isRunnable) {
				if (blueprint.isDeployed()) {
					l.push({
						onclick: async () => {
							await this.shutdown(blueprint);
							redraw();
						},
						class: "sl-btn-warn",
						label: "Shutdown",
					});
				} else {
					l.push({
						onclick: async () => {
							if (view.isEditable) {
								blueprint.save();
							}
							await this.deploy(blueprint);
							redraw();
						},
						label: "Deploy",
					});
				}
			}

			// TODO move this button to storage app
			if (view.isEditable) {
				l.push({
					onclick: () => {
						blueprint.save();
					},
					label: "Save",
				});
			}

			return l;
		});

	}

	private async deploy(blueprint: BlueprintModel) {
		if (blueprint.isDeployed()) {
			return;
		}
		this.api.subscribeDisconnected(() => {
			blueprint.shutdown();
			m.redraw();
		});

		const runningOp = await this.api.deployBlueprint(blueprint.uuid);
		blueprint.deploy(runningOp);
		blueprint.subscribeInputPushed((inputData: SlangTypeValue) => {
			this.pushInput(blueprint, inputData);
		});
		this.api.subscribePortMessage(runningOp, (outputData: PortMessageJson) => {
			blueprint.pushOutput(outputData);
		});
	}

	private async shutdown(blueprint: BlueprintModel) {
		const access = blueprint.getInstanceAccess();
		if (!access) {
			return;
		}
		await this.api.shutdownBlueprintInstance(access.handle);
		blueprint.shutdown();
	}

	private pushInput(blueprint: BlueprintModel, inputData: SlangTypeValue): void {
		const access = blueprint.getInstanceAccess();
		if (!access) {
			return;
		}
		this.api.pushInput(access.url, inputData);
	}
}
