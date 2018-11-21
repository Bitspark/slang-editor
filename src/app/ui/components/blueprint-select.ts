import m, {CVnodeDOM} from "mithril";

import {LandscapeModel} from "../../model/landscape";
import {BlueprintModel} from "../../model/blueprint";
import {ClassComponent, CVnode} from "mithril";
import {BlueprintView} from "../views/blueprint";
import {Geometry} from "../../model/operator";
import {BlackBoxComponent} from "./blackbox";
import {AttachedComponent, Component, XY} from "./base";
import {StringInput} from "./toolkit";

export interface Attrs {
	onSelect: (bp: BlueprintModel) => void,
	onHover: (bp?: BlueprintModel) => void,
	onFilter: (filter: string) => void,
	onLoad: () => Array<BlueprintModel>
}

export interface MithrilMouseEvent extends MouseEvent {
	redraw: boolean
}

class BlueprintMenuComponent implements ClassComponent<Attrs> {
	// Note that class methods cannot infer parameter types
	oninit({attrs}: CVnode<Attrs>) {
	}

	onbeforeupdate(vnode: CVnode<Attrs>, old: CVnodeDOM<Attrs>): boolean | void {
		return true;
	}

	view({attrs}: CVnode<Attrs>) {
		const blueprints = attrs.onLoad();
		return m(".sl-blupr-menu", {
				onmouseleave: (e: MithrilMouseEvent) => {
					e.redraw = false;
					attrs.onHover(undefined);
				}
			},
			[
				m(StringInput, {
					class: "sl-blupr-fltr sl-fullwidth",
					label: "",
					onInput: function (f: string) {
						attrs.onFilter(f.trim());
					},
					autofocus: true,
				}),
				m(".sl-blupr-entries",
					blueprints.length ? blueprints.map((blueprint: BlueprintModel) => {
						return m(".sl-blupr-entry", {
								onclick: (e: MithrilMouseEvent) => {
									e.redraw = false;
									attrs.onSelect(blueprint);
								},
								onmouseenter: (e: MithrilMouseEvent) => {
									e.redraw = false;
									attrs.onHover(blueprint);
								},
								onmouseleave: (e: MithrilMouseEvent) => {
									e.redraw = false;
									attrs.onHover(undefined);
								}
							},
							m(".sl-blupr-title", blueprint.getFullName()));
					}) : m(".sl-blupr-entry-none")
				)
			]
		);
	}
}

export class BlueprintSelectComponent extends Component {
	private readonly blueprint: BlueprintModel;
	private readonly landscape: LandscapeModel;
	private readonly menu: AttachedComponent;
	private ghostRect: BlackBoxComponent.Rect | BlackBoxComponent.Rect.Ghost;
	private filterExpr: string = "";

	constructor(blueprintView: BlueprintView, {x, y}: XY) {
		super(blueprintView, {x, y});
		this.blueprint = blueprintView.getBlueprint();
		this.landscape = this.blueprint.getAncestorNode(LandscapeModel)!;
		this.ghostRect = this.placeGhostRect({x, y});
		this.menu = this.createComponent({x: 0, y: 0, align: "tl"})
			.attachTo(this.ghostRect, "c")
			.mount({
				view: () => m(BlueprintMenuComponent, {
					onLoad: () => this.getBlueprints(),
					onFilter: (fltrExpr: string) => {
						this.filterExpr = fltrExpr;
					},
					onSelect: (bp: BlueprintModel) => {
						const pos = this.ghostRect.position();
						const geo: Geometry = {
							position: [pos.x, pos.y]
						};
						this.blueprint.createBlankOperator(bp, geo);
						this.destroy();
					},
					onHover: (bp?: BlueprintModel) => {
						const pos = this.ghostRect.getBBox().center();
						this.ghostRect = this.placeGhostRect(pos, bp);
					}
				})
			});
	}

	public destroy() {
		super.destroy();
		this.menu.destroy();
		this.ghostRect.remove();
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
			if (blueprints.length < 10) {
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

	private placeGhostRect({x, y}: XY, blueprint?: BlueprintModel): BlackBoxComponent.Rect | BlackBoxComponent.Rect.Ghost {
		if (this.ghostRect) {
			this.ghostRect.remove();
		}

		let ghostRect: BlackBoxComponent.Rect | BlackBoxComponent.Rect.Ghost;

		if (!blueprint) {
			ghostRect = BlackBoxComponent.Rect.Ghost.place("• • •", this.getXY());
			ghostRect.addTo(this.graph);
		} else {
			ghostRect = BlackBoxComponent.Rect.place(this.graph, blueprint, this.getXY());
		}
		return ghostRect;
	}
}
