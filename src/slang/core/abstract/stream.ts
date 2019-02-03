import {Subscription} from "rxjs";

import {SlangType} from "../../definitions/type";

import {PortModel} from "./port";

export interface IStreamType {

	fixedDepth(start: number, current: number): number;

	getStreamDepth(): number;

	hasPlaceholderAncestor(): boolean;

	containsMisplacedStreamTypeTo(searchStream: IStreamType): boolean;

	hasPlaceholderRoot(): boolean;

	getRootStream(): IStreamType;

	getSource(): PortModel | null;

	isPlaceholder(): boolean;

	getBaseStreamOrNull(): IStreamType | null;

	compatibleTo(other: IStreamType): boolean;

	subscribeNestingChanged(cb: () => void): Subscription;

}

export interface IStreamPort {

	initialize(): void;

	getStreamType(): IStreamType;

	createGenericType(other: PortModel): { type: SlangType, portId: string[] };

	subscribeRefreshStreamType(cb: (streamType: IStreamType | null) => void): Subscription;

	subscribeStreamTypeChanged(cb: (streamType: IStreamType | null) => void): Subscription;

}

export interface IStreamPortOwner {

	initialize(): void;

	getBaseStreamType(): IStreamType | null;

	isStreamSource(): boolean;

}
