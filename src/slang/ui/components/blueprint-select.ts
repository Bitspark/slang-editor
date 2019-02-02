import m from "mithril";
import {ClassComponent, CVnode} from "mithril";

import {BlueprintModel} from "../../model/blueprint";
import {LandscapeModel} from "../../model/landscape";
import {OperatorGeometry, XY} from "../../model/operator";
import {BlueprintView} from "../views/blueprint";
import {AttachableComponent, CellComponent} from "./base";
import {BlackBoxShape} from "./blackbox";
import {MithrilKeyboardEvent, MithrilMouseEvent, Tk} from "./toolkit";

import ListHead = Tk.ListHead;
import StringInput = Tk.StringInput;
import ListItem = Tk.ListItem;
import List = Tk.List;
import Box = Tk.Box;

export interface Attrs {
	onSelect: (bp: BlueprintModel) => void;
	onHover: (bp?: BlueprintModel) => void;
	onFilter: (filter: string) => void;
	onExit: () => void;
	onLoad: () => BlueprintModel[];
}

class BlueprintMenuComponent implements ClassComponent<Attrs> {
	public menuSliceSize: number = 16;
	public activeMenuItemIdx: number = -1;
	public menuSliceStartIdx: number = 0;
	public menuSliceEndIdx: number = 0;

	// Note that class methods cannot infer parameter types
	public oninit({}: CVnode<Attrs>) {
	}

	public setMenuSlice(menuTotalSize: number) {
		if (this.menuSliceStartIdx <= this.activeMenuItemIdx && this.activeMenuItemIdx <= this.menuSliceEndIdx) {
			return;
		}

		if (this.activeMenuItemIdx < this.menuSliceStartIdx) {
			this.menuSliceStartIdx = Math.max(0, this.menuSliceStartIdx - 1);
		} else if (this.activeMenuItemIdx > this.menuSliceEndIdx) {
			this.menuSliceStartIdx = Math.max(0, this.menuSliceStartIdx + 1);
		}

		this.menuSliceEndIdx = Math.min(menuTotalSize - 1, this.menuSliceStartIdx + this.menuSliceSize);
	}

	public view({attrs}: CVnode<Attrs>) {
		const blueprints = attrs.onLoad();
		const menuTotalSize = blueprints.length;

		this.setMenuSlice(menuTotalSize);

		if (menuTotalSize === 1) {
			this.activeMenuItemIdx = 0;
		}

		return m(".sl-blupr-menu", {
				onmousewheel: (e: WheelEvent) => {
					e.preventDefault();
					if (e.deltaY < 0) {
						this.activeMenuItemIdx = Math.max(0, this.activeMenuItemIdx - 1);
					} else {
						this.activeMenuItemIdx = Math.min(this.activeMenuItemIdx + 1, menuTotalSize - 1);
					}
					e.stopPropagation();
				},
				onkeydown: (e: MithrilKeyboardEvent) => {
					switch (e.key) {
						case "ArrowUp":
							this.activeMenuItemIdx = Math.max(0, this.activeMenuItemIdx - 1);
							attrs.onHover(blueprints[this.activeMenuItemIdx]);
							break;
						case "ArrowDown":
							this.activeMenuItemIdx = Math.min(this.activeMenuItemIdx + 1, menuTotalSize - 1);
							attrs.onHover(blueprints[this.activeMenuItemIdx]);
							break;
						case "Enter":
							attrs.onSelect(blueprints[this.activeMenuItemIdx]);
							break;
						case "Escape":
							attrs.onExit();
							break;
					}
				},
			},
			m(List, {
					onMouseLeave: (e: MithrilMouseEvent) => {
						e.redraw = false;
						attrs.onHover(undefined);
					},
				},
				m(ListHead, {},
					m(StringInput, {
						class: "sl-fullwidth",
						label: "",
						onInput: (f: string) => {
							this.activeMenuItemIdx = -1;
							attrs.onFilter(f.trim());
						},
						autofocus: true,
					}),
				),

				blueprints.slice(this.menuSliceStartIdx, this.menuSliceEndIdx + 1).map((blueprint: BlueprintModel, i: number) => {
					return m(ListItem, {
							class: (this.activeMenuItemIdx - this.menuSliceStartIdx === i ? "highlighted" : ""),
							onClick: (e: MithrilMouseEvent) => {
								e.redraw = false;
								attrs.onSelect(blueprint);
							},
							onMouseEnter: () => {
								this.activeMenuItemIdx = i + this.menuSliceStartIdx;
								attrs.onHover(blueprint);
							},
							onMouseLeave: () => attrs.onHover(undefined),
						},
						m(".sl-blupr-title", blueprint.getFullName()));
				}),
			),
		);
	}
}

export class BlueprintSelectComponent extends CellComponent {
	protected shape: BlackBoxShape;
	private readonly blueprint: BlueprintModel;
	private readonly landscape: LandscapeModel;
	private readonly menu: AttachableComponent;
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
					onExit: () => {
						this.destroy();
					},
					onSelect: (bp: BlueprintModel) => {
						const position = this.shape.getBBox().center();
						const geo: OperatorGeometry = {position};
						this.blueprint.createBlankOperator(bp, geo);
						this.destroy();
					},
					onHover: (bp?: BlueprintModel) => {
						const xy = this.shape.getBBox().center();
						this.shape = this.placeGhostRect(xy, bp);
					},
				})),
			});
	}

	public destroy() {
		super.destroy();
		this.menu.destroy();
	}

	private isFilterExprIncluded(blueprint: BlueprintModel): boolean {
		return this.filterExpr === "" || blueprint.getFullName().toLowerCase().includes(this.filterExpr.toLowerCase());
	}

	private getBlueprints(): BlueprintModel[] {
		const blueprintsMap = new Map<BlueprintModel, number>();
		for (const op of this.blueprint.getOperators()) {
			const bp = op.getBlueprint();
			const v = blueprintsMap.get(bp);
			const cnt: number = (v) ? v : 0;
			blueprintsMap.set(bp, cnt + 1);
		}

		const blueprints: BlueprintModel[] = Array.from(blueprintsMap.entries())
			.filter(([bp]: [BlueprintModel, number]) => this.isFilterExprIncluded(bp))
			.sort((a: [BlueprintModel, number], b: [BlueprintModel, number]) => a[1] - b[1])
			.map(([bp]: [BlueprintModel, number]) => bp);

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

	private placeGhostRect({}: XY, blueprint?: BlueprintModel): BlackBoxShape {
		if (this.shape) {
			this.shape.remove();
		}

		let ghostRect: BlackBoxShape;

		if (!blueprint) {
			ghostRect = BlackBoxShape.placeGhost(this.paperView, "• • •", this.position);
		} else {
			ghostRect = BlackBoxShape.place(this.paperView, blueprint, this.position);
		}
		return ghostRect;
	}
}
