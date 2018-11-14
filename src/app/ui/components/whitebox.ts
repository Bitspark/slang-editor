import {AnchorComponent} from "./anchor";
import {Styles} from "../../../styles/studio";
import {BlackBox} from "../../custom/nodes";
import {dia, shapes} from "jointjs";

export namespace WhiteBox {
	import RectangleSelectors = shapes.standard.RectangleSelectors;

	export class Component extends AnchorComponent {
		protected shape: Shape;
	}

	interface Size {
		width: number,
		height: number
	}

	interface BasicAttrs {
		id?: string
		cssClass?: string
		size: Size
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
}
