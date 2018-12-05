import {dia, shapes} from "jointjs";
import {BlueprintModel, BlueprintType} from "../../model/blueprint";
import {LandscapeModel} from "../../model/landscape";
import {BlackBoxComponent, BlueprintBoxComponent} from "../components/blackbox";
import {ViewFrame} from "../frame";
import {PaperView} from "./paper-view";

export class LandscapeView extends PaperView {

	private readonly filter: ((blueprint: BlueprintModel) => boolean) | null;
	private blueprintRects = new Map<string, shapes.standard.Rectangle>();
	private addBlueprintButton: dia.Element;
	private slangLogo: dia.Element;
	private dimensions: [number, number] = [0, 0];

	constructor(frame: ViewFrame, private landscape: LandscapeModel, filter?: (blueprint: BlueprintModel) => boolean) {
		super(frame);
		this.addZooming();
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

	private subscribe(landscape: LandscapeModel) {
		landscape.subscribeChildCreated(BlueprintModel, blueprint => {
			if (!this.filter || this.filter(blueprint)) {
				this.addBlueprint(blueprint);
				this.reorder();
			}
		});
	}

	public resize(width: number, height: number) {
		super.resize(width, height);
		this.dimensions = [width, height];
		this.reorder();
	}

	private reorder() {
		const blueprintFullnames = Array.from(this.blueprintRects.keys());
		blueprintFullnames.sort();
		this.reorderEqually(blueprintFullnames, this.dimensions[0], this.dimensions[1]);
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

	private reorderCircle(blueprintFullnames: Array<string>) {
		const blueprintCount = blueprintFullnames.length + 1;
		const ankleStep = 2 * Math.PI / blueprintCount;
		const radius = 100 + blueprintCount * 150 / 2 / Math.PI;
		let ankle = -Math.PI / 2 + ankleStep;

		// Blueprints
		for (const fullname of blueprintFullnames) {
			const rect = this.blueprintRects.get(fullname)!;
			const posX = Math.cos(ankle) * radius;
			const posY = Math.sin(ankle) * radius;
			rect.position(posX - rect.getBBox().width / 2, posY - rect.getBBox().height / 2);
			ankle += ankleStep;
		}

		// Button
		const btn = this.addBlueprintButton;
		let posX = Math.cos(ankle) * radius;
		let posY = Math.sin(ankle) * radius;
		btn.position(posX - btn.getBBox().width / 2, posY - btn.getBBox().height / 2);

		// Slang logo
		const logo = this.slangLogo;
		posX = 0;
		posY = 0;
		logo.position(posX - logo.getBBox().width / 2, posY - logo.getBBox().height / 2);
	}

	private reorderSpiral(blueprintFullnames: Array<string>) {
		const ankleStep = 200;
		const radiusStep = 8000;
		let radius = 200;
		let ankle = 0;

		// Blueprints
		for (const fullname of blueprintFullnames) {
			const rect = this.blueprintRects.get(fullname)!;
			const posX = Math.cos(ankle) * radius - rect.getBBox().width / 2;
			const posY = Math.sin(ankle) * radius - rect.getBBox().height / 2;
			rect.position(posX, posY);
			ankle += 1 / radius * ankleStep;
			radius += 1 / radius * radiusStep;
		}

		// Button
		const btn = this.addBlueprintButton;
		let posX = Math.cos(ankle) * radius;
		let posY = Math.sin(ankle) * radius;
		btn.position(posX - btn.getBBox().width / 2, posY - btn.getBBox().height / 2);

		// Slang logo
		const logo = this.slangLogo;
		posX = 0;
		posY = 0;
		logo.position(posX - logo.getBBox().width / 2, posY - logo.getBBox().height / 2);
	}

	private reorderConcentric(blueprintFullnames: Array<string>) {
		const blueprintCount = blueprintFullnames.length + 1;

		const circleStep = 8;

		let circle = 1;
		let circleCapacity = 8;
		let elements = 0;

		// Blueprints
		for (const fullname of blueprintFullnames) {

			const ankle = (2 * Math.PI / circleCapacity) * elements;
			const radius = circleCapacity * 200 / 2 / Math.PI;

			const rect = this.blueprintRects.get(fullname)!;
			const posX = Math.cos(ankle) * radius;
			const posY = Math.sin(ankle) * radius;

			rect.position(posX - rect.getBBox().width / 2, posY - rect.getBBox().height / 2);

			elements++;

			if (elements % circleCapacity == 0) {
				circle++;
				circleCapacity += circleStep;
				elements = 0;
			}
		}

		// Button
		const btn = this.addBlueprintButton;
		let posX = 0;
		let posY = 0;
		btn.position(posX - btn.getBBox().width / 2, posY - btn.getBBox().height / 2);

		// Slang logo
		const logo = this.slangLogo;
		posX = 0;
		posY = 0;
		logo.position(posX - logo.getBBox().width / 2, posY - logo.getBBox().height / 2);
	}

	private reorderEqually(blueprintFullnames: Array<string>, width: number, height: number) {
		const columns = Math.min(5, Math.floor((width - 400) / 200));
		const rows = Math.max((blueprintFullnames.length + 1) / columns);

		let i = 0;
		for (let row = 0; row < rows; row++) {
			for (let col = 0; col < columns; col++) {
				let rect: dia.Element | null = null;

				if (i > 0) {
					const fullname = blueprintFullnames[i - 1];
					if (!fullname) {
						break;
					}
					rect = this.blueprintRects.get(fullname)!;
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
		let posX = 0;
		let posY = -height / 2 + 100;
		logo.position(posX - logo.getBBox().width / 2, posY - logo.getBBox().height / 2);
	}

	private createAddBlueprintButton(): dia.Element {
		if (!this.graph) {
			throw `no graph`;
		}
		
		const rect = BlackBoxComponent.Rect.Ghost.place(this, "＋");
		rect.attr("draggable", false);
		rect.attr("label/cursor", "pointer");
		rect.attr("label/font-size", "28");
		rect.attr("body/cursor", "pointer");

		const that = this;
		rect.on("pointerup", function (evt: Event, x: number, y: number) {
			that.landscape.createBlueprint({
				fullName: `Unnamed${new Date().getTime()}`,
				type: BlueprintType.Local
			}).open();
		});

		return rect;
	}

	private createSlangLogo(): dia.Element {
		if (!this.graph) {
			throw `no graph`;
		}

		let image = new shapes.basic.Image({
			size: {
				width: 177,
				height: 203
			},
			attrs: {
				image: {
					"xlink:href": "https://files.bitspark.de/slang2.png",
					width: 177,
					height: 203,
					cursor: "default"
				}
			}
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
		this.blueprintRects.set(blueprint.getFullName(), blueprintBox.getShape());

		// JointJS -> Model
		blueprintBox.on("pointerup", function (evt: Event, x: number, y: number) {
			blueprint.open();
		});
	}

}