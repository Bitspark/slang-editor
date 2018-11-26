import {PortModel} from "../model/port";
import {SlangType, TypeIdentifier} from "./type";
import {StreamType} from "./stream";
import {PortOwner} from "./nodes";

function typesStreamCompatible(streamTypeA: SlangType, streamTypeB: SlangType): boolean {
	const subA = streamTypeA.getStreamSub();
	const subB = streamTypeB.getStreamSub();
	return typesCompatibleTo(subA, subB);
}

function typesMapCompatibleTo(mapTypeA: SlangType, mapTypeB: SlangType): boolean {
	for (const subA of mapTypeA.getMapSubs()) {
		const subB = Array.from(mapTypeB.getMapSubs()).find(subB => subB[0] === subA[0]);
		if (!subB || !typesCompatibleTo(subA[1], subB[1])) {
			return false;
		}
	}
	return true;
}

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
	if (sourceType.getTypeIdentifier() === TypeIdentifier.Map && 
		destinationType.getTypeIdentifier() === TypeIdentifier.Map) {
		return typesMapCompatibleTo(sourceType, destinationType);
	}
	if (sourceType.getTypeIdentifier() === TypeIdentifier.Stream && 
		destinationType.getTypeIdentifier() === TypeIdentifier.Stream) {
		return typesStreamCompatible(sourceType, destinationType);
	}
	return sourceType.getTypeIdentifier() === destinationType.getTypeIdentifier();
}

function hasCommonStreamTypeTo(searchStream: StreamType, stream: StreamType): boolean {
	let baseStream: StreamType | null = searchStream;
	while (baseStream !== null) {
		const streamIndex = stream.findStreamType(baseStream);
		if (streamIndex !== -1) {
			return true;
		}
		baseStream = baseStream.getBaseStreamOrNull();
	}
	return false;
}

function fluentStreamCompatibleTo(fluentStream: StreamType, stream: StreamType): boolean {
	if (stream.hasPlaceholderRoot()) {
		// Both streams are fluent
		return !hasCommonStreamTypeTo(fluentStream, stream) && !hasCommonStreamTypeTo(stream, fluentStream);
	} else {
		// Non-fluent stream must have at least the depth of the fluent stream
		return stream.getStreamDepth() >= fluentStream.getStreamDepth();
	}
}

function streamsCompatible(streamA: StreamType | null, streamB: StreamType | null): boolean {
	if (!streamA || !streamB) {
		return !streamA && !streamB;
	}
	
	if (streamA === streamB) {
		// Identical stream types
		return true;
	}
	
	if (!streamA.isPlaceholder() && !streamB.isPlaceholder()) {
		// Incompatible stream types
		return false;
	}

	if (streamA.hasPlaceholderRoot()) {
		return fluentStreamCompatibleTo(streamA, streamB);
	}
	
	if (streamB.hasPlaceholderRoot()) {
		return fluentStreamCompatibleTo(streamB, streamA);
	}
	
	return streamsCompatible(streamA.getBaseStreamOrNull(), streamB.getBaseStreamOrNull());
}

function collectAncestorOwners(port: PortModel, owners: Set<PortOwner>) {
	const owner = port.getOwner();
	if (owners.has(owner)) {
		return;
	}

	if (port.getOwner().getStreamPortOwner().isStreamSource()) {
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
	
	if (!streamsCompatible(sourceStream, destinationStream)) {
		return false;
	}
	
	if (!cycleCompatibleTo(source, destination)) {
		return false;
	}
	
	return true;
}