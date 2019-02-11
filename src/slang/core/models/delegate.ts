import {GenericDelegateModel} from "../abstract/delegate";
import {PortModelArgs} from "../abstract/port";
import {GenericSpecifications} from "../abstract/utils/generics";

import {BlueprintModel, FAKE_GENERIC_VALUES, HasMoveablePortGroups, PortGroupGeometry} from "./blueprint";
import {OperatorModel} from "./operator";
import {BlueprintPortModel, OperatorPortModel} from "./port";

export interface BlueprintDelegateModelArgs {
	name: string;
	geometry?: PortGroupGeometry;
}

export class BlueprintDelegateModel extends GenericDelegateModel<BlueprintModel> implements HasMoveablePortGroups {
	private readonly fakeGenerics = new GenericSpecifications(FAKE_GENERIC_VALUES);
	private readonly geometry: PortGroupGeometry;

	public get inPosition(): number {
		return this.geometry.in.position;
	}

	public set inPosition(pos: number) {
		this.geometry.in.position = pos;
	}

	public get outPosition(): number {
		return this.geometry.out.position;
	}

	public set outPosition(pos: number) {
		this.geometry.out.position = pos;
	}

	constructor(owner: BlueprintModel, {name, geometry}: BlueprintDelegateModelArgs) {
		super(owner, name, false);

		this.geometry = !geometry ? {
			in: {
				position: 0,
			},
			out: {
				position: 0,
			},
		} : geometry;

	}

	public createPort(args: PortModelArgs): BlueprintPortModel {
		return this.createChildNode(BlueprintPortModel, args);
	}

	public getPortIn(): BlueprintPortModel | null {
		return super.getPortIn() as BlueprintPortModel;
	}

	public getPortOut(): BlueprintPortModel | null {
		return super.getPortOut() as BlueprintPortModel;
	}

	public getGenerics(): GenericSpecifications {
		return this.fakeGenerics;
	}

	public getGeometry(): PortGroupGeometry {
		return this.geometry;
	}
}

export interface OperatorDelegateModelArgs {
	name: string;
}

export class OperatorDelegateModel extends GenericDelegateModel<OperatorModel> {
	constructor(owner: OperatorModel, {name}: OperatorDelegateModelArgs) {
		super(owner, name, true);
	}

	public createPort(args: PortModelArgs): OperatorPortModel {
		return this.createChildNode(OperatorPortModel, args);
	}

	public getGenerics(): GenericSpecifications {
		return (this.getParentNode() as OperatorModel).getGenerics();
	}
}
