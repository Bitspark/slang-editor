import {PortModel} from "../model/port";
import {SlangType, TypeIdentifier} from "./type";
import {containsMisplacedStreamTypeTo, StreamType} from "./stream";
import {PortOwner} from "./nodes";
import {OperatorDelegateModel} from "../model/delegate";
import {OperatorModel} from "../model/operator";

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

function fluentStreamCompatibleTo(fluentStream: StreamType, stream: StreamType): boolean {
	if (stream.hasPlaceholderRoot()) {
		// Both streams are fluent
		return !containsMisplacedStreamTypeTo(fluentStream, stream) && !containsMisplacedStreamTypeTo(stream, fluentStream);
	} else {
		// Non-fluent stream must have at least the depth of the fluent stream
		return stream.getStreamDepth() >= fluentStream.getStreamDepth();
	}
}

function collectDelegateStreams(stream: StreamType): Set<StreamType> {	
	const streams = new Set<StreamType>();
	
	const rootStream = stream.getRootStream();
	if (!rootStream) {
		return streams;
	}
	
	const rootSource = rootStream.getSource();
	if (!rootSource) {
		return streams;
	}
	
	const rootOwner = rootSource.getOwner();
	
	if (rootOwner instanceof OperatorDelegateModel) {
		const rootBlackBox = rootOwner.getAncestorNode(OperatorModel);
		if (rootBlackBox) {
			const rootStream = rootBlackBox.getStreamPortOwner().getBaseStreamType();
			if (rootStream) {
				streams.add(rootStream);
				for (const ancestorStream of collectDelegateStreams(rootStream)) {
					streams.add(ancestorStream);
				}
			}
		}
	}
	
	return streams;
}

function delegateStreamCompatibleTo(rootStream: StreamType | null, stream: StreamType | null): boolean {
	if (!rootStream || !stream) {
		return true;
	}
	
	const rootStreams = collectDelegateStreams(rootStream);
	
	let baseStream: StreamType | null = stream;
	while (baseStream) {
		if (rootStreams.has(baseStream)) {
			return false;
		}
		baseStream = baseStream.getBaseStreamOrNull();
	}
	
	return true;
}

function delegateStreamCompatible(streamA: StreamType, streamB: StreamType): boolean {
	return delegateStreamCompatibleTo(streamA, streamB) && delegateStreamCompatibleTo(streamB, streamA);
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

function genericCompatible(streamTypeA: PortModel, streamTypeB: PortModel): boolean {
	if (streamTypeA.isGeneric()) {
		return genericCompatibleTo(streamTypeB.getStreamPort().getStreamType(), streamTypeA.getStreamPort().getStreamType());
	} else {
		return genericCompatibleTo(streamTypeA.getStreamPort().getStreamType(), streamTypeB.getStreamPort().getStreamType());
	}
}

function genericCompatibleTo(streamType: StreamType, genericStreamType: StreamType): boolean {
	return genericStreamType.getStreamStep(streamType)[1] !== -1;
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
	
	if (source.isGeneric() && destination.isGeneric()) {
		return false;
	}

	if (!cycleCompatibleTo(source, destination)) {
		return false;
	}

	const sourceStream = source.getStreamPort().getStreamType();
	const destinationStream = destination.getStreamPort().getStreamType();
	
	if (!delegateStreamCompatible(sourceStream, destinationStream)) {
		return false;
	}
	
	if (!source.isGeneric() && !destination.isGeneric()) {
		if (!typesCompatibleTo(source.getType(), destination.getType())) {
			return false;
		}

		if (!streamsCompatible(sourceStream, destinationStream)) {
			return false;
		}
	} else {
		if (!genericCompatible(source, destination)) {
			return false;
		}
	}
	
	return true;
}