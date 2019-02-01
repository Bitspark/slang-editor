import {shapes} from "jointjs";
import {BlueprintModel} from "../../core/models/blueprint";
import {OperatorModel} from "../../core/models/operator";
import {PortGroupComponent} from "../components/port-group";

export interface IBlackBoxShapeAttrs {
	id?: string;
	label?: string;
	portGroups?: PortGroupComponent[];
	cssClass?: string;
	position?: { x: number, y: number };
}

export interface IBlackBoxShape extends shapes.standard.Rectangle {
	setupForBlueprint(blueprint: BlueprintModel): void;

	setupForOperator(operator: OperatorModel): void;
}

export type CtorBlackBoxShape = new(attrs: IBlackBoxShapeAttrs) => IBlackBoxShape;
