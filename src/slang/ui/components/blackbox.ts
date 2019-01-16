import m from "mithril";
import {dia, g, shapes} from "jointjs";
import {BlackBox} from "../../custom/nodes";
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";
import {PortGroupComponent} from "./port-group";
import {Styles} from "../../../styles/studio";
import {AttachableComponent, ElementComponent} from "./base";
import {PaperView} from "../views/paper-view";
import {Tk} from "./toolkit";
import Button = Tk.Button;
import {SlangSubjectTrigger} from "../../custom/events";

export class BlackBoxComponent extends ElementComponent {
	protected shape: BlackBoxComponent.Rect;
	protected portGroups: Array<PortGroupComponent>;

	private clicked = new SlangSubjectTrigger("clicked");

	constructor(paperView: PaperView, protected readonly blackBox: BlackBox, protected readonly drawGenerics: boolean) {
		super(paperView, {x: 0, y: 0});
		this.portGroups = BlackBoxComponent.createPortGroups(this.blackBox);
		this.shape = this.createShape(this.blackBox, this.portGroups);
		this.refresh();
	}

	protected createShape(blackBox: BlackBox, portGroups: Array<PortGroupComponent>): BlackBoxComponent.Rect {
		return new BlackBoxComponent.Rect(blackBox, portGroups)
	}

	public refresh(): void {
		this.portGroups = BlackBoxComponent.createPortGroups(this.blackBox);

		if (this.shape) {
			this.shape.remove();
			this.shape = this.createShape(this.blackBox, this.portGroups);
			this.shape.on("pointerclick", () => {
				this.clicked.next();
			});
		}

		this.portGroups.forEach(group => {
			group.setParent(this.shape, this.drawGenerics);
		});
		this.render();
	}

	public translate(tx: number, ty: number) {
		this.shape.translate(tx, ty);
	}

	public onClick(handler: Function) {
		this.clicked.subscribe(() => handler());
	}

	private static createPortGroups(blackBox: BlackBox): Array<PortGroupComponent> {
		const portGroups: Array<PortGroupComponent> = [];

		const portIn = blackBox.getPortIn();
		if (portIn) {
			portGroups.push(new PortGroupComponent("MainIn", portIn, "top", 0.0, 1.0));
		}

		const portOut = blackBox.getPortOut();
		if (portOut) {
			portGroups.push(new PortGroupComponent("MainOut", portOut, "bottom", 0.0, 1.0));
		}

		const delegates = Array.from(blackBox.getDelegates());

		// const countRight = Math.ceil(delegates.length / 2);
		const countRight = delegates.length;
		const widthRight = 0.5 / countRight;
		const stepRight = 0.5 / countRight;
		let posRight = 0;

		const countLeft = Math.floor(delegates.length / 2);
		const widthLeft = 0.5 / countLeft;
		const stepLeft = 0.5 / countLeft;
		let posLeft = 0;

		let right = true;
		for (const delegate of delegates) {
			if (right) {
				const portOut = delegate.getPortOut();
				if (portOut) {
					portGroups.push(new PortGroupComponent(`Delegate${delegate.getName()}Out`, portOut, "right", posRight, widthRight));
				}
				posRight += stepRight;

				const portIn = delegate.getPortIn();
				if (portIn) {
					portGroups.push(new PortGroupComponent(`Delegate${delegate.getName()}In`, portIn, "right", posRight, widthRight));
				}
				posRight += stepRight;
			} else {
				const portOut = delegate.getPortOut();
				if (portOut) {
					portGroups.push(new PortGroupComponent(`Delegate${delegate.getName()}Out`, portOut, "left", posLeft, widthLeft));
				}
				posLeft += stepLeft;

				const portIn = delegate.getPortIn();
				if (portIn) {
					portGroups.push(new PortGroupComponent(`Delegate${delegate.getName()}In`, portIn, "left", posLeft, widthLeft));
				}
				posLeft += stepLeft;
			}

			// right = !right;
		}

		return portGroups;
	}

}

export class BlueprintBoxComponent extends BlackBoxComponent {

	constructor(paperView: PaperView, blueprint: BlueprintModel) {
		super(paperView, blueprint, false);

		this.shape.attr({
			body: {
				cursor: "pointer",
			},
			label: {
				cursor: "pointer",
			}
		});
		this.shape.attr("draggable", false);
	}

}

export class OperatorBoxComponent extends BlackBoxComponent {
	private operatorControl?: AttachableComponent;

	constructor(paperView: PaperView, operator: OperatorModel) {
		super(paperView, operator, true);
		operator.subscribeChanged(() => this.refresh());
	}

	public refresh(): void {
		super.refresh();

		const operator = this.blackBox as OperatorModel;

		if (operator.XY) {
			this.updateXY(operator.XY);
		}

		if (this.operatorControl) {
			this.operatorControl.destroy();
		}

		this.operatorControl = this
			.createComponent({x: 0, y: 0, align: "c"})
			.mount("", {
				view: () => m(Button, {
					tooltip: "Remove operator",
					class: "sl-danger sl-btn-icon",
					onClick: () => {
						operator.destroy();
					},
				}, m("i.fas.fa-times"))
			})
			.attachTo(this.shape, "tl");

		this.shape.attr("label/text", (this.blackBox as OperatorModel).getDisplayName());
		this.shape.on("change:position change:size", () => {
			operator.XY = this.shape.position()
		});
	}

}

export namespace BlackBoxComponent {
	import RectangleSelectors = shapes.standard.RectangleSelectors;

	interface BasicAttrs {
		id?: string
		label: string
		portGroups?: Array<PortGroupComponent>
		cssClass?: string
		position?: { x: number, y: number }
	}

	function constructRectAttrs(attrs: BasicAttrs): dia.Element.GenericAttributes<RectangleSelectors> {
		let pos = attrs.position;
		if (pos) {
			const {width, height} = Styles.BlackBox.size;
			pos = {x: pos.x - width / 2, y: pos.y - height / 2};
		}

		return {
			id: attrs.id,
			position: pos,
			attrs: {
				root: {
					class: "joint-cell joint-element sl-blackbox",
				},
				label: {
					text: attrs.label,
				},
			},
			ports: !attrs.portGroups ? undefined : {
				groups: attrs.portGroups!
					.reduce((result: { [key: string]: dia.Element.PortGroup }, group) => {
						result[group.getName()] = group.getPortGroupElement();
						return result;
					}, {})
			}
		};
	}

	export class Rect extends shapes.standard.Rectangle.define("BlackBoxRect", Styles.Defaults.BlackBox) {
		public static place(paperView: PaperView, blueprint: BlueprintModel, position?: g.PlainPoint): Rect {
			const bbRect = new BlueprintBoxComponent(paperView, blueprint).getShape();
			if (position) {
				const {width, height} = bbRect.size();
				bbRect.position(position.x - width / 2, position.y - height / 2);
			}
			return bbRect;
		}

		constructor(blackBox: BlackBox, portGroups: Array<PortGroupComponent>, position?: g.PlainPoint) {
			super(constructRectAttrs({
				id: blackBox.getIdentity(),
				label: blackBox.getDisplayName(),
				position,
				portGroups
			}) as any);
			this.set("obstacle", true);
			this.attr("draggable", true);
		}
	}

	export namespace Rect {
		export class Ghost extends shapes.standard.Rectangle.define("BlackBoxGhost", Styles.Defaults.BlackBox) {
			public static place(paperView: PaperView, label: string, position?: g.PlainPoint): Rect.Ghost {
				const ghost = new Ghost(label, position);
				paperView.renderCell(ghost);
				return ghost;
			}

			constructor(label: string, position?: g.PlainPoint) {
				super(constructRectAttrs({
					label,
					position,
				}) as any);
				this.set("obstacle", true);
				this.attr("draggable", false);
			}
		}
	}
}
