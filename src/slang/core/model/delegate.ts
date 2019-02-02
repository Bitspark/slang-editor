import {GenericDelegateModel} from "./abstract/delegate";
import {PortModelArgs} from "./abstract/port";
import {GenericSpecifications} from "./abstract/utils/generics";
import {BlueprintModel, FAKE_GENERIC_VALUES} from "./blueprint";
import {OperatorModel} from "./operator";
import {BlueprintPortModel, OperatorPortModel} from "./port";

export interface BlueprintDelegateModelArgs { name: string; }

export class BlueprintDelegateModel extends GenericDelegateModel<BlueprintModel> {
	private readonly fakeGenerics = new GenericSpecifications(FAKE_GENERIC_VALUES);
	constructor(owner: BlueprintModel, {name}: BlueprintDelegateModelArgs) {
		super(owner, name, false);
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
}

export interface OperatorDelegateModelArgs { name: string; }

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
