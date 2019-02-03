// tslint:disable:no-circular-imports

import {DelegateModel} from "./delegate";
import {PortOwner} from "./port-owner";
import {GenericSpecifications} from "./utils/generics";

export abstract class BlackBox extends PortOwner {

	public abstract getDisplayName(): string;

	public abstract findDelegate(name: string): DelegateModel | undefined;

	public abstract getDelegates(): IterableIterator<DelegateModel>;

	public abstract getGenerics(): GenericSpecifications;

	public isDelegate(): boolean {
		return false;
	}

}
