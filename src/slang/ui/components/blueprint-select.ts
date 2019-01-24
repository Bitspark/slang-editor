import m from "mithril";

import {LandscapeModel} from "../../model/landscape";
import {BlueprintModel} from "../../model/blueprint";
import {ClassComponent, CVnode} from "mithril";
import {BlueprintView} from "../views/blueprint";
import {Geometry} from "../../model/operator";
import {AttachableComponent, CellComponent, XY} from "./base";
import {MithrilMouseEvent, Tk} from "./toolkit";
import ListHead = Tk.ListHead;
import StringInput = Tk.StringInput;
import ListItem = Tk.ListItem;
import List = Tk.List;
import {BlackBoxComponent, BlackBoxShape} from "./blackbox";
import Box = Tk.Box;

export interface Attrs {
	onSelect: (bp: BlueprintModel) => void,
	onHover: (bp?: BlueprintModel) => void,
	onFilter: (filter: string) => void,
	onLoad: () => Array<BlueprintModel>
}

class BlueprintMenuComponent implements ClassComponent<Attrs> {
	// Note that class methods cannot infer parameter types
	oninit({attrs}: CVnode<Attrs>) {
	}

	view({attrs}: CVnode<Attrs>) {
		const blueprints = attrs.onLoad();


		return m(".sl-blupr-menu",
			m(List, {
					onMouseLeave: (e: MithrilMouseEvent) => {
						e.redraw = false;
						attrs.onHover(undefined);
					}
				},
				m(ListHead, {},
					m(StringInput, {
						class: "sl-fullwidth",
						label: "",
						onInput: function (f: string) {
							attrs.onFilter(f.trim());
						},
						autofocus: true,
					}),
				),

				blueprints.map((blueprint: BlueprintModel) => {
					return m(ListItem, {
							//class: ".sl-blupr-entry",
							onClick: (e: MithrilMouseEvent) => {
								e.redraw = false;
								attrs.onSelect(blueprint);
							},
							onMouseEnter: (e: MithrilMouseEvent) => {
								e.redraw = false;
								attrs.onHover(blueprint);
							},
							onMouseLeave: (e: MithrilMouseEvent) => {
								e.redraw = false;
								attrs.onHover(undefined);
							}
						},
						m(".sl-blupr-title", blueprint.getFullName()));
				})
			)
		);
	}
}

export class BlueprintSelectComponent extends CellComponent {
	private readonly blueprint: BlueprintModel;
	private readonly landscape: LandscapeModel;
	private readonly menu: AttachableComponent;
	protected shape: BlackBoxShape;
	private filterExpr: string = "";

	constructor(blueprintView: BlueprintView, {x, y}: XY) {
		super(blueprintView, {x, y});
		this.blueprint = blueprintView.getBlueprint();
		this.landscape = this.blueprint.getAncestorNode(LandscapeModel)!;
		this.shape = this.placeGhostRect({x, y});
		this.menu = this.createComponent({x: 0, y: 0, align: "tl"})
			.attachTo(this.shape, "c")
			.mount({
				view: () => m(Box, m(BlueprintMenuComponent, {
					onLoad: () => this.getBlueprints(),
					onFilter: (fltrExpr: string) => {
						this.filterExpr = fltrExpr;
					},
					onSelect: (bp: BlueprintModel) => {
						const xy = this.shape.getBBox().center();
						const geo: Geometry = {xy};
						this.blueprint.createBlankOperator(bp, geo);
						this.destroy();
					},
					onHover: (bp?: BlueprintModel) => {
						const xy = this.shape.getBBox().center();
						this.shape = this.placeGhostRect(xy, bp);
					}
				}))
			});
	}

	public destroy() {
		super.destroy();
		this.menu.destroy();
	}

	private isFilterExprIncluded(blueprint: BlueprintModel): boolean {
		return this.filterExpr === "" || blueprint.getFullName().toLowerCase().includes(this.filterExpr.toLowerCase());
	}

	private getBlueprints(): Array<BlueprintModel> {
		const blueprintsMap = new Map<BlueprintModel, number>();
		for (const op of this.blueprint.getOperators()) {
			const bp = op.getBlueprint();
			const v = blueprintsMap.get(bp);
			const cnt: number = (v) ? v : 0;
			blueprintsMap.set(bp, cnt + 1);
		}

		const blueprints: Array<BlueprintModel> = Array.from(blueprintsMap.entries())
			.filter(([bp, _]: [BlueprintModel, number]) => this.isFilterExprIncluded(bp))
			.sort((a: [BlueprintModel, number], b: [BlueprintModel, number]) => a[1] - b[1])
			.map(([bp, _]: [BlueprintModel, number]) => bp);

		for (const bp of this.landscape.getChildNodes(BlueprintModel)) {
			if (blueprints.length < 60) {
				if (this.isFilterExprIncluded(bp)) {
					if (blueprints.indexOf(bp) < 0) {
						blueprints.push(bp);
					}
				}
			} else {
				break;
			}
		}
		return blueprints;
	}

	private placeGhostRect({x, y}: XY, blueprint?: BlueprintModel): BlackBoxShape {
		if (this.shape) {
			this.shape.remove();
		}

		let ghostRect: BlackBoxShape;

		if (!blueprint) {
			ghostRect = BlackBoxShape.placeGhost(this.paperView, "• • •", this.XY);
		} else {
			ghostRect = BlackBoxShape.place(this.paperView, blueprint, this.XY);
		}
		return ghostRect;
	}
}
