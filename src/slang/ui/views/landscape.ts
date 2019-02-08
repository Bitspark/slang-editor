import {dia, shapes} from "jointjs";
import uuidv4 from "uuid/v4";

import {SlangType} from "../../definitions/type";

import {PortDirection} from "../../core/abstract/port";
import {BlueprintModel, BlueprintType} from "../../core/models/blueprint";
import {LandscapeModel} from "../../core/models/landscape";

import {BlackBoxShape, BlueprintBoxComponent} from "../components/blackbox";
import {ViewFrame} from "../frame";
import {PaperView} from "./paper-view";

export class LandscapeView extends PaperView {

	private readonly filter: ((blueprint: BlueprintModel) => boolean) | null;
	private blueprintRects = new Map<string, shapes.standard.Rectangle>();
	private addBlueprintButton: dia.Element;
	private slangLogo: dia.Element;
	private dimensions: [number, number] = [0, 0];

	constructor(frame: ViewFrame, private landscape: LandscapeModel, filter?: (blueprint: BlueprintModel) => boolean) {
		super(frame, {
			editable: false,
			hscrollable: false,
			vscrollable: true,
		});
		this.addPanning();

		if (filter) {
			this.filter = filter;
		} else {
			this.filter = null;
		}

		this.addBlueprintButton = this.createAddBlueprintButton();
		this.slangLogo = this.createSlangLogo();

		this.redraw();
		this.subscribe(landscape);
	}

	public resize(width: number, height: number) {
		super.resize(width, height);
		this.dimensions = [width, height];
		this.reorder();
	}

	public redraw() {
		if (!this.graph) {
			return;
		}

		this.graph.clear();

		this.addBlueprintButton = this.createAddBlueprintButton();
		this.slangLogo = this.createSlangLogo();

		this.reorder();
	}

	private subscribe(landscape: LandscapeModel) {
		landscape.subscribeChildCreated(BlueprintModel, (blueprint) => {
			if (!this.filter || this.filter(blueprint)) {
				this.addBlueprint(blueprint);
				this.reorder();
			}
		});
	}

	private reorder() {
		const blueprintNames = Array.from(this.blueprintRects.keys());
		blueprintNames.sort();
		this.reorderEqually(blueprintNames, this.dimensions[0], this.dimensions[1]);
	}

	private reorderEqually(blueprintNames: string[], width: number, height: number) {
		const columns = Math.min(5, Math.floor((width - 400) / 200));
		const rows = Math.max((blueprintNames.length + 1) / columns);

		let i = 0;
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < columns; col++) {
				let rect: dia.Element | null = null;

				if (i > 0) {
					const blueprintName = blueprintNames[i - 1];
					if (!blueprintName) {
						break;
					}
					rect = this.blueprintRects.get(blueprintName)!;
				} else {
					rect = this.addBlueprintButton;
				}

				const posX = (col - columns / 2 + 0.5) * 200;
				const posY = -height / 2 + 100 + (row + 1) * 140 + 100;

				rect.position(posX - rect.getBBox().width / 2, posY - rect.getBBox().height / 2);

				i++;
			}
		}

		// Slang logo
		const logo = this.slangLogo;
		const logoPosX = 0;
		const logoPosY = -height / 2 + 100;
		logo.position(logoPosX - logo.getBBox().width / 2, logoPosY - logo.getBBox().height / 2);
	}

	private createAddBlueprintButton(): dia.Element {
		if (!this.graph) {
			throw new Error(`no graph`);
		}

		const rect = BlackBoxShape.placeGhost(this, "＋");
		rect.attr("draggable", false);
		rect.attr("label/cursor", "pointer");
		rect.attr("label/font-size", "28");
		rect.attr("body/cursor", "pointer");

		rect.on("pointerup", () => {
			const newBlueprint = this.landscape.createBlueprint({
				uuid: uuidv4(),
				meta: {name: `Unnamed${new Date().getTime()}`},
				type: BlueprintType.Local,
			});
			newBlueprint.createPort({
				name: "",
				type: SlangType.newMap(),
				direction: PortDirection.In,
			});
			newBlueprint.createPort({
				name: "",
				type: SlangType.newMap(),
				direction: PortDirection.Out,
			});
			newBlueprint.open();
		});

		return rect;
	}

	private createSlangLogo(): dia.Element {
		if (!this.graph) {
			throw new Error(`no graph`);
		}

		const image = new shapes.basic.Image({
			size: {
				width: 177,
				height: 203,
			},
			attrs: {
				image: {
					"xlink:href": "https://files.bitspark.de/slang2.png",
					"width": 177,
					"height": 203,
					"cursor": "default",
				},
			},
		});
		image.attr("draggable", false);
		this.graph.addCell(image);

		return image;
	}

	private addBlueprint(blueprint: BlueprintModel) {
		if (!this.graph) {
			return;
		}

		const blueprintBox = new BlueprintBoxComponent(this, blueprint);
		this.blueprintRects.set(blueprint.name, blueprintBox.getShape());

		// JointJS -> Model
		blueprintBox.onClick(() => blueprint.open());
	}

}
