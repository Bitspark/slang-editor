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
import RectangleSelectors = shapes.standard.RectangleSelectors;
import {componentFactory} from "./factory";


function getBlackBoxShape(blueprint: BlueprintModel): typeof BlackBoxShape {
	return componentFactory.getBlackBoxShape(blueprint);
}

function createPortGroups(blackBox: BlackBox): Array<PortGroupComponent> {
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


export abstract class BlackBoxComponent extends ElementComponent {
	protected shape!: BlackBoxComponent.Rect;
	protected portGroups!: Array<PortGroupComponent>;

	private clicked = new SlangSubjectTrigger("clicked");
	private dblclicked = new SlangSubjectTrigger("dblclicked");

	protected constructor(paperView: PaperView, private readonly drawGenerics: boolean) {
		super(paperView, {x: 0, y: 0});
	}

	protected abstract createPortGroups(): Array<PortGroupComponent>;

	protected abstract createShape(): BlackBoxShape;

	public refresh(): void {
		this.portGroups = this.createPortGroups();
		if (this.shape) {
			this.shape.remove();
		}
		this.shape = this.createShape();
		this.portGroups.forEach(group => {
			group.setParent(this.shape, this.drawGenerics);
		});

		this.shape.on("pointerclick", () => {
			this.clicked.next();
		});
		this.shape.on("pointerdblclick", () => {
			this.dblclicked.next();
		});
		this.render();
	}

	public translate(tx: number, ty: number) {
		this.shape.translate(tx, ty);
	}

	public onClick(handler: Function) {
		this.clicked.subscribe(() => handler());
	}

	public onDblclick(handler: Function) {
		this.dblclicked.subscribe(() => handler());
	}
}

export class BlueprintBoxComponent extends BlackBoxComponent {
	constructor(paperView: PaperView, protected blueprint: BlueprintModel) {
		super(paperView, false);
		this.refresh();
	}

	public refresh(): void {
		super.refresh();

		this.shape.attr("draggable", false);
		this.shape.set("obstacle", true);

		this.shape.attr({
			body: {
				cursor: "pointer",
			},
			label: {
				cursor: "pointer",
			}
		});
	}

	protected createShape(): BlackBoxShape {
		const blackBoxShapeType = componentFactory.getBlackBoxShape(this.blueprint);
		const shape = new blackBoxShapeType({
			id: this.blueprint.getIdentity(),
			portGroups: this.portGroups,
		});
		shape.setupForBlueprint(this.blueprint);
		return shape;
	}

	protected createPortGroups(): Array<PortGroupComponent> {
		return createPortGroups(this.blueprint);
	}

}

export class OperatorBoxComponent extends BlackBoxComponent {
	private operatorControl?: AttachableComponent;

	constructor(paperView: PaperView, protected readonly operator: OperatorModel) {
		super(paperView, true);
		operator.subscribeChanged(() => this.refresh());
		this.refresh();
	}

	public refresh(): void {
		super.refresh();
		const operator = this.operator;

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

		this.shape.on("change:position change:size", () => {
			operator.XY = this.shape.position()
		});

		this.shape.set("obstacle", true);
		this.shape.attr("draggable", true);
	}

	protected createShape(): BlackBoxShape {
		const blackBoxShapeType = componentFactory.getBlackBoxShape(this.operator.getBlueprint());
		const shape = new blackBoxShapeType({
			id: this.operator.getIdentity(),
			position: this.operator.XY,
			portGroups: this.portGroups,
		});
		shape.setupForOperator(this.operator);
		return shape;
	}

	protected createPortGroups(): Array<PortGroupComponent> {
		return createPortGroups(this.operator);
	}
}

export interface BlackBoxShapeAttrs {
	id?: string
	label?: string
	portGroups?: Array<PortGroupComponent>
	cssClass?: string
	position?: { x: number, y: number }
}

function constructRectAttrs(attrs: BlackBoxShapeAttrs): dia.Element.GenericAttributes<RectangleSelectors> {
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


export class BlackBoxShape extends shapes.standard.Rectangle.define("BlackBox", Styles.Defaults.BlackBox) {
	constructor(attrs: BlackBoxShapeAttrs) {
		super(constructRectAttrs(attrs) as any);
	}

	public setupForBlueprint(blueprint: BlueprintModel) {
		this.attr("label/text", blueprint.getShortName());
	}

	public setupForOperator(operator: OperatorModel) {
		this.attr("label/text", operator.getBlueprint().getShortName());
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
