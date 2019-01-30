import m from "mithril";
import {dia, g, shapes} from "jointjs";
import {BlackBox} from "../../custom/nodes";
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";
import {PortGroupComponent} from "./port-group";
import {Styles} from "../../../styles/studio";
import {AttachableComponent, CellComponent, XY} from "./base";
import {PaperView} from "../views/paper-view";
import {Tk} from "./toolkit";
import Button = Tk.Button;
import {SlangSubject} from "../../custom/events";
import RectangleSelectors = shapes.standard.RectangleSelectors;
import {componentFactory} from "./factory";
import {PortModel} from "../../model/port";


function createPortGroups(paperView: PaperView, blackBox: BlackBox): Array<PortGroupComponent> {
	const portGroups: Array<PortGroupComponent> = [];

	const portIn = blackBox.getPortIn();
	if (portIn) {
		portGroups.push(new PortGroupComponent(paperView, "MainIn", portIn, "top", 0.0, 1.0));
	}

	const portOut = blackBox.getPortOut();
	if (portOut) {
		portGroups.push(new PortGroupComponent(paperView, "MainOut", portOut, "bottom", 0.0, 1.0));
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
				portGroups.push(new PortGroupComponent(paperView, `Delegate${delegate.getName()}Out`, portOut, "right", posRight, widthRight));
			}
			posRight += stepRight;

			const portIn = delegate.getPortIn();
			if (portIn) {
				portGroups.push(new PortGroupComponent(paperView, `Delegate${delegate.getName()}In`, portIn, "right", posRight, widthRight));
			}
			posRight += stepRight;
		} else {
			const portOut = delegate.getPortOut();
			if (portOut) {
				portGroups.push(new PortGroupComponent(paperView, `Delegate${delegate.getName()}Out`, portOut, "left", posLeft, widthLeft));
			}
			posLeft += stepLeft;

			const portIn = delegate.getPortIn();
			if (portIn) {
				portGroups.push(new PortGroupComponent(paperView, `Delegate${delegate.getName()}In`, portIn, "left", posLeft, widthLeft));
			}
			posLeft += stepLeft;
		}

		// right = !right;
	}

	return portGroups;
}

export abstract class BlackBoxComponent extends CellComponent {
	protected shape!: BlackBoxShape;
	protected portGroups!: Array<PortGroupComponent>;

	private portMouseEntered = new SlangSubject<{ port: PortModel, x: number, y: number }>("port-mouseentered");
	private portMouseLeft = new SlangSubject<{ port: PortModel, x: number, y: number }>("port-mouseleft");

	private clicked = new SlangSubject<{ event: MouseEvent, x: number, y: number }>("clicked");
	private dblclicked = new SlangSubject<{ event: MouseEvent, x: number, y: number }>("dblclicked");

	protected constructor(paperView: PaperView, private readonly drawGenerics: boolean) {
		super(paperView, {x: 0, y: 0});
	}

	protected abstract createPortGroups(): Array<PortGroupComponent>;

	protected abstract createShape(): BlackBoxShape;

	protected attachPortEvents(blackbox: BlackBox) {
		this.shape.on("port:mouseover",
			(cellView: dia.CellView, event: MouseEvent, x: number, y: number, portId: string) => {
				const port = blackbox.findNodeById(portId);
				if (port) {
					this.portMouseEntered.next({port: port as PortModel, x, y});
				}
			});
		this.shape.on("port:mouseout",
			(cellView: dia.CellView, event: MouseEvent, x: number, y: number, portId: string) => {
				const port = blackbox.findNodeById(portId);
				if (port) {
					this.portMouseLeft.next({port: port as PortModel, x, y});
				}
			});
	}

	public refresh(): void {
		this.portGroups = this.createPortGroups();
		if (this.shape) {
			this.shape.remove();
		}
		this.shape = this.createShape();
		this.portGroups.forEach(group => {
			group.setParent(this.shape, this.drawGenerics);
		});

		this.shape.on("pointerclick",
			(cellView: dia.CellView, event: MouseEvent, x: number, y: number) => {
				this.clicked.next({event, x, y});
			});
		this.shape.on("pointerdblclick",
			(cellView: dia.CellView, event: MouseEvent, x: number, y: number) => {
				this.dblclicked.next({event, x, y});
			});
		this.render();
	}

	public translate(tx: number, ty: number) {
		this.shape.translate(tx, ty);
	}

	public onClick(cb: (event: MouseEvent, x: number, y: number) => void) {
		this.clicked.subscribe(({event, x, y}) => {
			cb(event, x, y);
		});
	}

	public onDblClick(cb: (event: MouseEvent, x: number, y: number) => void) {
		this.dblclicked.subscribe(({event, x, y}) => {
			cb(event, x, y);
		});
	}

	protected updateXY({x, y}: XY) {
		super.updateXY({x, y});
		const {width, height} = this.shape.size();
		this.shape.position(x - width / 2, y - height / 2);
	}

	public get bbox(): g.Rect {
		return this.shape.getBBox();
	}

	public onPortMouseEnter(cb: (port: PortModel, x: number, y: number) => void) {
		this.portMouseEntered.subscribe(({port, x, y}) => {
			cb(port, x, y);
		});
	}

	public onPortMouseLeave(cb: (port: PortModel, x: number, y: number) => void) {
		this.portMouseLeft.subscribe(({port, x, y}) => {
			cb(port, x, y);
		});
	}

	public getShape(): dia.Element {
		return super.getShape() as dia.Element;
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
		this.attachPortEvents(this.blueprint);
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
		return createPortGroups(this.paperView, this.blueprint);
	}

	public getShape(): BlackBoxShape {
		return this.shape;
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
		const blueprint = operator.getBlueprint();

		if (operator.XY) {
			this.updateXY(operator.XY);
		}

		if (this.operatorControl) {
			this.operatorControl.destroy();
		}

		this.operatorControl = this
			.createComponent({x: 0, y: 0, align: "t"})
			.mount({
				view: () => [
					m("", m(Button, {
						tooltip: "Remove operator",
						class: "sl-danger sl-btn-icon",
						onClick: () => {
							operator.destroy();
						},
					}, m("i.fas.fa-times"))),

					!blueprint.isLocal() ? undefined :
						m("", m(Button, {
							tooltip: "Open blueprint",
							class: "sl-btn-icon",
							onClick: () => {
								if (blueprint.isLocal()) {
									operator.getBlueprint().open()
								}
							}
						}, m("i.fas.fa-project-diagram")))
				]
			})
			.attachTo(this.shape, "tl");

		this.shape.on("change:position change:size", () => {
			operator.XY = this.shape.getBBox().center();
		});

		this.shape.set("obstacle", true);
		this.shape.attr("draggable", true);
		this.attachPortEvents(operator);
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
		return createPortGroups(this.paperView, this.operator);
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
	public static place(paperView: PaperView, blueprint: BlueprintModel, position?: g.PlainPoint): BlackBoxShape {
		const shape = new BlueprintBoxComponent(paperView, blueprint).getShape();
		if (position) {
			const {width, height} = shape.size();
			shape.position(position.x - width / 2, position.y - height / 2);
		}

		shape.set("obstacle", true);
		shape.attr("draggable", true);

		return shape;
	}

	public static placeGhost(paperView: PaperView, label: string, position?: g.PlainPoint): BlackBoxShape {
		const shape = new BlackBoxShape({
			id: "",
			label: label,
			position: position,
		});

		shape.set("obstacle", true);
		shape.attr("draggable", false);

		paperView.renderCell(shape);
		return shape;
	}

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
