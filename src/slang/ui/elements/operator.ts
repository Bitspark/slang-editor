import {dia, g, shapes} from "jointjs";

import {Styles} from "../../../styles/studio";
import {BlackBoxModel} from "../../core/abstract/blackbox";
import {PortModel} from "../../core/abstract/port";
import {SlangSubject} from "../../core/abstract/utils/events";
import {OperatorModel} from "../../core/models";
import {XY} from "../../definitions/api";
import {Canvas} from "../canvas/base";

import {PortGroupComponent} from "./port-group";
import RectangleSelectors = shapes.standard.RectangleSelectors;
import {BoxCanvasElement} from "./base";

export class OperatorBox extends BoxCanvasElement {
	public get bbox(): g.Rect {
		return this.shape.getBBox();
	}

	protected readonly cssAttr = "root/class";
	protected shape!: BlackBoxShape;
	protected portGroups!: PortGroupComponent[];

	private portMouseEntered = new SlangSubject<{ port: PortModel, x: number, y: number }>("port-mouseentered");
	private portMouseLeft = new SlangSubject<{ port: PortModel, x: number, y: number }>("port-mouseleft");

	constructor(paperView: Canvas, protected readonly operator: OperatorModel ) {
		super(paperView, {x: 0, y: 0});

		operator.getGenerics().subscribeGenericsChanged(() => {
			this.refresh();
		});
		operator.getProperties().subscribeAssignmentChanged(() => {
			this.refresh();
		});

		this.refresh();
	}

	public getModel(): OperatorModel {
		return this.operator;
	}


	public refresh(): void {
		this.portGroups = this.createPortGroups();
		if (this.shape) {
			this.shape.remove();
		}
		this.shape = this.createShape();
		this.portGroups.forEach((group) => {
			group.setParent(this.shape, this.paperView.isEditable);
		});

		const operator = this.operator;
		const view = this.paperView;

		if (operator.xy) {
			this.updateXY(operator.xy);
		}

		this.shape.on("change:position change:size", () => {
			operator.xy = this.shape.getBBox().center();
		});

		this.shape.set("obstacle", true);
		this.shape.attr("draggable", true);

		if (view.isReadOnly) {
			this.shape.attr({
				body: {
					cursor: "default",
				},
				label: {
					cursor: "default",
				},
			});
		}

		this.attachPortEvents(operator);
		this.render();
	}

	public translate(tx: number, ty: number) {
		this.shape.translate(tx, ty);
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

	protected createPortGroups(): PortGroupComponent[] {
		const portGroups: PortGroupComponent[] = [];

		{
			const portIn = this.operator.getPortIn();
			if (portIn) {
				portGroups.push(new PortGroupComponent("MainIn", portIn, "top", 0, 1, true));
			}

			const portOut = this.operator.getPortOut();
			if (portOut) {
				portGroups.push(new PortGroupComponent("MainOut", portOut, "bottom", 0, 1, true));
			}
		}

		const delegates = Array.from(this.operator.getDelegates());

		const countRight = Math.ceil(delegates.length / 2);
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
					portGroups.push(new PortGroupComponent(`Delegate${delegate.getName()}Out`, portOut, "right", posRight, widthRight, true));
				}
				posRight += stepRight;

				const portIn = delegate.getPortIn();
				if (portIn) {
					portGroups.push(new PortGroupComponent(`Delegate${delegate.getName()}In`, portIn, "right", posRight, widthRight, true));
				}
				posRight += stepRight;
			} else {
				const portOut = delegate.getPortOut();
				if (portOut) {
					portGroups.push(new PortGroupComponent(`Delegate${delegate.getName()}Out`, portOut, "left", posLeft, widthLeft, true));
				}
				posLeft += stepLeft;

				const portIn = delegate.getPortIn();
				if (portIn) {
					portGroups.push(new PortGroupComponent(`Delegate${delegate.getName()}In`, portIn, "left", posLeft, widthLeft, true));
				}
				posLeft += stepLeft;
			}

			right = !right;
		}

		return portGroups;
	}

	protected createShape(): BlackBoxShape {
		const blackBoxShapeType = this.paperView.getFactory().getBlackBoxShape(this.operator.getBlueprint());
		const shape = new blackBoxShapeType({
			id: this.operator.getIdentity(),
			position: this.operator.xy,
			portGroups: this.portGroups,
		});
		shape.setupForOperator(this.operator);
		return shape;
	}

	protected attachPortEvents(blackbox: BlackBoxModel) {
		this.shape.on("port:mouseover",
			(_cellView: dia.CellView, _event: MouseEvent, x: number, y: number, portId: string) => {
				const port = blackbox.findNodeById(portId);
				if (port) {
					this.portMouseEntered.next({x, y, port: port as PortModel});
				}
			});
		this.shape.on("port:mouseout",
			(_cellView: dia.CellView, _event: MouseEvent, x: number, y: number, portId: string) => {
				const port = blackbox.findNodeById(portId);
				if (port) {
					this.portMouseLeft.next({x, y, port: port as PortModel});
				}
			});
	}

	protected updateXY({x, y}: XY) {
		super.updateXY({x, y});
		const {width, height} = this.shape.size();
		this.shape.position(x - width / 2, y - height / 2);
	}

}

export interface BlackBoxShapeAttrs {
	id?: string;
	label?: string;
	portGroups?: PortGroupComponent[];
	cssClass?: string;
	position?: { x: number, y: number };
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
				}, {} as { [key: string]: dia.Element.PortGroup }),
		},
	};
}

export class BlackBoxShape extends shapes.standard.Rectangle.define("BlackBox", Styles.Defaults.blackBox) {
	public static placeGhost(paperView: Canvas, label: string, position?: g.PlainPoint): BlackBoxShape {
		const shape = new BlackBoxShape({
			label,
			position,
			id: "",
		});

		shape.set("obstacle", true);
		shape.attr("draggable", false);

		paperView.renderCell(shape);
		return shape;
	}

	constructor(attrs: BlackBoxShapeAttrs) {
		super(constructRectAttrs(attrs) as any);
	}

	public setupForOperator(operator: OperatorModel) {
		this.attr("label/text", operator.getBlueprint().name);
	}
}

export class OperatorBlackBoxShape extends BlackBoxShape {
	constructor(attrs: BlackBoxShapeAttrs) {
		super(attrs);
	}

	public setupForOperator(operator: OperatorModel) {
		this.attr("label/text", operator.getBlueprint().name);

		const portMaxCount = Math.max(...Array.from(operator.getPorts()).map(op=>op.count()))
		const width = (portMaxCount && (portMaxCount+1) * Styles.Port.width > Styles.Defaults.blackBox.size.width) ? (portMaxCount+2) * Styles.Port.width : Styles.Defaults.blackBox.size.width
		const height = Styles.Defaults.blackBox.size.height

		this.resize(width, height);
	}
}
