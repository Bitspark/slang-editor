import {DelegateModel} from "./delegate";
import {SlangNode} from "./nodes";
import {GenericPortModel, PortDirection, PortModel, PortModelArgs} from "./port";
import {IStreamPortOwner} from "./stream";
import {GenericSpecifications} from "./utils/generics";
import {PropertyAssignments, PropertyEvaluator} from "./utils/properties";

export abstract class PortOwner extends SlangNode {

	private readonly streamPortOwner: IStreamPortOwner;

	protected constructor(parent: SlangNode, streamSource: boolean, streamPortCtor: new(portOwner: PortOwner, isSource: boolean) => IStreamPortOwner) {
		super(parent);
		this.streamPortOwner = new streamPortCtor(this, streamSource);
		this.streamPortOwner.initialize();
	}

	public getPortIn(): PortModel | null {
		return this.scanChildNode(GenericPortModel, (p) => p.isDirectionIn()) || null;
	}

	public getPortOut(): PortModel | null {
		return this.scanChildNode(GenericPortModel, (p) => p.isDirectionOut()) || null;
	}

	public getPorts(): IterableIterator<PortModel> {
		return this.getChildNodes(GenericPortModel);
	}

	public getStreamPortOwner(): IStreamPortOwner {
		return this.streamPortOwner;
	}

	public reconstructPorts(properties: PropertyAssignments, ports: Iterable<PortModel>, portCtor: new(p: GenericPortModel<this> | this, args: PortModelArgs) => PortModel) {
		const obsoletePorts = new Set(this.getPorts());
		for (const port of ports) {
			const poPort = (port.getDirection() === PortDirection.In ? this.getPortIn() : this.getPortOut());
			if (!poPort) {
				this.createPort({
					name: "",
					type: PropertyEvaluator.expandType(port.getType(), properties),
					direction: port.getDirection(),
				});
			} else {
				poPort.reconstruct(PropertyEvaluator.expandType(port.getType(), properties), portCtor as (new(p: GenericPortModel<PortOwner> | PortOwner, args: PortModelArgs) => PortModel), port.getDirection());
				// TODO: Investigate why explicit cast to (new(p: GenericPortModel<PortOwner> | PortOwner, args: PortModelArgs) => PortModel) is necessary
				obsoletePorts.delete(poPort);
			}
		}
		obsoletePorts.forEach((obsoletePort) => obsoletePort.destroy());
	}

	protected abstract createPort(args: PortModelArgs): PortModel;

}

export abstract class BlackBox extends PortOwner {

	public abstract getDisplayName(): string;

	public abstract findDelegate(name: string): DelegateModel | undefined;

	public abstract getDelegates(): IterableIterator<DelegateModel>;

	public abstract getGenerics(): GenericSpecifications;

}
