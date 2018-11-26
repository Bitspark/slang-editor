import {PortModel} from "../model/port";
import {SlangType, TypeIdentifier} from "./type";
import {StreamType} from "./stream";
import {PortOwner} from "./nodes";

function typesCompatibleTo(sourceType: SlangType, destinationType: SlangType): boolean {
	if (destinationType.getTypeIdentifier() === TypeIdentifier.Trigger) {
		return true;
	}
	if (destinationType.getTypeIdentifier() === TypeIdentifier.Primitive && sourceType.isPrimitive()) {
		return true;
	}
	if (sourceType.getTypeIdentifier() === TypeIdentifier.Primitive && destinationType.isPrimitive()) {
		return true;
	}
	if (sourceType.getTypeIdentifier() === TypeIdentifier.Map) {
		// TODO: Implement once we have collapsible ports
		return false;
	}
	if (sourceType.getTypeIdentifier() === TypeIdentifier.Stream) {
		// TODO: Implement once we have collapsible ports
		return false;
	}
	return sourceType.getTypeIdentifier() === destinationType.getTypeIdentifier();
}

function fluentStreamCompatibleTo(fluentStream: StreamType, stream: StreamType): boolean {
	if (stream.getRootStream().isPlaceholder()) {
		return true;
	} else {
		// Non-fluent stream must have at least the depth of the fluent stream
		return stream.getStreamDepth() >= fluentStream.getStreamDepth();
	}
}

function streamsCompatibleTo(streamA: StreamType | null, streamB: StreamType | null): boolean {
	if (!streamA || !streamB) {
		return false;
	}
	
	if (streamA === streamB) {
		// Identical stream types
		return true;
	}
	
	if (!streamA.isPlaceholder() && !streamB.isPlaceholder()) {
		// Incompatible stream types
		return false;
	}

	if (streamA.getRootStream().isPlaceholder()) {
		return fluentStreamCompatibleTo(streamA, streamB);
	}
	
	if (streamB.getRootStream().isPlaceholder()) {
		return fluentStreamCompatibleTo(streamB, streamA);
	}
	
	return streamsCompatibleTo(streamA.getBaseStream(), streamB.getBaseStream());
}

function collectAncestorOwners(port: PortModel, owners: Set<PortOwner>) {
	const owner = port.getOwner();
	if (owners.has(owner)) {
		return;
	}
	
	owners.add(owner);
	
	const portIn = owner.getPortIn();
	if (portIn) {
		const descendantPorts = portIn.getDescendantPorts();
		for (const descendantPort of descendantPorts) {
			for (const connectedPort of descendantPort.getConnectedWith()) {
				collectAncestorOwners(connectedPort, owners);
			}
		}
	}
}

function cycleCompatibleTo(source: PortModel, destination: PortModel): boolean {
	if (source.getOwner().getStreamPortOwner().isStreamSource()) {
		return true;
	}
	if (destination.getOwner().getStreamPortOwner().isStreamSource()) {
		return true;
	}
	
	const ancestorOwners = new Set<PortOwner>();
	collectAncestorOwners(source, ancestorOwners);
	return !ancestorOwners.has(destination.getOwner());
}

export function canConnectTo(source: PortModel, destination: PortModel): boolean {
	if (!source.isSource() || !destination.isDestination()) {
		return false;
	}
	
	const sourceConnectedWith = Array.from(source.getConnectedWith());
	const destinationConnectedWith = Array.from(destination.getConnectedWith());
	
	if (destinationConnectedWith.length !== 0) {
		return false;
	}
	if (destinationConnectedWith.indexOf(destination) !== -1) {
		return false;
	}
	if (sourceConnectedWith.indexOf(source) !== -1) {
		throw new Error(`${source.getIdentity()}: asymmetric connection found`);
	}
	
	if (!typesCompatibleTo(source.getType(), destination.getType())) {
		return false;
	}
	
	const sourceStream = source.getStreamPort().getStreamType();
	const destinationStream = destination.getStreamPort().getStreamType();
	
	if (!streamsCompatibleTo(sourceStream, destinationStream)) {
		return false;
	}
	
	if (!cycleCompatibleTo(source, destination)) {
		return false;
	}
	
	return true;
}