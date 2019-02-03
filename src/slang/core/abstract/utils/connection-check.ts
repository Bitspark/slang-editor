import {SlangType, TypeIdentifier} from "../../../definitions/type";

import {GenericDelegateModel} from "../delegate";
import {PortModel} from "../port";
import {BlackBox, PortOwner} from "../port-owner";
import {IStreamType} from "../stream";

function typesStreamCompatible(streamTypeA: SlangType, streamTypeB: SlangType): boolean {
	const subA = streamTypeA.getStreamSub();
	const subB = streamTypeB.getStreamSub();
	return typesCompatibleTo(subA, subB);
}

function typesMapCompatibleTo(mapTypeA: SlangType, mapTypeB: SlangType): boolean {
	for (const subA of mapTypeA.getMapSubs()) {
		const subB = Array.from(mapTypeB.getMapSubs()).find((sub) => sub[0] === subA[0]);
		if (!subB || !typesCompatibleTo(subA[1], subB[1])) {
			return false;
		}
	}
	return true;
}

function typesCompatibleTo(sourceType: SlangType, destinationType: SlangType): boolean {
	// Triggers can always be destinations, even for specifications, maps and streams
	if (destinationType.getTypeIdentifier() === TypeIdentifier.Trigger) {
		return true;
	}

	// Careful: destinationType.getTypeIdentifier() === TypeIdentifier.Primitive is not identical with destinationType.isPrimitive()
	// isPrimitive() is true for Strings, Numbers, etc.
	if (destinationType.getTypeIdentifier() === TypeIdentifier.Primitive && sourceType.isPrimitive()) {
		return true;
	}
	if (destinationType.isPrimitive() && sourceType.getTypeIdentifier() === TypeIdentifier.Primitive) {
		return true;
	}

	if (sourceType.isMap() && destinationType.isMap()) {
		return typesMapCompatibleTo(sourceType, destinationType);
	}

	if (sourceType.isStream() && destinationType.isStream()) {
		return typesStreamCompatible(sourceType, destinationType);
	}

	if (sourceType.isGeneric() && destinationType.isGeneric()) {
		return sourceType.getGenericIdentifier() === destinationType.getGenericIdentifier();
	}

	return sourceType.getTypeIdentifier() === destinationType.getTypeIdentifier();
}

function fluentStreamCompatibleTo(fluentStream: IStreamType, stream: IStreamType): boolean {
	if (stream.hasPlaceholderRoot()) {
		// Both streams are fluent
		return !stream.containsMisplacedStreamTypeTo(fluentStream) && !fluentStream.containsMisplacedStreamTypeTo(stream);
	}
	// Non-fluent stream must have at least the depth of the fluent stream
	return stream.getStreamDepth() >= fluentStream.getStreamDepth();
}

function collectDelegateStreams(stream: IStreamType): Set<IStreamType> {
	const streams = new Set<IStreamType>();

	const rootStream = stream.getRootStream();
	if (!rootStream) {
		return streams;
	}

	const rootSource = rootStream.getSource();
	if (!rootSource) {
		return streams;
	}

	const rootOwner = rootSource.getOwner();

	if (!(rootOwner instanceof GenericDelegateModel)) {
		return streams;
	}

	const rootOperator = rootOwner.getAncestorNode(BlackBox);
	if (!rootOperator) {
		return streams;
	}

	const rootOperatorStream = rootOperator.getStreamPortOwner().getBaseStreamType();
	if (!rootOperatorStream) {
		return streams;
	}

	streams.add(rootOperatorStream);
	for (const ancestorStream of collectDelegateStreams(rootOperatorStream)) {
		streams.add(ancestorStream);
	}

	return streams;
}

function delegateStreamCompatibleTo(rootStream: IStreamType | null, stream: IStreamType | null): boolean {
	if (!rootStream || !stream) {
		return true;
	}

	const rootStreams = collectDelegateStreams(rootStream);

	let baseStream: IStreamType | null = stream;
	while (baseStream) {
		if (rootStreams.has(baseStream)) {
			return false;
		}
		baseStream = baseStream.getBaseStreamOrNull();
	}

	return true;
}

function delegateStreamCompatible(streamA: IStreamType, streamB: IStreamType): boolean {
	return delegateStreamCompatibleTo(streamA, streamB) && delegateStreamCompatibleTo(streamB, streamA);
}

function streamsCompatible(streamA: IStreamType | null, streamB: IStreamType | null): boolean {
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

function streamsGenericLikeCompatible(portA: PortModel, portB: PortModel): boolean {
	if (portA.isGenericLike()) {
		return streamsGenericLikeCompatibleTo(portB.getStreamPort().getStreamType(), portA.getStreamPort().getStreamType());
	}
	return streamsGenericLikeCompatibleTo(portA.getStreamPort().getStreamType(), portB.getStreamPort().getStreamType());

}

function streamsGenericLikeCompatibleTo(streamType: IStreamType, genericStreamType: IStreamType): boolean {
	return genericStreamType.compatibleTo(streamType);
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

	if (!cycleCompatibleTo(source, destination)) {
		return false;
	}

	const sourceStream = source.getStreamPort().getStreamType();
	const destinationStream = destination.getStreamPort().getStreamType();

	if (!delegateStreamCompatible(sourceStream, destinationStream)) {
		return false;
	}

	if ((!source.isGenericLike() || source.getType().isElementaryPort()) &&
		(!destination.isGenericLike() || destination.getType().isElementaryPort())) {
		if (!typesCompatibleTo(source.getType(), destination.getType())) {
			return false;
		}

		if (!streamsCompatible(sourceStream, destinationStream)) {
			return false;
		}
	} else {
		if (!streamsGenericLikeCompatible(source, destination)) {
			return false;
		}
	}

	return true;
}
