import {DelegateModel} from "./delegate";
import {PortOwner} from "./port-owner";
import {SlangSubjectTrigger} from "./utils/events";
import {GenericSpecifications} from "./utils/generics";

export abstract class BlackBox extends PortOwner {
	// Topics::Interaction
	public clicked = new SlangSubjectTrigger("clicked");
	public dblclicked = new SlangSubjectTrigger("dblclicked");

	public abstract getDisplayName(): string;

	public abstract findDelegate(name: string): DelegateModel | undefined;

	public abstract getDelegates(): IterableIterator<DelegateModel>;

	public abstract getGenerics(): GenericSpecifications;

	public isDelegate(): boolean {
		return false;
	}

}
