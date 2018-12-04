import {dia, g, shapes} from "jointjs";
import {BlackBox} from "../../custom/nodes";
import {BlueprintModel} from "../../model/blueprint";
import {OperatorModel} from "../../model/operator";
import {PortGroupComponent} from "./port-group";
import {Styles} from "../../../styles/studio";
import {AttachedComponent, Component} from "./base";
import {PaperView} from "../views/paper-view";

export class BlackBoxComponent extends Component {

	protected rectangle: BlackBoxComponent.Rect;
	protected portGroups: Array<PortGroupComponent>;

	constructor(paperView: PaperView, private readonly blackBox: BlackBox) {
		super(paperView, {x: 0, y: 0});
		this.portGroups = BlackBoxComponent.createGroups(this.blackBox);

		this.rectangle = new BlackBoxComponent.Rect(this.blackBox, this.portGroups);
		this.paperView.renderCell(this.rectangle);

		this.portGroups.forEach(group => {
			group.setParent(this.rectangle);
		});
	}

	public getBBox(): g.Rect {
		return this.rectangle.getBBox();
	}

	public translate(tx: number, ty: number) {
		this.rectangle.translate(tx, ty);
	}

	public getRectangle(): BlackBoxComponent.Rect {
		return this.rectangle;
	}

	public on(event: string, handler: Function) {
		this.rectangle.on(event, handler);
	}

	public remove(): void {
		this.rectangle.remove();
	}

	private static createGroups(blackBox: BlackBox): Array<PortGroupComponent> {
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

		const width = 0.5 / delegates.length;
		const step = 0.5 / delegates.length;
		let pos = 0;
		for (const delegate of delegates) {
			const portOut = delegate.getPortOut();
			if (portOut) {
				portGroups.push(new PortGroupComponent(`Delegate${delegate.getName()}Out`, portOut, "right", pos, width));
			}
			pos += step;

			const portIn = delegate.getPortIn();
			if (portIn) {
				portGroups.push(new PortGroupComponent(`Delegate${delegate.getName()}In`, portIn, "right", pos, width));
			}
			pos += step;
		}

		return portGroups;
	}

}

export class BlueprintBoxComponent extends BlackBoxComponent {

	constructor(paperView: PaperView, blueprint: BlueprintModel) {
		super(paperView, blueprint);

		this.getRectangle().attr({
			body: {
				cursor: "pointer",
			},
			label: {
				cursor: "pointer",
			}
		});
		this.rectangle.attr("draggable", false);
	}

}

export class OperatorBoxComponent extends BlackBoxComponent {
	private readonly deleteButton: AttachedComponent;

	constructor(paperView: PaperView, operator: OperatorModel) {
		super(paperView, operator);
		this.deleteButton = this.createComponent({x: 0, y: 0, align: "l"});
		if (operator.position) {
			this.getRectangle().position(operator.position.x, operator.position.y);
		}
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
			const bbRect = new BlueprintBoxComponent(paperView, blueprint).getRectangle();
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
