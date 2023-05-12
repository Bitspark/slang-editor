import {SlangType, TypeIdentifier} from "../../definitions/type";
import {GenericPortModel, PortDirection, PortGenerics, PortModel, PortModelArgs} from "../abstract/port";

import {BlueprintFakeGeneric, BlueprintModel} from "./blueprint";
import {BlueprintDelegateModel, OperatorDelegateModel} from "./delegate";
import {OperatorModel} from "./operator";

const CONVERT_UUID = "d1191456-3583-4eaf-8ec1-e486c3818c60";
const VALUE_UUID = "8b62495a-e482-4a3e-8020-0ab8a350ad2d";

export class BlueprintPortModel extends GenericPortModel<BlueprintModel | BlueprintDelegateModel> {
	public constructor(parent: BlueprintModel | BlueprintDelegateModel | BlueprintPortModel, args: PortModelArgs) {
		let generics: PortGenerics | null = null;
		if (parent instanceof BlueprintModel || parent instanceof BlueprintDelegateModel) {
			const specifications = parent.getGenerics();
			const identifier = args.direction === PortDirection.In ? BlueprintFakeGeneric.In : BlueprintFakeGeneric.Out;
			specifications.specify(identifier, args.type);
			generics = {specifications, identifier, fake: true};
		}

		super(parent, args, BlueprintPortModel, generics);
	}

	public isSource(): boolean {
		return this.isDirectionIn();
	}

}

export class OperatorPortModel extends GenericPortModel<OperatorModel | OperatorDelegateModel> {
	public constructor(parent: OperatorModel | OperatorDelegateModel | OperatorPortModel, args: PortModelArgs) {
		let generics: PortGenerics | null = null;
		if (args.type.isGeneric() && !(parent instanceof OperatorPortModel && parent.isGenericLikeDescent())) {
			const owner = parent.getAncestorNode<OperatorModel | OperatorDelegateModel>([OperatorModel, OperatorDelegateModel]);
			if (!owner) {
				throw new Error(`operator port without adequate parent`);
			}
			generics = {
				specifications: owner.getGenerics(),
				identifier: args.type.getGenericIdentifier(),
				fake: false,
			};
			args.type = new SlangType(args.type.getParent(), TypeIdentifier.Unspecified);
		}

		super(parent, args, OperatorPortModel, generics);
	}

	public isSource(): boolean {
		return this.isDirectionOut();
	}

	public specifyGenericPort(generics: PortGenerics, other: PortModel): PortModel {
		const specifications = generics.specifications;
		const identifier = generics.identifier;

		// TODO see #192
		const owner = this.getAncestorNode(OperatorModel);
		if (owner) {
			const bpId = owner.getBlueprint().uuid
			if (bpId === CONVERT_UUID || bpId === VALUE_UUID) {
				if (this.typeIdentifier === TypeIdentifier.Unspecified) {
					specifications.specify(identifier, other.getType());
				}
				return this;
			}
		}

		return super.specifyGenericPort(generics, other);
	}

	public getMaxStreamDepth(): number {
		const owner = this.getAncestorNode(OperatorModel);

		if (owner) {
			const bpId = owner.getBlueprint().uuid

			if (bpId === CONVERT_UUID || bpId === VALUE_UUID) {
				return 0
			}
		}

		return Number.MAX_VALUE;
	}

}
