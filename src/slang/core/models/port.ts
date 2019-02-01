/* tslint:disable:no-circular-imports */

import {canConnectTo} from "../utils/connection-check";
import {BlackBox} from "./abstract/blackbox";
import {GenericPortModel, PortModel, PortModelArgs} from "./abstract/port";
import {GenericSpecifications} from "./abstract/utils/generics";
import {BlueprintModel} from "./blueprint";
import {BlueprintDelegateModel, OperatorDelegateModel} from "./delegate";
import {OperatorModel} from "./operator";

export class BlueprintPortModel extends GenericPortModel<BlueprintModel | BlueprintDelegateModel> {
	public constructor(parent: BlueprintModel | BlueprintDelegateModel | BlueprintPortModel, args: PortModelArgs) {
		super(parent, args, BlueprintPortModel);
	}

	public isSource(): boolean {
		return this.isDirectionIn();
	}

	public fetchGenerics(): GenericSpecifications | null {
		return null;
	}

	public canConnectTo(other: PortModel): boolean {
		return canConnectTo(this, other);
	}
}

export class OperatorPortModel extends GenericPortModel<OperatorModel | OperatorDelegateModel> {
	public constructor(parent: OperatorModel | OperatorDelegateModel | OperatorPortModel, args: PortModelArgs) {
		super(parent, args, OperatorPortModel);
	}

	public isSource(): boolean {
		return this.isDirectionOut();
	}

	public fetchGenerics(): GenericSpecifications | null {
		const blackBox = this.getAncestorNode(BlackBox);
		if (!blackBox) {
			throw new Error(`port without blackbox detected`);
		}
		if (!(blackBox instanceof OperatorModel)) {
			throw new Error(`wrong blackbox class`);
		}
		return blackBox.getGenericSpecifications();
	}

	public canConnectTo(other: PortModel): boolean {
		return canConnectTo(this, other);
	}
}
