import m from 'mithril';
import {AnchorComponent, AnchorPosition} from "./anchor";
import {Styles} from "../../../styles/studio";
import {BlackBox} from "../../custom/nodes";
import {dia, g, layout, shapes} from "jointjs";
import {BlueprintView} from "../views/blueprint";
import {BlueprintInstanceAccess, BlueprintModel} from "../../model/blueprint";
import {BlackBoxComponent} from "./blackbox";
import {ClassComponent, CVnode} from "mithril";

export namespace WhiteBox {
	import RectangleSelectors = shapes.standard.RectangleSelectors;

	interface Size {
		width: number,
		height: number
	}

	interface BasicAttrs {
		id?: string
		cssClass?: string
		size: Size
	}

	interface Inner {
		operators: Array<BlackBoxComponent>
		ports: {
			t: Array<dia.Element>
			b: Array<dia.Element>
			l: Array<dia.Element>
			r: Array<dia.Element>
		}
	}

	export class Component extends AnchorComponent {
		private static readonly padding = 120;
		private static readonly minimumSpace = 10;

		// move all component specific code from BlueprintView to this class
		public shape: Shape;
		protected blueprint: BlueprintModel;

		constructor(blueprintView: BlueprintView) {
			super(blueprintView, {x: 0, y: 0});

			this.blueprint = blueprintView.getBlueprint();
			this.blueprint.subscribeDeployed((instanceAcess: BlueprintInstanceAccess) => {
				m.mount(this.htmlRoot, {
					view: () => m(".toolbox", [
						m(Tool.Button, {
							onClick: () => {
								window.open(instanceAcess.url, "_blank");
							},
							label: "Running",
							icon: "X",
							class: "running"
						}),
						m(Tool.Button, {
							onClick: () => {
							},
							label: "Running",
							icon: "S",
							class: "stop"
						}),
					])
				})
			});


			const size = {
				width: Component.padding * 2 + Component.minimumSpace,
				height: Component.padding * 2 + Component.minimumSpace
			};
			this.shape = new WhiteBox.Shape(this.blueprint, size);
			this.shape.addTo(this.graph);
			this.shape.on("change:position change:size", () => {
				const {x, y} = this.shape.position();
				const {width, height} = this.shape.size();
				this.updatePosition({x: x + width * .7, y});
			});

			m.mount(this.htmlRoot, {
				view: () => m(Tool.Button, {
					onClick: () => {
						this.blueprint.deploy();
					},
					label: "Deploy",
					icon: "D",
					class: "dply"
				})
			});
		}

		public autoLayout({operators, ports}: Inner) {
			layout.DirectedGraph.layout(this.graph, {
				nodeSep: 120,
				rankSep: 120,
				edgeSep: 0,
				rankDir: "TB",
				resizeClusters: false,
			});

			let boundingBox = this.graph.getCellsBBox(operators.map(operator => operator.getRectangle()))!;

			operators.forEach(operator => {
				operator.translate(-(boundingBox.x + boundingBox.width / 2), -(boundingBox.y + boundingBox.height / 2));
			});

			if (!boundingBox) {
				boundingBox = new g.Rect({x: 0, y: 0, width: Component.minimumSpace, height: Component.minimumSpace});
			}

			boundingBox.x -= boundingBox.x + boundingBox.width / 2;
			boundingBox.y -= boundingBox.y + boundingBox.height / 2;

			// Center ports

			const padding = Component.padding;

			for (const port of ports.t) {
				port.set({
					position: {
						x: boundingBox.x - 50 + boundingBox.width / 2,
						y: boundingBox.y - 100 - padding,
					}
				});
			}

			for (const port of ports.b) {
				port.set({
					position: {
						x: boundingBox.x - 50 + boundingBox.width / 2,
						y: boundingBox.y + boundingBox.height + padding,
					}
				});
			}

			const offset = boundingBox.y + (boundingBox.height - ports.r.length * 100) / 2;
			ports.r.forEach((port, index) => {
				port.set({
					position: {
						x: boundingBox.x + boundingBox.width + padding,
						y: offset + index * 100,
					}
				});
			});
		}

		public fitOuter(animation: boolean, {operators, ports}: Inner) {
			const padding = Component.padding;
			const currentPosition = this.shape.get("position");
			const currentSize = this.shape.get("size");

			let newX: number = currentPosition.x + padding;
			let newY: number = currentPosition.y + padding;
			let newCornerX: number = currentPosition.x + currentSize.width - 2 * padding;
			let newCornerY: number = currentPosition.y + currentSize.height - 2 * padding;

			operators.forEach(operator => {
				const childBBox = operator.getBBox();
				if (childBBox.x < newX) {
					newX = childBBox.x;
				}
				if (childBBox.y < newY) {
					newY = childBBox.y;
				}
				const corner = childBBox.corner();
				if (corner.x > newCornerX) {
					newCornerX = corner.x;
				}
				if (corner.y > newCornerY) {
					newCornerY = corner.y;
				}
			});

			const set = {
				position: {x: 0, y: 0},
				size: {width: 0, height: 0},
			};

			set.position.x = newX - padding;
			set.position.y = newY - padding;
			set.size.width = newCornerX - newX + 2 * padding;
			set.size.height = newCornerY - newY + 2 * padding;

			let newPosition = {x: currentPosition.x, y: currentPosition.y};
			let newSize = {width: currentPosition.width, height: currentPosition.height};

			if (currentPosition.x <= set.position.x && currentPosition.y <= set.position.y) {
				delete set.position;
			} else {
				if (currentPosition.x <= set.position.x) {
					set.position.x = currentPosition.x;
				} else if (currentPosition.y <= set.position.y) {
					set.position.y = currentPosition.y;
				}
				const deltaX = currentPosition.x - set.position.x;
				const deltaY = currentPosition.y - set.position.y;
				set.size.width = Math.max(set.size.width, currentSize.width + deltaX);
				set.size.height = Math.max(set.size.height, currentSize.height + deltaY);
				newPosition = set.position;
				newSize = set.size;
			}

			if (set.size.width <= currentSize.width && set.size.height <= currentSize.height) {
				delete set.size;
			} else {
				if (set.size.width <= currentSize.width) {
					set.size.width = currentSize.width;
				} else if (set.size.height <= currentSize.height) {
					set.size.height = currentSize.height;
				}
				newSize = set.size;
			}

			if (!!set.position || !!set.size) {
				if (!animation) {
					this.shape.set(set);
				} else {
					if (!!set.size) {
						this.shape.transition("size/height", set.size.height);
						this.shape.transition("size/width", set.size.width);
					}
					if (!!set.position) {
						this.shape.transition("position/x", set.position.x);
						this.shape.transition("position/y", set.position.y);
					}
				}

				for (const port of ports.t) {
					const currentPortPosition = port.get("position");
					port.set({
						position: {
							x: currentPortPosition.x,
							y: newPosition.y - 100,
						}
					});
				}

				for (const port of ports.b) {
					const currentPortPosition = port.get("position");
					port.set({
						position: {
							x: currentPortPosition.x,
							y: newPosition.y + newSize.height,
						}
					});
				}

				ports.r.forEach(port => {
					const currentPortPosition = port.get("position");
					port.set({
						position: {
							x: newPosition.x + newSize.width,
							y: currentPortPosition.y,
						}
					});
				});
			}
		}
	}

	function constructRectAttrs({id, cssClass, size}: BasicAttrs): dia.Element.GenericAttributes<RectangleSelectors> {
		const {width, height} = size;
		const position = {x: -width / 2, y: -height / 2};

		return {
			id,
			position,
			z: -2,
			attrs: {
				root: {
					class: "joint-cell joint-element sl-blackbox ${cssClass}",
				},
			},
		}
	}

	export class Shape extends shapes.standard.Rectangle.define("WhiteBox", Styles.Defaults.Outer) {
		constructor(blackBox: BlackBox, size: Size) {
			super(constructRectAttrs({
				id: `${blackBox.getIdentity()}_outer`,
				size,
			}) as any);
			this.attr("draggable", false);
			this.set("obstacle", false);
		}
	}

	export namespace Tool {
		export interface Attrs {
			onClick: () => void
			label: string
			icon: string
			class: string
		}

		export class Button implements ClassComponent<Attrs> {
			private alreadyClicked: boolean = false;
			private bounceInterval = 500;

			oninit({attrs}: CVnode<Attrs>) {
			}

			view({attrs}: CVnode<Attrs>) {
				return m("a.btn.sl-tool-btn", {
						class: attrs.class,
						onclick: () => {
							if (!this.alreadyClicked) {
								this.alreadyClicked = true;
								attrs.onClick();
								const that = this;
								setTimeout(() => {
									that.alreadyClicked = false;
								}, this.bounceInterval);
							}
						},
						tooltip: attrs.label,
					},
					attrs.icon);
			}
		}
	}
}
